import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { approveTaskDeletion, approveAgentPlan, rejectAgentPlan, createAgentPlan } from "@/lib/studio.functions";
import { Page, Empty, Loading, ErrorBox, Status, fmt } from "@/components/studio/ui";
import { ProjectFilter } from "@/components/studio/ProjectFilter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Tarefas e execução — WLC.IA" }, { name: "description", content: "Tarefas do agente e registros de execução." }, { property: "og:title", content: "Tarefas e execução — WLC.IA" }, { property: "og:description", content: "Tarefas do agente e registros de execução." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Tasks,
});

function Tasks() {
  const [p, setP] = useState("all");
  const [planChatId, setPlanChatId] = useState("");
  const [planGoal, setPlanGoal] = useState("");
  const [creatingPlan, setCreatingPlan] = useState(false);
  const qc = useQueryClient();
  const approve = useServerFn(approveTaskDeletion);
  const approvePlan = useServerFn(approveAgentPlan);
  const rejectPlan = useServerFn(rejectAgentPlan);
  const createPlan = useServerFn(createAgentPlan);
  const chats = useQuery({ queryKey: ["plan-chats"], queryFn: async () => {
    const { data, error } = await supabase.from("chats").select("id, title").order("updated_at", { ascending: false }).limit(100);
    if (error) throw error; return data ?? [];
  } });
  const tasks = useQuery({ queryKey: ["tasks", p], queryFn: async () => {
    let q = supabase.from("development_tasks").select("*").order("created_at", { ascending: false }).limit(200);
    if (p !== "all") q = q.eq("project_id", p);
    const { data, error } = await q; if (error) throw error; return data;
  } });
  const plans = useQuery({ queryKey: ["agent-plans"], queryFn: async () => {
    const { data, error } = await (supabase as any).from("agent_plans").select("id, goal, plan, plan_hash, status, created_at, chat_id").eq("status", "pending").order("created_at", { ascending: false }).limit(50);
    if (error) throw error; return data ?? [];
  } });
  async function submitPlan() {
    if (!planChatId || planGoal.trim().length < 8) return toast.error("Selecione uma conversa e descreva um objetivo com pelo menos 8 caracteres.");
    setCreatingPlan(true);
    try { await createPlan({ data: { chatId: planChatId, goal: planGoal.trim() } }); setPlanGoal(""); toast.success("Plano criado. Revise-o antes de aprovar."); qc.invalidateQueries({ queryKey: ["agent-plans"] }); }
    catch (e) { toast.error((e as Error).message); } finally { setCreatingPlan(false); }
  }
  async function decidePlan(plan: any, decision: "approve" | "reject") {
    try {
      if (decision === "approve") { const r = await approvePlan({ data: { id: plan.id, planHash: plan.plan_hash } }); toast.success(`Plano aprovado; trabalho ${r.jobId} entrou na fila.`); }
      else { await rejectPlan({ data: { id: plan.id, planHash: plan.plan_hash } }); toast.success("Plano rejeitado."); }
      qc.invalidateQueries({ queryKey: ["agent-plans"] });
    } catch (e) { toast.error((e as Error).message); }
  }
  const logs = useQuery({ queryKey: ["devlogs", p], queryFn: async () => {
    let q = supabase.from("development_logs").select("*").order("created_at", { ascending: false }).limit(50);
    if (p !== "all") q = q.eq("project_id", p);
    const { data, error } = await q; if (error) throw error; return data;
  } });
  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("development_tasks").update({ status, completed_at: status === "completed" ? new Date().toISOString() : null }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }
  async function doApprove(id: string) {
    try { const r = await approve({ data: { id, confirm: true } }); toast.success(r.deleted ? "Arquivo removido no GitHub" : "Nada a remover"); }
    catch (e) { toast.error((e as Error).message); }
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }
  return (
    <Page title="Tarefas" desc="Revise planos e aprove explicitamente a criação de trabalhos duráveis." actions={<ProjectFilter value={p} onChange={setP} />}>
      <section className="space-y-3 rounded-lg border p-3">
        <h2 className="text-sm font-semibold">Criar plano de engenharia</h2>
        <p className="text-xs text-muted-foreground">Gera um plano estruturado vinculado a uma conversa. Nenhuma execução ocorre até a aprovação explícita.</p>
        <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={planChatId} onChange={(e) => setPlanChatId(e.target.value)}>
          <option value="">Selecione uma conversa</option>
          {chats.data?.map((chat) => <option key={chat.id} value={chat.id}>{chat.title || chat.id}</option>)}
        </select>
        <Textarea value={planGoal} onChange={(e) => setPlanGoal(e.target.value)} maxLength={12000} placeholder="Descreva o objetivo técnico que deseja planejar..." />
        <Button size="sm" onClick={submitPlan} disabled={creatingPlan || !planChatId || planGoal.trim().length < 8}>{creatingPlan ? "Criando plano..." : "Gerar plano para revisão"}</Button>
      </section>
      <section className="space-y-3 rounded-lg border p-3">
        <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Planos aguardando aprovação</h2><Status s={plans.data?.length ? "awaiting_approval" : "idle"} /></div>
        {plans.isLoading ? <Loading /> : plans.error ? <ErrorBox error={plans.error} /> : !plans.data?.length ? <Empty>Nenhum plano pendente.</Empty> : plans.data.map((plan: any) => (
          <article key={plan.id} className="space-y-2 rounded-md border bg-card p-3">
            <div className="text-sm font-medium">{plan.goal}</div>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-2 text-xs">{JSON.stringify(plan.plan, null, 2)}</pre>
            <div className="text-xs text-muted-foreground">Hash de revisão: {String(plan.plan_hash).slice(0, 16)}… · {fmt(plan.created_at)}</div>
            <div className="flex gap-2"><Button size="sm" onClick={() => decidePlan(plan, "approve")}>Aprovar e enfileirar</Button><Button size="sm" variant="outline" onClick={() => decidePlan(plan, "reject")}>Rejeitar</Button></div>
          </article>
        ))}
      </section>
      {tasks.isLoading ? <Loading /> : tasks.error ? <ErrorBox error={tasks.error} /> : !tasks.data?.length ? <Empty>Nenhuma tarefa ainda.</Empty> : (
        <div className="space-y-2">
          {tasks.data.map((t) => {
            const pl = (t.payload ?? {}) as any;
            return (
              <div key={t.id} className="space-y-2 rounded-lg border bg-card p-3">
                <div className="flex items-start justify-between gap-2"><div className="min-w-0 break-anywhere text-sm font-medium">{t.title}</div><Status s={t.status} /></div>
                {t.description && <div className="break-anywhere text-sm text-muted-foreground">{t.description}</div>}
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{fmt(t.created_at)}</span>
                  {t.chat_id && <Link to="/chat/$id" params={{ id: t.chat_id }} className="text-primary">abrir chat</Link>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {t.status === "awaiting_approval" && pl.kind === "delete_file" ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="sm" variant="destructive">Aprovar remoção</Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Remover {pl.path}?</AlertDialogTitle><AlertDialogDescription>O arquivo será apagado do GitHub com um commit. Motivo: {pl.reason ?? "—"}</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => doApprove(t.id)}>Remover</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : t.status !== "completed" && <Button size="sm" variant="outline" onClick={() => setStatus(t.id, "completed")}>Marcar concluída</Button>}
                  {t.status !== "rejected" && t.status !== "completed" && <Button size="sm" variant="ghost" onClick={() => setStatus(t.id, "rejected")}>Rejeitar</Button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <h2 className="pt-4 text-sm font-medium">Registros de execução</h2>
      {logs.data?.length ? (
        <div className="space-y-1 rounded-lg border bg-card p-2 font-mono text-xs">
          {logs.data.map((l) => <div key={l.id} className="break-anywhere"><span className="text-muted-foreground">{fmt(l.created_at)}</span> <span className={l.level === "error" ? "text-destructive" : l.level === "warn" ? "text-warning" : "text-primary"}>[{l.level}]</span> {l.message}</div>)}
        </div>
      ) : <Empty>Sem registros.</Empty>}
    </Page>
  );
}
