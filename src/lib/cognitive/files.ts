// Client-safe file intake for the Cognitive Chat: validation, ZIP safety and text extraction.
import JSZip from "jszip";

export const LIMITS = {
  maxUploadBytes: 25 * 1024 * 1024, // per uploaded file (zip included)
  maxZipEntries: 2000,
  maxTotalUncompressed: 60 * 1024 * 1024,
  maxFileBytes: 1024 * 1024, // per extracted text file
  maxCompressionRatio: 100, // zip-bomb guard per entry
  batchChars: 1_200_000, // chars per server batch
};

const TEXT_EXT = new Set([
  "txt","md","markdown","csv","tsv","json","jsonc","xml","html","htm","css","scss","sass","less","js","mjs","cjs","jsx","ts","tsx","py","java","c","h","cpp","cc","hpp","cs","go","rs","rb","php","swift","kt","kts","scala","sql","yaml","yml","toml","ini","cfg","conf","env.example","sh","bash","zsh","ps1","bat","vue","svelte","astro","graphql","gql","proto","r","m","lua","dart","ex","exs","erl","hs","clj","pl","tex","rst","log","gradle","properties","dockerfile","makefile","prisma","txt",
]);
const IGNORED_DIRS = /(^|\/)(node_modules|\.git|dist|build|\.next|\.turbo|coverage|vendor|__pycache__|\.venv|venv|target|bin|obj)\//;

export type ExtractedFile = { path: string; language: string | null; size: number; content: string | null; reason: string | null };

export function extOf(name: string): string {
  const base = name.split("/").pop()!.toLowerCase();
  if (base === "dockerfile" || base === "makefile") return base;
  const i = base.lastIndexOf(".");
  return i > 0 ? base.slice(i + 1) : "";
}

/** Rejects absolute paths, traversal and odd characters; returns a normalized relative path or null. */
export function safeEntryPath(raw: string): string | null {
  const p = raw.replace(/\\/g, "/");
  if (!p || p.startsWith("/") || /^[a-zA-Z]:/.test(p) || p.includes("\0")) return null;
  const parts = p.split("/").filter((s) => s && s !== ".");
  if (parts.some((s) => s === "..")) return null;
  const out = parts.join("/");
  return out.length > 0 && out.length <= 500 ? out : null;
}

export function looksBinary(s: string): boolean {
  const sample = s.slice(0, 4000);
  let bad = 0;
  for (let i = 0; i < sample.length; i++) { const c = sample.charCodeAt(i); if (c === 0 || c === 0xfffd) bad++; }
  return bad > sample.length * 0.02;
}

const stripXml = (xml: string) => xml.replace(/<w:p[ >]/g, "\n<w:p ").replace(/<\/a:p>/g, "\n").replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\n{3,}/g, "\n\n").trim();

