import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/** Copies text exactly as given (line breaks and markdown preserved). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall back below (e.g. iframe without clipboard permission) */
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.top = "0";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try { ok = document.execCommand("copy"); } catch { ok = false; }
  document.body.removeChild(ta);
  return ok;
}

export function CopyButton({ text, className, label = "Copiar mensagem" }: { text: string; className?: string; label?: string }) {
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (t.current) clearTimeout(t.current); }, []);
  async function onClick() {
    const ok = await copyText(text);
    setState(ok ? "ok" : "fail");
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => setState("idle"), 1800);
  }
  return (
    <button type="button" onClick={onClick} aria-label={state === "ok" ? "Copiado" : label} title={state === "ok" ? "Copiado" : label}
      className={cn("inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-md px-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}>
      {state === "ok" ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      <span aria-live="polite" className={cn(state === "idle" && "sr-only")}>{state === "ok" ? "Copiado" : state === "fail" ? "Não foi possível copiar" : ""}</span>
    </button>
  );
}
