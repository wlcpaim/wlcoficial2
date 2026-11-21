import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toTxt, toMarkdown, toJson, safeName, type ChatExport } from "@/lib/chat-export";

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

async function load(chatId: string): Promise<ChatExport> {
  const [c, m, e] = await Promise.all([
    supabase.from("chats").select("id,title,repositories(full_name)").eq("id", chatId).maybeSingle(),
    supabase.from("chat_messages").select("role,content,created_at,metadata").eq("chat_id", chatId).order("created_at"),
    supabase.from("agent_events").select("id,event_type,status,title,detail,created_at").eq("chat_id", chatId).order("created_at").limit(5000),
  ]);
  if (m.error) throw m.error;
  const chat: any = c.data ?? { id: chatId, title: "chat" };
  return { chat: { id: chat.id, title: chat.title, repo: chat.repositories?.full_name ?? null }, messages: (m.data ?? []) as any, events: (e.data ?? []) as any };
}

export function ChatExportButton({ chatId, compact }: { chatId: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  async function go(kind: "txt" | "md" | "json" | "zip") {
    setBusy(kind);
    try {
      const d = await load(chatId); const base = safeName(d.chat.title);
      if (kind === "txt") save(new Blob([toTxt(d)], { type: "text/plain;charset=utf-8" }), `${base}.txt`);
      else if (kind === "md") save(new Blob([toMarkdown(d)], { type: "text/markdown;charset=utf-8" }), `${base}.md`);
      else if (kind === "json") save(new Blob([toJson(d)], { type: "application/json" }), `${base}.json`);
      else {
        const { default: JSZip } = await import("jszip"); const z = new JSZip();
        z.file("chat.txt", toTxt(d)); z.file("chat.md", toMarkdown(d)); z.file("chat.json", toJson(d));
        d.events.forEach((ev, i) => { if (typeof ev.detail?.content === "string") z.file(`codigo/${String(i + 1).padStart(4, "0")}-${safeName(String(ev.detail.path ?? "arquivo"))}`, ev.detail.content); });
        save(await z.generateAsync({ type: "blob" }), `${base}.zip`);
      }
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }
  return <>
    <Button size={compact ? "icon" : "sm"} variant="outline" className={compact ? "h-9 w-9 shrink-0" : "h-9 shrink-0"} aria-label="Baixar chat" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}><Download className="h-4 w-4" />{!compact && <span className="hidden sm:inline">Baixar</span>}</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-sm" onClick={(e) => e.stopPropagation()}>
        <DialogHeader><DialogTitle>Baixar chat completo</DialogTitle><DialogDescription>Todas as mensagens, operações, eventos e código gerado, sem resumo.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {([["txt", "TXT"], ["md", "Markdown"], ["json", "JSON"], ["zip", "ZIP (tudo)"]] as const).map(([k, l]) => <Button key={k} variant="outline" className="h-12" disabled={!!busy} onClick={() => go(k)}>{busy === k ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{l}</Button>)}
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