async function officeText(buf: ArrayBuffer, ext: string): Promise<string | null> {
  const zip = await JSZip.loadAsync(buf);
  if (ext === "docx") { const f = zip.file("word/document.xml"); return f ? stripXml(await f.async("string")) : null; }
  if (ext === "pptx") {
    const slides = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort();
    const parts: string[] = []; for (const s of slides) parts.push(`# ${s}\n${stripXml(await zip.file(s)!.async("string"))}`);
    return parts.join("\n\n") || null;
  }
  if (ext === "xlsx") {
    const ss = zip.file("xl/sharedStrings.xml");
    const shared = ss ? [...(await ss.async("string")).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => stripXml(m[1] ?? "")) : [];
    const sheets = Object.keys(zip.files).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort();
    const out: string[] = [];
    for (const s of sheets) {
      const xml = await zip.file(s)!.async("string");
      const rows = [...xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((r) =>
        [...(r[1] ?? "").matchAll(/<c([^>]*)>(?:[\s\S]*?<v>([\s\S]*?)<\/v>)?[\s\S]*?<\/c>/g)].map((c) => {
          const v = c[2] ?? ""; return /t="s"/.test(c[1] ?? "") ? shared[Number(v)] ?? "" : v;
        }).join(","));
      out.push(`# ${s}\n${rows.join("\n")}`);
    }
    return out.join("\n\n") || null;
  }
  return null;
}

const UNSUPPORTED: Record<string, string> = {
  pdf: "PDF ainda não é interpretado neste ambiente (sem extrator de PDF no servidor). Converta para TXT/MD.",
  doc: "DOC (Word antigo) é binário e não pode ser lido aqui. Salve como DOCX.",
  xls: "XLS (Excel antigo) é binário e não pode ser lido aqui. Salve como XLSX ou CSV.",
  ppt: "PPT antigo é binário. Salve como PPTX.",
};

async function readOne(path: string, ext: string, getText: () => Promise<string>, getBuf: () => Promise<ArrayBuffer>, size: number): Promise<ExtractedFile> {
  const base: ExtractedFile = { path, language: ext || null, size, content: null, reason: null };
  if (UNSUPPORTED[ext]) return { ...base, reason: UNSUPPORTED[ext]! };
  if (ext === "docx" || ext === "xlsx" || ext === "pptx") {
    if (size > LIMITS.maxUploadBytes) return { ...base, reason: "Arquivo grande demais." };
    try { const t = await officeText(await getBuf(), ext); return t ? { ...base, content: t.slice(0, LIMITS.maxFileBytes) } : { ...base, reason: "Documento sem texto legível." }; }
    catch { return { ...base, reason: "Documento Office corrompido ou inválido." }; }
  }
  if (!TEXT_EXT.has(ext) && ext !== "") return { ...base, reason: `Formato .${ext} não é texto/código suportado.` };
  if (size > LIMITS.maxFileBytes) return { ...base, reason: `Maior que ${LIMITS.maxFileBytes / 1024} KB — ignorado para proteger o processamento.` };
  const text = await getText();
  if (looksBinary(text)) return { ...base, reason: "Conteúdo binário — não interpretável como texto." };
  return { ...base, content: text };
}

/** Reads one uploaded file. ZIPs are expanded with entry, size, ratio and path guards. */
export async function extractUpload(file: File): Promise<{ kind: string; files: ExtractedFile[]; warnings: string[] }> {
  const ext = extOf(file.name);
  if (file.size > LIMITS.maxUploadBytes) throw new Error(`${file.name}: limite de ${LIMITS.maxUploadBytes / 1024 / 1024} MB por arquivo.`);
  if (ext !== "zip") {
    return { kind: ext || "txt", warnings: [], files: [await readOne(file.name, ext, () => file.text(), () => file.arrayBuffer(), file.size)] };
  }
  let zip: JSZip;
  try { zip = await JSZip.loadAsync(await file.arrayBuffer()); } catch { throw new Error(`${file.name}: ZIP inválido ou corrompido.`); }
  const entries = Object.values(zip.files).filter((e) => !e.dir);
  const warnings: string[] = [];
  if (entries.length > LIMITS.maxZipEntries) throw new Error(`${file.name}: ${entries.length} arquivos excede o limite de ${LIMITS.maxZipEntries}.`);
  let total = 0;
  const files: ExtractedFile[] = [];
  for (const e of entries) {
    const path = safeEntryPath(e.name);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = (e as any)._data as { uncompressedSize?: number; compressedSize?: number } | undefined;
    const usize = meta?.uncompressedSize ?? 0; const csize = meta?.compressedSize ?? 0;
    if (!path) { files.push({ path: e.name.slice(0, 300), language: null, size: usize, content: null, reason: "Caminho inseguro (absoluto ou com '..') — bloqueado." }); continue; }
    if (IGNORED_DIRS.test(path + "/") || IGNORED_DIRS.test(path)) { files.push({ path, language: null, size: usize, content: null, reason: "Pasta de dependências/compilação — ignorada." }); continue; }
    if (csize > 0 && usize / csize > LIMITS.maxCompressionRatio && usize > 1024 * 1024) { files.push({ path, language: null, size: usize, content: null, reason: "Taxa de compressão suspeita (possível ZIP bomb) — bloqueado." }); continue; }
    if (usize > LIMITS.maxFileBytes * 4) { files.push({ path, language: extOf(path) || null, size: usize, content: null, reason: "Arquivo grande demais." }); continue; }
    total += usize;
    if (total > LIMITS.maxTotalUncompressed) { warnings.push("Limite total descompactado atingido; arquivos restantes não foram lidos."); files.push({ path, language: null, size: usize, content: null, reason: "Limite total do ZIP atingido." }); continue; }
    if (extOf(path) === "zip") { files.push({ path, language: "zip", size: usize, content: null, reason: "ZIP aninhado não é expandido (proteção)." }); continue; }
    files.push(await readOne(path, extOf(path), () => e.async("string"), () => e.async("arraybuffer"), usize));
  }
  return { kind: "zip", files, warnings };
}

/** Splits files into batches under a char budget so each server call stays small. */
export function batchFiles(files: ExtractedFile[], budget = LIMITS.batchChars): ExtractedFile[][] {
  const out: ExtractedFile[][] = []; let cur: ExtractedFile[] = []; let size = 0;
  for (const f of files) {
    const n = (f.content?.length ?? 0) + f.path.length + 200;
    if (cur.length && size + n > budget) { out.push(cur); cur = []; size = 0; }
    cur.push(f); size += n;
  }
  if (cur.length) out.push(cur);
  return out;
}

export function slugify(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "motor";
}
