import { useRef, useState } from "react";
import { ArrowUp, Loader2, Paperclip, X, FileText, MessageSquare, ListChecks, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CHAT_MODES, MAX_ATTACHMENTS, MAX_IMAGE_DATAURL, MAX_TEXT_CHARS, type ChatAttachment, type ChatMode } from "@/lib/chat-modes";

const MODE_ICON = { chat: MessageSquare, plan: ListChecks, build: Sparkles } as const;
const TEXT_EXT = /\.(txt|md|csv|json|html?|css|scss|js|jsx|ts|tsx|mjs|py|sql|xml|ya?ml|svg|env\.example|toml)$/i;

function readFile(f: File): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); f.type.startsWith("image/") ? r.readAsDataURL(f) : r.readAsText(f); });
}

/** Shrinks big photos so they fit the message limit while staying sharp. */
async function compressImage(dataUrl: string): Promise<string> {
  if (dataUrl.length <= MAX_IMAGE_DATAURL && !dataUrl.startsWith("data:image/png")) return dataUrl;
  const img = new Image(); img.src = dataUrl; await img.decode();
  for (const max of [1600, 1200, 900, 600]) {
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const out = c.toDataURL("image/jpeg", 0.82);
    if (out.length <= MAX_IMAGE_DATAURL) return out;
  }
  throw new Error("Imagem grande demais");
}

export function ChatComposer({ busy, remoteBusy, mode, onModeChange, onSend }: {
  busy: boolean; remoteBusy: boolean; mode: ChatMode; onModeChange: (m: ChatMode) => void;
  onSend: (text: string, attachments: ChatAttachment[]) => boolean | void;
}) {
  const [text, setText] = useState("");
  const [atts, setAtts] = useState<ChatAttachment[]>([]);
  const [reading, setReading] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function addFiles(list: FileList | File[]) {
    const files = Array.from(list);
    if (!files.length) return;
    setReading(true);
    const next: ChatAttachment[] = [];
    for (const f of files) {
      if (atts.length + next.length >= MAX_ATTACHMENTS) { toast.info(`Máximo de ${MAX_ATTACHMENTS} anexos por mensagem.`); break; }
      const isImg = f.type.startsWith("image/") && f.type !== "image/svg+xml";
      const isText = !isImg && (f.type.startsWith("text/") || f.type === "application/json" || TEXT_EXT.test(f.name));
      if (!isImg && !isText) { toast.error(`${f.name}: envie imagens ou arquivos de texto/código.`); continue; }
      if (isText && f.size > MAX_TEXT_CHARS * 2) { toast.error(`${f.name} é grande demais (até ~200 KB).`); continue; }
      try {
        let content = await readFile(f);
        if (isImg) content = await compressImage(content);
        if (isText && !content.trim()) { toast.error(`${f.name} está vazio.`); continue; }
        next.push({ name: f.name.slice(0, 200), kind: isImg ? "image" : "text", mime: isImg ? content.slice(5, content.indexOf(";")) : (f.type || "text/plain"), size: isImg ? Math.round(content.length * 0.75) : f.size, content: isText ? content.slice(0, MAX_TEXT_CHARS) : content });
      } catch { toast.error(`Não foi possível ler ${f.name}.`); }
    }
    setAtts((a) => [...a, ...next]);
    setReading(false);
  }

  function submit() {
    const m = text.trim();
    if (!m || busy || reading) return;
    const accepted = onSend(m, atts);
    if (accepted !== false) { setText(""); setAtts([]); }
  }

  const current = CHAT_MODES.find((x) => x.id === mode)!;
  return (
    <form className="mx-auto max-w-3xl p-2 sm:p-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <div
        className={cn("rounded-2xl border bg-card shadow-sm transition-colors focus-within:border-primary/60", drag && "border-primary bg-primary/5")}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); void addFiles(e.dataTransfer.files); }}
      >
        {atts.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-3 pt-3">
            {atts.map((a, i) => (
              <div key={i} className="relative shrink-0">
                {a.kind === "image"
                  ? <img src={a.content} alt={a.name} className="h-14 w-14 rounded-lg border object-cover" />
                  : <div className="flex h-14 w-36 items-center gap-2 rounded-lg border bg-muted px-2 text-xs"><FileText className="h-4 w-4 shrink-0 text-primary" /><span className="truncate">{a.name}</span></div>}
                <button type="button" aria-label={`Remover ${a.name}`} onClick={() => setAtts((x) => x.filter((_, j) => j !== i))} className="absolute -right-1.5 -top-1.5 rounded-full border bg-background p-0.5 shadow"><X className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        )}
        <textarea
          value={text} onChange={(e) => setText(e.target.value)} rows={2} aria-label="Mensagem"
          placeholder={remoteBusy ? "A WLC.IA está concluindo a execução…" : mode === "build" ? "Descreva o que criar — começo na hora…" : mode === "plan" ? "Descreva o projeto para eu planejar…" : "Pergunte qualquer coisa…"}
          onPaste={(e) => { const fs = Array.from(e.clipboardData.files); if (fs.length) { e.preventDefault(); void addFiles(fs); } }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer:fine)").matches) { e.preventDefault(); submit(); } }}
          className="block max-h-48 min-h-[3.25rem] w-full resize-none bg-transparent px-4 pt-3 text-base outline-none placeholder:text-muted-foreground sm:text-sm"
        />
        <div className="flex items-center gap-1.5 px-2 pb-2">
          <input ref={fileRef} type="file" multiple hidden accept="image/*,.txt,.md,.csv,.json,.html,.css,.js,.jsx,.ts,.tsx,.py,.sql,.xml,.yml,.yaml,.svg" onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ""; }} />
          <button type="button" onClick={() => fileRef.current?.click()} aria-label="Anexar arquivos ou imagens" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
            {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          </button>
          <div role="radiogroup" aria-label="Modo" className="flex items-center rounded-full border bg-muted/50 p-0.5">
            {CHAT_MODES.map((m) => { const Icon = MODE_ICON[m.id]; const on = m.id === mode; return (
              <button key={m.id} type="button" role="radio" aria-checked={on} title={m.hint} onClick={() => onModeChange(m.id)}
                className={cn("inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-medium transition-colors", on ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                <Icon className={cn("h-3.5 w-3.5", on && "text-primary")} /><span className={cn(!on && "hidden sm:inline")}>{m.label}</span>
              </button>); })}
          </div>
          <span className="ml-1 hidden min-w-0 flex-1 truncate text-[11px] text-muted-foreground md:block">{current.hint}</span>
          <button type="submit" disabled={busy || reading || !text.trim()} aria-label="Enviar" className="ml-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </form>
  );
}
