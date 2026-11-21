import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, BrainCircuit, FileText, Loader2, MessageSquarePlus, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loading, ErrorBox, fmt } from "@/components/studio/ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createConversation, sendCognitiveMessage } from "@/lib/cognitive.functions";
import { ACCEPT, studyFile } from "@/components/cognitive/shared";

export const Route = createFileRoute("/_authenticated/cognitive/$motorId/c/$conversationId")({
  head: () => ({ meta: [{ title: "Cognitive Chat — conversa — WLC.IA" }, { name: "description", content: "Conversa de estudo com memória persistente." }, { property: "og:title", content: "Cognitive Chat — conversa — WLC.IA" }, { property: "og:description", content: "Conversa de estudo com memória persistente." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: CognitiveConversation,
});

type Used = { ref: string; id: string; title: string; motor: string | null };
type Att = { documentId: string; name: string; summary: string };

function CognitiveConversation() {
  const { motorId, conversationId } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState("");
  const [atts, setAtts] = useState<Att[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const key = ["cognitive-conv", conversationId];
  const { data, isLoading, error } = useQuery({ queryKey: key, queryFn: async () => {
    const [m, c, msgs, docs] = await Promise.all([
      supabase.from("cognitive_motors").select("id, name").eq("id", motorId).single(),
      supabase.from("cognitive_conversations").select("id, title").eq("id", conversationId).single(),
      supabase.from("cognitive_messages").select("*").eq("conversation_id", conversationId).order("created_at"),
      supabase.from("cognitive_documents").select("id, name, status, processed_count, skipped_count").eq("conversation_id", conversationId),
    ]);
    for (const r of [m, c, msgs]) if (r.error) throw r.error;
    return { motor: m.data!, conv: c.data!, messages: msgs.data!, docs: docs.data ?? [] };
  } });
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [data?.messages.length, sending]);

  async function attach(files: FileList | null) {
    if (!files?.length) return;
    for (const f of Array.from(files)) {
      try {
        const r = await studyFile(f, motorId, conversationId, setProgress);
        if (r.status === "failed") toast.error(`${f.name}: ${"error" in r && r.error ? r.error : "nenhum arquivo interpretável"}`);
        else setAtts((a) => [...a, { documentId: r.documentId, name: f.name, summary: `${r.processed} estudados${r.skipped ? `, ${r.skipped} não interpretados` : ""}` }]);
        for (const w of r.warnings) toast.warning(w);
      } catch (e) { toast.error((e as Error).message); }
    }
    setProgress(""); if (fileRef.current) fileRef.current.value = "";
    qc.invalidateQueries({ queryKey: key });
  }

  async function send() {
    const msg = text.trim() || (atts.length ? "Analise o material enviado." : "");
    if (!msg || sending) return;
    setSending(true); setText("");
    const ids = atts.map((a) => a.documentId); setAtts([]);
    try {
      const p = sendCognitiveMessage({ data: { conversationId, message: msg, documentIds: ids } });
      setTimeout(() => qc.invalidateQueries({ queryKey: key }), 400);
      const r = await p;
      if (!r.ok) toast.error(r.error);
    } catch (e) { toast.error((e as Error).message); setText(msg); }
    finally { setSending(false); qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ["cognitive-motor", motorId] }); }
  }

  async function newConv() {
    const r = await createConversation({ data: { motorId } });
    nav({ to: "/cognitive/$motorId/c/$conversationId", params: { motorId, conversationId: r.conversationId } });
  }

  if (isLoading) return <Loading />;
  if (error || !data) return <div className="p-6"><ErrorBox error={error ?? new Error("Conversa não encontrada")} /></div>;
  const docName = (id: string) => data.docs.find((d) => d.id === id)?.name ?? "documento";

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Button size="icon" variant="ghost" asChild aria-label="Voltar ao motor"><Link to="/cognitive/$motorId" params={{ motorId }}><ArrowLeft className="h-4 w-4" /></Link></Button>
        <BrainCircuit className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{data.conv.title}</div><div className="truncate text-xs text-muted-foreground">{data.motor.name} · Cognitive Chat (estudo e análise — não cria aplicativos)</div></div>
        <Button size="sm" variant="outline" onClick={newConv}><MessageSquarePlus className="h-4 w-4" />Nova</Button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {!data.messages.length && <div className="py-16 text-center text-sm text-muted-foreground">Converse, envie projetos (ZIP), códigos ou documentos. Tudo fica salvo e vira conhecimento deste motor.</div>}
        {data.messages.map((m) => {
          const md = (m.metadata ?? {}) as { used_knowledge?: Used[]; provider?: string; error?: boolean };
          if (m.role === "user") return (
            <div key={m.id} className="ml-auto max-w-[85%] space-y-1.5 rounded-2xl bg-primary/10 px-4 py-2.5 text-sm">
              <div className="whitespace-pre-wrap break-words">{m.content}</div>
              {m.document_ids.length > 0 && <div className="flex flex-wrap gap-1">{m.document_ids.map((d) => <Badge key={d} variant="secondary" className="font-normal"><FileText className="mr-1 h-3 w-3" />{docName(d)}</Badge>)}</div>}
            </div>
          );
          if (m.role === "system") return <div key={m.id} className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{m.content}</div>;
          return (
            <div key={m.id} className="space-y-2">
              <div className="prose-studio break-anywhere text-sm leading-relaxed"><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown></div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                {md.used_knowledge?.length ? <><span>Memória consultada:</span>{md.used_knowledge.map((u) => <Badge key={u.id} variant="outline" className="font-normal" title={u.title}>{u.ref} {u.title.slice(0, 40)}{u.motor ? ` · ${u.motor}` : ""}</Badge>)}</> : <span>Sem conhecimento prévio relevante</span>}
                <span>· {fmt(m.created_at)}</span>
              </div>
            </div>
          );
        })}
        {sending && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Consultando a memória e raciocinando…</div>}
        <div ref={endRef} />
      </div>
      <div className="space-y-2 border-t p-3">
        {progress && <div className="flex items-center gap-2 text-xs text-primary"><Loader2 className="h-3 w-3 animate-spin" />{progress}</div>}
        {atts.length > 0 && <div className="flex flex-wrap gap-1.5">{atts.map((a) => <Badge key={a.documentId} variant="secondary" className="gap-1 font-normal"><FileText className="h-3 w-3" />{a.name} ({a.summary})<button type="button" aria-label="Remover anexo" onClick={() => setAtts((x) => x.filter((y) => y.documentId !== a.documentId))}><X className="h-3 w-3" /></button></Badge>)}</div>}
        <div className="flex items-end gap-2">
          <input ref={fileRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => attach(e.target.files)} />
          <Button size="icon" variant="outline" aria-label="Anexar arquivos para estudo" disabled={!!progress} onClick={() => fileRef.current?.click()}><Paperclip className="h-4 w-4" /></Button>
          <Textarea rows={2} className="max-h-48 min-h-[44px] flex-1 resize-none" placeholder="Pergunte, peça uma análise ou ensine algo…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} maxLength={30000} />
          <Button size="icon" aria-label="Enviar" disabled={sending || !!progress || (!text.trim() && !atts.length)} onClick={send}><Send className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
