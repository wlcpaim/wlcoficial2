/**
 * WLC.IA v3 — Ferramentas cirúrgicas: patch contextual e busca no codebase.
 * Funções puras, testáveis sem GitHub/rede.
 */

export type PatchHunk = {
  /** Trecho exato a localizar no arquivo (contexto âncora). */
  old_text: string;
  /** Substituição completa do trecho. */
  new_text: string;
};

export type PatchResult =
  | { ok: true; content: string; replacements: number }
  | { ok: false; error: string };

/** Aplica um ou mais hunks por correspondência exata de texto. Falha se âncora ambígua ou ausente. */
export function applyContextualPatch(original: string, hunks: PatchHunk[]): PatchResult {
  if (!hunks.length) return { ok: false, error: "Nenhum hunk informado." };
  let content = original;
  let replacements = 0;
  for (let i = 0; i < hunks.length; i++) {
    const h = hunks[i]!;
    if (!h.old_text) return { ok: false, error: `Hunk ${i + 1}: old_text vazio.` };
    if (h.old_text === h.new_text) continue;
    const count = content.split(h.old_text).length - 1;
    if (count === 0) {
      return {
        ok: false,
        error: `Hunk ${i + 1}: trecho não encontrado. Leia o arquivo novamente e use old_text idêntico ao conteúdo atual.`,
      };
    }
    if (count > 1) {
      return {
        ok: false,
        error: `Hunk ${i + 1}: trecho ambíguo (${count} ocorrências). Amplie o contexto em old_text até ficar único.`,
      };
    }
    content = content.replace(h.old_text, h.new_text);
    replacements += 1;
  }
  return { ok: true, content, replacements };
}

export type SearchHit = {
  path: string;
  line: number;
  text: string;
};

const DEFAULT_IGNORE = /(^|\/)(node_modules|\.git|dist|build|\.next|coverage|vendor|\.turbo|\.cache)\//;

/**
 * Busca regex (ou texto literal se regex inválida) em mapa path→conteúdo.
 * Limita hits por arquivo e no total para não estourar contexto.
 */
export function searchCodebase(
  files: Record<string, string>,
  pattern: string,
  opts?: { maxHits?: number; maxPerFile?: number; caseInsensitive?: boolean },
): { hits: SearchHit[]; truncated: boolean; pattern: string; fileCount: number } {
  const maxHits = opts?.maxHits ?? 40;
  const maxPerFile = opts?.maxPerFile ?? 8;
  const flags = opts?.caseInsensitive === false ? "g" : "gi";
  let re: RegExp;
  try {
    re = new RegExp(pattern, flags);
  } catch {
    re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
  }
  const hits: SearchHit[] = [];
  let truncated = false;
  let fileCount = 0;
  for (const [path, content] of Object.entries(files)) {
    if (DEFAULT_IGNORE.test(path)) continue;
    fileCount += 1;
    const lines = content.split(/\r?\n/);
    let perFile = 0;
    for (let i = 0; i < lines.length; i++) {
      if (hits.length >= maxHits) {
        truncated = true;
        break;
      }
      if (perFile >= maxPerFile) break;
      const line = lines[i] ?? "";
      re.lastIndex = 0;
      if (re.test(line)) {
        hits.push({ path, line: i + 1, text: line.slice(0, 240) });
        perFile += 1;
      }
    }
    if (truncated) break;
  }
  return { hits, truncated, pattern, fileCount };
}

/** Comandos de validação sugeridos por stack detectada (sem shell chaining). */
export function suggestedValidationCommands(stack: {
  hasPackageJson?: boolean;
  hasTsConfig?: boolean;
  hasPython?: boolean;
  packageManager?: "npm" | "bun" | "pnpm" | "yarn";
}): string[] {
  const cmds: string[] = [];
  const pm = stack.packageManager ?? "npm";
  if (stack.hasPackageJson) {
    if (pm === "bun") {
      cmds.push("bun install");
      if (stack.hasTsConfig) cmds.push("bunx tsc --noEmit");
      cmds.push("bun test");
    } else {
      cmds.push(`${pm} install`);
      if (stack.hasTsConfig) cmds.push("npx tsc --noEmit");
      cmds.push(`${pm} test`);
    }
  }
  if (stack.hasPython) {
    cmds.push("python -m pytest");
  }
  return cmds;
}

export const SELF_HEALING_PROTOCOL = `
## LOOP DE AUTO-CURA (obrigatório em MODO CRIAR / alterações de código)
1. Planeje internamente as mudanças mínimas.
2. Prefira patch_file a write_file quando o arquivo já existe (economiza tokens e evita apagar código).
3. Use search_codebase antes de editar símbolos, rotas ou APIs desconhecidas.
4. Após gravar, valide: se run_project_checks ou CI estiver disponível, execute; caso contrário declare o limite.
5. Se compilação/linter/teste falhar, leia o erro, corrija com patch_file e repita até 0 erros ou esgotar tentativas honestas.
6. Só encerre com resumo final quando as validações possíveis tiverem passado ou os bloqueios estiverem explícitos.
7. Nunca invente resultado de build/teste. Sem runner configurado, diga que a validação local ficou pendente.
`.trim();
