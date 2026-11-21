import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArrowLeft, Download, Globe, Lock, MessageSquarePlus, Pencil, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Page, Empty, Loading, ErrorBox, fmt } from "@/components/studio/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createConversation, reviseKnowledge } from "@/lib/cognitive.functions";
import { ACCEPT, DOC_STATUS_PT, KIND_PT, VALIDATION_PT, ValidationBadge, downloadExport, studyFile } from "@/components/cognitive/shared";

export const Route = createFileRoute("/_authenticated/cognitive/$motorId/")({
  head: () => ({ meta: [{ title: "Motor de conhecimento — WLC.IA" }, { name: "description", content: "Memória, documentos e histórico de aprendizagem do motor." }, { property: "og:title", content: "Motor de conhecimento — WLC.IA" }, { property: "og:description", content: "Memória, documentos e histórico de aprendizagem do motor." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: MotorPage,
});

type K = { id: string; title: string; category: string; kind: string; content: string; validation: string; visibility: string; status: string; version: number; root_id: string | null; conflicts_with: string[]; created_at: string; learned_how: string | null };

function MotorPage() {
  const { motorId } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState("");
  const [q, setQ] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [edit, setEdit] = useState<K | null>(null);
  const key = ["cognitive-motor", motorId];
  const { data, isLoading, error } = useQuery({ queryKey: key, queryFn: async () => {
    const [m, s, c, d, k, e, msg] = await Promise.all([
      supabase.from("cognitive_motors").select("*").eq("id", motorId).single(),
      supabase.from("cognitive_motor_settings").select("*").eq("motor_id", motorId).maybeSingle(),
      supabase.from("cognitive_conversations").select("*").eq("motor_id", motorId).order("updated_at", { ascending: false }),
      supabase.from("cognitive_documents").select("*").eq("motor_id", motorId).order("created_at", { ascending: false }),
      supabase.from("cognitive_knowledge").select("id, title, category, kind, content, validation, visibility, status, version, root_id, conflicts_with, created_at, learned_how").eq("motor_id", motorId).order("created_at", { ascending: false }),
      supabase.from("cognitive_learning_events").select("*").eq("motor_id", motorId).order("created_at", { ascending: false }).limit(200),
      supabase.from("cognitive_messages").select("id", { count: "exact", head: true }).eq("motor_id", motorId),
    ]);
    for (const r of [m, c, d, k, e]) if (r.error) throw r.error;
    return { motor: m.data!, settings: s.data, convs: c.data!, docs: d.data!, knowledge: k.data! as K[], events: e.data!, messages: msg.count ?? 0 };
  } });

  const knowledge = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (data?.knowledge ?? []).filter((k) => (showOld || k.status === "active") && (!t || `${k.title} ${k.content} ${k.category}`.toLowerCase().includes(t)));
  }, [data, q, showOld]);
  const categories = useMemo(() => [...new Set((data?.knowledge ?? []).filter((k) => k.status === "active").map((k) => k.category))], [data]);

  async function newConv() {
    const r = await createConversation({ data: { motorId } });
    nav({ to: "/cognitive/$motorId/c/$conversationId", params: { motorId, conversationId: r.conversationId } });
  }
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    for (const f of Array.from(files)) {
      try {
        const r = await studyFile(f, motorId, null, setProgress);
        if (r.status === "failed") toast.error(`${f.name}: ${"error" in r && r.error ? r.error : "nenhum arquivo interpretável"}`);
        else toast.success(`${f.name}: ${r.processed} arquivos estudados, ${r.skipped} não interpretados`);
      } catch (e) { toast.error((e as Error).message); }
    }
    setProgress(""); if (fileRef.current) fileRef.current.value = "";
    qc.invalidateQueries({ queryKey: key });
  }
  async function setVisibility(k: K, v: "motor" | "global") {
    const { error } = await supabase.from("cognitive_knowledge").update({ visibility: v }).eq("id", k.id);
    if (error) return toast.error(error.message);
    await supabase.from("cognitive_learning_events").insert({ user_id: (await supabase.auth.getUser()).data.user!.id, motor_id: motorId, stage: "sharing", title: `${k.title}: ${v === "global" ? "compartilhado globalmente" : "exclusivo do motor"}` });
    qc.invalidateQueries({ queryKey: key });
  }
  async function archive(k: K) {
    if (!confirm("Arquivar este conhecimento? Ele deixa de ser usado nas respostas, mas fica preservado no histórico.")) return;
    const { error } = await supabase.from("cognitive_knowledge").update({ status: "archived" }).eq("id", k.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: key });
  }
  async function setSetting(patch: { share_new_knowledge?: boolean; use_global_knowledge?: boolean }) {
    const { error } = await supabase.from("cognitive_motor_settings").update(patch).eq("motor_id", motorId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: key });
  }

  if (isLoading) return <Loading />;
  if (error || !data) return <div className="p-6"><ErrorBox error={error ?? new Error("Motor não encontrado")} /></div>;
  const { motor, settings } = data;
  const active = data.knowledge.filter((k) => k.status === "active");
  const techniques = active.filter((k) => ["technique", "method", "pattern", "algorithm"].includes(k.kind));
  const lastActivity = motor.last_activity_at;

  return (
    <Page title={motor.name} desc={motor.description ?? `Identificador: ${motor.slug}`}
      actions={<>
        <Button variant="ghost" asChild><Link to="/cognitive"><ArrowLeft className="h-4 w-4" />Motores</Link></Button>
        <Button variant="outline" onClick={() => downloadExport(motorId, motor.slug).catch((e) => toast.error(e.message))}><Download className="h-4 w-4" />Exportar</Button>
        <Button variant="outline" disabled={!!progress} onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" />Estudar arquivos</Button>
        <Button onClick={newConv}><MessageSquarePlus className="h-4 w-4" />Nova conversa</Button>
      </>}>
      <input ref={fileRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => upload(e.target.files)} />
      {progress && <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">{progress}</div>}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[["Mensagens", data.messages], ["Arquivos analisados", data.docs.reduce((n, d) => n + d.processed_count, 0)], ["Conhecimentos", active.length], ["Validados", active.filter((k) => k.validation === "confirmed" || k.validation === "source_validated").length], ["Técnicas", techniques.length], ["Última atividade", fmt(lastActivity)]].map(([l, v]) => (
          <div key={l as string} className="rounded-lg border bg-card p-3"><div className="text-xs text-muted-foreground">{l}</div><div className="mt-1 text-lg font-semibold tabular-nums">{v}</div></div>
        ))}
      </div>
      <div className="text-xs text-muted-foreground">ID: <span className="font-mono">{motor.id}</span> · criado em {fmt(motor.created_at)} · última aprendizagem {fmt(motor.last_learning_at)}</div>

      <Tabs defaultValue="memory">
        <TabsList className="flex-wrap"><TabsTrigger value="memory">Memória do motor</TabsTrigger><TabsTrigger value="convs">Conversas</TabsTrigger><TabsTrigger value="docs">Documentos</TabsTrigger><TabsTrigger value="history">Aprendizagem</TabsTrigger><TabsTrigger value="settings">Compartilhamento</TabsTrigger></TabsList>

        <TabsContent value="memory" className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Pesquisar o que este motor aprendeu…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <label className="flex items-center gap-2 text-sm"><Switch checked={showOld} onCheckedChange={setShowOld} />Mostrar versões antigas e arquivadas</label>
          </div>
          {categories.length > 0 && <div className="flex flex-wrap gap-1.5">{categories.map((c) => <Badge key={c} variant="outline" className="cursor-pointer font-normal" onClick={() => setQ(c)}>{c}</Badge>)}</div>}
          {!knowledge.length ? <Empty>Nenhum conhecimento consolidado ainda. Converse ou envie arquivos para o motor aprender.</Empty> : (
            <div className="grid gap-3 md:grid-cols-2">
              {knowledge.map((k) => (
                <div key={k.id} className={`space-y-2 rounded-lg border bg-card p-3 ${k.status !== "active" ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 font-medium">{k.title}</div>
                    {k.status === "active" && <div className="flex shrink-0 gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={k.visibility === "global" ? "Tornar exclusivo" : "Compartilhar globalmente"} title={k.visibility === "global" ? "Compartilhado globalmente — clique para tornar exclusivo" : "Exclusivo do motor — clique para compartilhar"} onClick={() => setVisibility(k, k.visibility === "global" ? "motor" : "global")}>{k.visibility === "global" ? <Globe className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4" />}</Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Revisar" onClick={() => setEdit(k)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Arquivar" onClick={() => archive(k)}><Archive className="h-4 w-4" /></Button>
                    </div>}
                  </div>
                  <div className="whitespace-pre-wrap text-sm text-muted-foreground">{k.content}</div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="font-normal">{KIND_PT[k.kind] ?? k.kind}</Badge><Badge variant="outline" className="font-normal">{k.category}</Badge><ValidationBadge v={k.validation} />
                    <span>v{k.version}</span>{k.status !== "active" && <span>· {k.status === "superseded" ? "substituído por versão nova" : "arquivado"}</span>}
                    {k.conflicts_with.length > 0 && <span className="text-destructive">· diverge de {k.conflicts_with.length} registro(s)</span>}
                    <span>· {k.learned_how === "document" ? "aprendido de documento" : k.learned_how === "manual_revision" ? "revisão manual" : "aprendido em conversa"} · {fmt(k.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="convs" className="space-y-2">
          {!data.convs.length ? <Empty>Nenhuma conversa.</Empty> : data.convs.map((c) => (
            <Link key={c.id} to="/cognitive/$motorId/c/$conversationId" params={{ motorId, conversationId: c.id }} className="flex items-center justify-between gap-2 rounded-lg border bg-card p-3 hover:border-primary/50"><span className="truncate">{c.title}</span><span className="shrink-0 text-xs text-muted-foreground">{fmt(c.updated_at)}</span></Link>
          ))}
        </TabsContent>

        <TabsContent value="docs" className="space-y-2">
          {!data.docs.length ? <Empty>Nenhum documento estudado.</Empty> : data.docs.map((d) => <DocRow key={d.id} d={d} />)}
        </TabsContent>

        <TabsContent value="history" className="space-y-1.5">
          {data.events.map((e) => (
            <div key={e.id} className="flex items-start gap-3 rounded-md border bg-card p-2.5 text-sm">
              <Badge variant="secondary" className={`shrink-0 font-normal ${e.status === "error" ? "bg-destructive/15 text-destructive" : e.status === "warning" ? "bg-warning/15 text-warning" : ""}`}>{e.stage}</Badge>
              <div className="min-w-0 flex-1">{e.title}</div><span className="shrink-0 text-xs text-muted-foreground">{fmt(e.created_at)}</span>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="settings" className="space-y-3">
          <label className="flex items-start gap-3 rounded-lg border bg-card p-4"><Switch checked={settings?.share_new_knowledge ?? false} onCheckedChange={(v) => setSetting({ share_new_knowledge: v })} /><div><div className="font-medium">Compartilhar novos conhecimentos com o Cognitive Engine geral</div><div className="text-sm text-muted-foreground">Quando ativo, o que este motor aprender fica disponível para os outros motores. Cada conhecimento mantém sua origem e pode ser alterado individualmente na Memória.</div></div></label>
          <label className="flex items-start gap-3 rounded-lg border bg-card p-4"><Switch checked={settings?.use_global_knowledge ?? true} onCheckedChange={(v) => setSetting({ use_global_knowledge: v })} /><div><div className="font-medium">Consultar a memória global</div><div className="text-sm text-muted-foreground">Usa conhecimentos compartilhados por outros motores nas respostas, sem misturar históricos.</div></div></label>
        </TabsContent>
      </Tabs>
      {edit && <ReviseDialog k={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); qc.invalidateQueries({ queryKey: key }); }} />}
    </Page>
  );
}

function DocRow({ d }: { d: { id: string; name: string; kind: string; status: string; file_count: number; processed_count: number; skipped_count: number; analysis: string | null; error: string | null; created_at: string } }) {
  const [open, setOpen] = useState(false);
  const { data: files } = useQuery({ queryKey: ["cognitive-doc-files", d.id], enabled: open, queryFn: async () => {
    const { data, error } = await supabase.from("cognitive_file_contents").select("path, status, reason, size_bytes").eq("document_id", d.id).order("path");
    if (error) throw error; return data;
  } });
  return (
    <div className="rounded-lg border bg-card p-3 text-sm">
      <button type="button" className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setOpen(!open)}>
        <span className="truncate font-medium">{d.name}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{DOC_STATUS_PT[d.status] ?? d.status} · {d.processed_count}/{d.file_count} processados · {fmt(d.created_at)}</span>
      </button>
      {open && <div className="mt-3 space-y-3">
        {d.error && <div className="text-destructive">{d.error}</div>}
        {d.analysis && <div className="whitespace-pre-wrap rounded-md bg-muted/50 p-3">{d.analysis}</div>}
        <div className="max-h-72 space-y-1 overflow-auto">{files?.map((f) => <div key={f.path} className="flex gap-2 text-xs"><span className={f.status === "processed" ? "text-success" : "text-muted-foreground"}>{f.status === "processed" ? "✓" : "✗"}</span><span className="font-mono">{f.path}</span>{f.reason && <span className="text-muted-foreground">— {f.reason}</span>}</div>)}</div>
      </div>}
    </div>
  );
}

function ReviseDialog({ k, onClose, onDone }: { k: K; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState(k.title);
  const [content, setContent] = useState(k.content);
  const [validation, setValidation] = useState(k.validation);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try { await reviseKnowledge({ data: { id: k.id, title, content, validation: validation as never } }); toast.success(`Versão ${k.version + 1} criada; a anterior foi preservada.`); onDone(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Revisar conhecimento (nova versão)</DialogTitle></DialogHeader>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        <Textarea rows={8} value={content} onChange={(e) => setContent(e.target.value)} maxLength={6000} />
        <Select value={validation} onValueChange={setValidation}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(VALIDATION_PT).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
        <DialogFooter><Button disabled={busy || !title.trim() || !content.trim()} onClick={save}>Salvar nova versão</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
