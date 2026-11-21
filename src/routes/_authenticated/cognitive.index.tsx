import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BrainCircuit, BookOpen, Download, FileText, MessageSquare, Plus, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Page, Empty, Loading, ErrorBox, fmt } from "@/components/studio/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createMotor, ensureOfficialMotors } from "@/lib/cognitive.functions";
import { OFFICIAL_MOTORS, isOfficialMotor } from "@/lib/cognitive-official-catalog";
import { downloadExport } from "@/components/cognitive/shared";

export const Route = createFileRoute("/_authenticated/cognitive/")({
  head: () => ({ meta: [{ title: "Cognitive Chat — WLC.IA" }, { name: "description", content: "Motores de conhecimento com memória cognitiva persistente." }, { property: "og:title", content: "Cognitive Chat — WLC.IA" }, { property: "og:description", content: "Motores de conhecimento com memória cognitiva persistente." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: CognitiveHome,
});

function CognitiveHome() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const qc = useQueryClient();
  useEffect(() => {
    ensureOfficialMotors().then((r) => { if (r.created) qc.invalidateQueries({ queryKey: ["cognitive-home"] }); }).catch(() => {});
  }, [qc]);
  const { data, isLoading, error } = useQuery({ queryKey: ["cognitive-home"], queryFn: async () => {
    const [m, k, d, c, msg] = await Promise.all([
      supabase.from("cognitive_motors").select("*").order("last_activity_at", { ascending: false }),
      supabase.from("cognitive_knowledge").select("motor_id, status, validation"),
      supabase.from("cognitive_documents").select("motor_id, status"),
      supabase.from("cognitive_conversations").select("id, motor_id, title, updated_at").order("updated_at", { ascending: false }).limit(500),
      supabase.from("cognitive_messages").select("motor_id", { count: "exact", head: true }),
    ]);
    for (const r of [m, k, d, c]) if (r.error) throw r.error;
    return { motors: m.data!, knowledge: k.data!, docs: d.data!, convs: c.data!, messages: msg.count ?? 0 };
  } });
  const { data: hits } = useQuery({ queryKey: ["cognitive-search", q], enabled: q.trim().length >= 3, queryFn: async () => {
    const { data, error } = await supabase.from("cognitive_messages").select("id, conversation_id, motor_id, content, created_at").ilike("content", `%${q.trim().replace(/[%_]/g, "")}%`).order("created_at", { ascending: false }).limit(20);
    if (error) throw error; return data;
  } });

  const stats = useMemo(() => {
    if (!data) return null;
    const active = data.knowledge.filter((k) => k.status === "active");
    const last = data.motors.map((m) => m.last_learning_at).filter(Boolean).sort().pop() ?? null;
    return { consolidated: active.length, docs: data.docs.filter((d) => d.status === "processed" || d.status === "partial").length, last };
  }, [data]);

  async function create() {
    setBusy(true);
    try {
      const r = await createMotor({ data: { name: name.trim(), ...(desc.trim() ? { description: desc.trim() } : {}) } });
      toast.success("Motor criado");
      nav({ to: "/cognitive/$motorId/c/$conversationId", params: { motorId: r.motorId, conversationId: r.conversationId } });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  const motorName = (id: string) => data?.motors.find((m) => m.id === id)?.name ?? "";
  const filtered = data?.motors.filter((m) => !q.trim() || m.name.toLowerCase().includes(q.trim().toLowerCase())) ?? [];
  const convHits = data?.convs.filter((c) => q.trim().length >= 2 && c.title.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 10) ?? [];

  return (
    <Page title="WLC.IA — Cognitive Chat" desc="Estude, analise e acumule conhecimento permanente. Este chat não cria aplicativos."
      actions={<>
        <Button variant="outline" onClick={() => downloadExport(null, "cognitive-engine").catch((e) => toast.error(e.message))}><Download className="h-4 w-4" />Exportar arquivos</Button>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Novo chat</Button>
      </>}>
      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : data && stats && <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat icon={BrainCircuit} label="Motores" value={data.motors.length} />
          <Stat icon={Sparkles} label="Conhecimentos consolidados" value={stats.consolidated} />
          <Stat icon={FileText} label="Documentos estudados" value={stats.docs} />
          <Stat icon={MessageSquare} label="Mensagens" value={data.messages} />
          <Stat icon={BookOpen} label="Última aprendizagem" value={stats.last ? fmt(stats.last) : "—"} />
        </div>
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Pesquisar motores e conversas…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        {(convHits.length > 0 || (hits?.length ?? 0) > 0) && (
          <div className="space-y-2 rounded-lg border bg-card p-3">
            <div className="text-sm font-medium">Conversas encontradas</div>
            {convHits.map((c) => <Link key={c.id} to="/cognitive/$motorId/c/$conversationId" params={{ motorId: c.motor_id, conversationId: c.id }} className="block rounded-md p-2 text-sm hover:bg-muted"><span className="font-medium">{c.title}</span> <span className="text-xs text-muted-foreground">· {motorName(c.motor_id)}</span></Link>)}
            {hits?.map((h) => <Link key={h.id} to="/cognitive/$motorId/c/$conversationId" params={{ motorId: h.motor_id, conversationId: h.conversation_id }} className="block rounded-md p-2 text-sm hover:bg-muted"><span className="line-clamp-2 text-muted-foreground">{h.content}</span><span className="text-xs text-muted-foreground">{motorName(h.motor_id)} · {fmt(h.created_at)}</span></Link>)}
          </div>
        )}
        <h2 className="pt-2 font-semibold">Motores de conhecimento</h2>
        {!filtered.length ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {OFFICIAL_MOTORS.map((m) => (
              <div key={m.slug} className="space-y-2 rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2"><BrainCircuit className="h-4 w-4 text-primary" /><span className="truncate font-medium">{m.name}</span><span className="rounded bg-primary/10 px-1.5 text-xs text-primary">oficial</span></div>
                <p className="line-clamp-2 text-sm text-muted-foreground">{m.description}</p>
                <div className="text-xs text-muted-foreground">{m.rules.length} regras · {m.concepts.length} conceitos · preparando…</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m) => {
              const k = data.knowledge.filter((x) => x.motor_id === m.id && x.status === "active").length;
              const d = data.docs.filter((x) => x.motor_id === m.id).length;
              const c = data.convs.filter((x) => x.motor_id === m.id).length;
              return (
                <Link key={m.id} to="/cognitive/$motorId" params={{ motorId: m.id }} className="space-y-2 rounded-lg border bg-card p-4 transition hover:border-primary/50">
                  <div className="flex items-center gap-2"><BrainCircuit className="h-4 w-4 text-primary" /><span className="truncate font-medium">{m.name}</span>{isOfficialMotor(m.slug) && <span className="rounded bg-primary/10 px-1.5 text-xs text-primary">oficial</span>}{m.status === "archived" && <span className="text-xs text-muted-foreground">(arquivado)</span>}</div>
                  {m.description && <p className="line-clamp-2 text-sm text-muted-foreground">{m.description}</p>}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground"><span>{c} conversas</span><span>{d} documentos</span><span>{k} conhecimentos</span></div>
                  <div className="text-xs text-muted-foreground">Última aprendizagem: {m.last_learning_at ? fmt(m.last_learning_at) : "—"}</div>
                </Link>
              );
            })}
          </div>
        )}
      </>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo motor de conhecimento</DialogTitle><DialogDescription>Cada motor tem identidade, memória, documentos e histórico próprios.</DialogDescription></DialogHeader>
          <Input autoFocus placeholder="Nome (ex.: Motores v0.1)" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) create(); }} />
          <Textarea placeholder="Descrição (opcional)" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={2000} />
          <DialogFooter><Button disabled={!name.trim() || busy} onClick={create}>{busy ? "Criando…" : "Criar motor"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof BrainCircuit; label: string; value: string | number }) {
  return <div className="rounded-lg border bg-card p-3"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4" />{label}</div><div className="mt-1 text-xl font-semibold tabular-nums">{value}</div></div>;
}
