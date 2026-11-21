import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { isSessionActive } from "@/lib/agent-lock";
import { currentRunEvents, interruptedRun, RESUME_MESSAGE } from "@/lib/run-status";
import { approvalMessage } from "@/lib/agent-plan";
import type { CompletionReport } from "@/lib/completion-report";
import { CopyButton } from "@/components/studio/CopyButton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Loader2, Send, CheckCircle2, XCircle, PauseCircle, GitCommit, Bug, AlertTriangle, FileCode2, Clock, ListChecks, Activity, Radio, ChevronRight, Sparkles, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sendChatMessage, approveAgentPlan, rejectAgentPlan } from "@/lib/studio.functions";
import { ChatExportButton } from "@/components/studio/ChatExportDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChatComposer } from "@/components/studio/ChatComposer";
import type { ChatAttachment, ChatMode } from "@/lib/chat-modes";
import { DEFAULT_MODE, MODE_STORAGE_KEY, parseMode } from "@/lib/mode-policy";
import { Loading, ErrorBox } from "@/components/studio/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat/$id")({
  head: () => ({ meta: [{ title: "Chat — WLC.IA" }, { name: "description", content: "Conversa com a WLC.IA." }, { property: "og:title", content: "Chat — WLC.IA" }, { property: "og:description", content: "Conversa com a WLC.IA." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ChatPage,
});

const AUTO_RESUME_RETRIES = 3;
const AUTO_RESUME_RETRY_MS = 1500;
const MAX_AUTO_RESUMES = 60;

function ChatPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const send = useServerFn(sendChatMessage);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  // Backend truth about the run: survives reloads and other tabs.
  const session = useQuery({ queryKey: ["agent-session", id], refetchInterval: (q) => (sending || isSessionActive(q.state.data as any) ? 4000 : 30000), queryFn: async () => {
    const { data, error } = await supabase.from("agent_sessions").select("status, heartbeat_at, started_at").eq("chat_id", id).maybeSingle();
    if (error) throw error; return data;
  } });
  const remoteBusy = !sending && isSessionActive(session.data);
  const busy = sending || remoteBusy;
  const wasRemoteBusy = useRef(false);
  useEffect(() => {
    // A run started elsewhere (reload, other tab) finished: refresh the history.
    if (wasRemoteBusy.current && !remoteBusy) { qc.invalidateQueries({ queryKey: ["msgs", id] }); qc.invalidateQueries({ queryKey: ["chat", id] }); }
    wasRemoteBusy.current = remoteBusy;
  }, [remoteBusy, id, qc]);
  const chat = useQuery({ queryKey: ["chat", id], queryFn: async () => {
    const { data, error } = await supabase.from("chats").select("*, projects(name), repositories(full_name)").eq("id", id).single();
    if (error) throw error; return data;
  } });
  const msgs = useQuery({ queryKey: ["msgs", id], refetchInterval: busy ? 3000 : false, queryFn: async () => {
    const { data, error } = await supabase.from("chat_messages").select("*").eq("chat_id", id).order("created_at");
    if (error) throw error; return data;
  } });
  // Durable execution telemetry. Realtime is an optimization; polling remains the
  // recovery path when the websocket is unavailable or reconnecting.
  const events = useQuery({
    queryKey: ["agent-events", id],
    refetchInterval: busy ? (realtimeConnected ? 6000 : 2500) : 30000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("agent_events")
        .select("id, event_type, status, title, detail, created_at")
        .eq("chat_id", id)
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return (data ?? []) as AgentEvent[];
    },
  });
  useEffect(() => {
    // One live channel per open chat: steps, run state, messages and approval cards.
    // Polling above stays as the recovery path if the websocket drops.
    let active = true;
    const filter = `chat_id=eq.${id}`;
    const refresh = (key: string) => { if (active) void qc.invalidateQueries({ queryKey: [key, id] }); };
    const channel = supabase
      .channel(`chat-live-${id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "agent_events", filter }, () => refresh("agent-events"))
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_sessions", filter }, () => refresh("agent-session"))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter }, () => refresh("msgs"))
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_plans", filter }, () => refresh("chat-plans"))
      .subscribe((status) => {
        if (active) setRealtimeConnected(status === "SUBSCRIBED");
      });
    return () => {
      active = false;
      setRealtimeConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [id, qc]);
  const plans = useQuery({ queryKey: ["chat-plans", id], refetchInterval: realtimeConnected ? 30000 : 8000, queryFn: async () => {
    const { data, error } = await (supabase as any).from("agent_plans").select("id, goal, plan, plan_hash, status, created_at").eq("chat_id", id).eq("status", "pending").order("created_at", { ascending: false }).limit(3);
    if (error) throw error; return (data ?? []) as PendingPlan[];
  } });
  const [activityOpen, setActivityOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState<string | null>(null);
  const [mode, setModeState] = useState<ChatMode>(DEFAULT_MODE);
  // The selected mode is the user's persistent preference: restored on reload, new chats and navigation.
  useEffect(() => { try { setModeState(parseMode(localStorage.getItem(MODE_STORAGE_KEY))); } catch { /* storage blocked */ } }, []);
  const setMode = (m: ChatMode) => { setModeState(m); try { localStorage.setItem(MODE_STORAGE_KEY, m); } catch { /* storage blocked */ } };
  const activityRef = useRef<HTMLDivElement>(null);
  const sessionActive = isSessionActive(session.data);
  const runEvents = currentRunEvents(events.data ?? [], (session.data?.started_at as string | null | undefined) ?? null);
  const interrupted = !busy && session.isFetched && events.isFetched ? interruptedRun(events.data ?? [], sessionActive) : null;
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs.data?.length, pending, plans.data?.length, busy, !!interrupted]);

  // Activity window follows each new step live, like a terminal.
  useEffect(() => {
    if (!activityOpen) return;
    const t = setTimeout(() => { const el = activityRef.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }); }, 50);
    return () => clearTimeout(t);
  }, [activityOpen, events.data?.length, events.data?.[0]?.id]);

  // Automatic continuation: paused slices and interrupted runs resume by themselves.
  const autoCount = useRef(0);
  const [autoOff, setAutoOff] = useState(false);
  const [autoIn, setAutoIn] = useState<number | null>(null);
  const handledInterrupt = useRef<string | null>(null);
  // Per-slice retries while the server is still releasing the previous run's lock.
  const autoRetries = useRef(0);
  const [autoRetrying, setAutoRetrying] = useState(false);
  function retryAuto(): boolean {
    if (mode === "chat" || autoOff || autoRetries.current >= AUTO_RESUME_RETRIES) { autoRetries.current = 0; setAutoRetrying(false); return false; }
    autoRetries.current++; setAutoRetrying(true);
    setTimeout(() => { void run(RESUME_MESSAGE, false, [], true); }, AUTO_RESUME_RETRY_MS);
    return true;
  }
  function scheduleAuto() {
    if (mode === "chat" || autoOff || autoCount.current >= MAX_AUTO_RESUMES) return;
    setAutoIn(Date.now() + 800);
  }
  useEffect(() => {
    if (autoIn === null) return;
    const t = setTimeout(() => { setAutoIn(null); if (autoOff || mode === "chat") return; autoCount.current++; autoRetries.current = 0; setAutoRetrying(true); void run(RESUME_MESSAGE, false, [], true); }, Math.max(0, autoIn - Date.now()));
    return () => clearTimeout(t);
  }, [autoIn, autoOff, mode]);
  useEffect(() => {
    if (mode === "chat" || !interrupted || busy) return;
    const key = String((interrupted as any).id ?? interrupted.created_at);
    if (handledInterrupt.current === key) return;
    handledInterrupt.current = key; scheduleAuto();
  }, [interrupted, busy, mode]);

  function submit() {
    const m = text.trim();
    if (!m) return;
    autoCount.current = 0; setAutoOff(false);
    void run(m, true);
  }

  async function run(m: string, fromInput = false, attachments: ChatAttachment[] = [], isAutoResume = false) {
    if (!m) return;
    if (isAutoResume && autoOff) { setAutoRetrying(false); return; }
    // Guard against double submits (Enter + click, slow network) and runs already active on the server.
    if (inFlight.current || busy) {
      if (!isAutoResume) return;
      // The local cache may still show the finished slice as running: confirm with the server first.
      if (inFlight.current) { retryAuto(); return; }
      const fresh = await qc.fetchQuery({ queryKey: ["agent-session", id], staleTime: 0, queryFn: async () => {
        const { data, error } = await supabase.from("agent_sessions").select("status, heartbeat_at, started_at").eq("chat_id", id).maybeSingle();
        if (error) throw error; return data;
      } }).catch(() => null);
      if (isSessionActive(fresh as any)) { retryAuto(); return; }
    }
    if (isAutoResume) setAutoRetrying(false);
    inFlight.current = true;
    setSending(true); setPending(m); if (fromInput) setText(""); setStartedAt(Date.now());
    // Runs in the background: the field frees at once, navigating inside the Studio
    // keeps the run going, and progress is read back from the server session.
    setTimeout(() => { inFlight.current = false; }, 1500);
    void qc.invalidateQueries({ queryKey: ["agent-session", id] });
    try {
      const r = await send({ data: { chatId: id, message: m, mode, attachments } });
      if (!r.ok && r.busy && isAutoResume && retryAuto()) { /* retrying shortly */ }
      else if (!r.ok && r.busy) { if (fromInput) setText(m); toast.info("A WLC.IA ainda está concluindo a execução anterior. Sua mensagem foi mantida no campo."); }
      else if (!r.ok) toast.error(r.error ?? "Falha no agente");
      else if (r.paused) { if (mode === "chat") { /* chat never auto-continues */ } else if (!autoOff && autoCount.current < MAX_AUTO_RESUMES) scheduleAuto(); else toast.info("Checkpoint de segurança salvo. O progresso concluído foi preservado."); }
      else if (r.rotations.length) toast.info(`Chaves alternadas: ${r.rotations.join(" → ")}`);
    } catch (e) { toast.error((e as Error).message); scheduleAuto(); }
    finally {
      setSending(false); setPending(null); setStartedAt(null);
      qc.invalidateQueries({ queryKey: ["msgs", id] }); qc.invalidateQueries({ queryKey: ["chat", id] }); qc.invalidateQueries({ queryKey: ["agent-session", id] });
    }
  }

  const c = chat.data as any;
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden overscroll-none">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b px-2 sm:px-4">
        <Button asChild variant="ghost" size="icon" className="h-10 w-10" aria-label="Voltar"><Link to="/history"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{c?.repositories?.full_name ? c.repositories.full_name.split("/").pop() : (c?.title ?? "…")}</div>
          <div className="flex items-center gap-1.5 truncate text-xs text-muted-foreground" title={busy ? "WLC.IA trabalhando" : "WLC.IA pronta"}><span className={`inline-flex h-1.5 w-1.5 shrink-0 rounded-full ${busy ? "animate-pulse bg-amber-400" : "bg-emerald-400"}`} /><span className="truncate">{c?.repositories?.full_name ? `${c.repositories.full_name.split("/").pop()} - ${c.repositories.full_name}@${c.branch ?? "main"}` : "sem repositório"}</span></div></div>
        <ChatExportButton chatId={id} compact />
        {c?.repository_id && <a href={`/debugger?repo=${encodeURIComponent(c.repository_id)}`} target="_blank" rel="noreferrer" className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md border px-2 text-xs hover:bg-accent"><Bug className="h-4 w-4"/><span className="hidden sm:inline">Depurador</span></a>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        <div className="mx-auto max-w-3xl space-y-4 p-3 sm:p-6">
          {msgs.isLoading ? <Loading /> : msgs.error ? <ErrorBox error={msgs.error} /> : !msgs.data?.length && !pending ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Descreva o objetivo para a WLC.IA. Ela analisará o contexto disponível antes de agir.</div>
          ) : msgs.data?.map((m) => <Msg key={m.id} m={m} clean={mode === "chat"} />)}
          {pending && !msgs.data?.some((m) => m.role === "user" && m.content === pending) && <Msg m={{ role: "user", content: pending }} />}
          {busy && mode === "chat" && <div role="status" aria-live="polite" className="flex items-center gap-2 px-1 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />WLC.IA está digitando…</div>}
          {busy && mode !== "chat" && <LiveStatus since={remoteBusy && session.data?.started_at ? new Date(session.data.started_at).getTime() : (startedAt ?? Date.now())} events={sending && !sessionActive ? [] : runEvents} onOpen={() => setActivityOpen(true)} />}
          {busy && runEvents.some((e) => typeof e.detail?.content === "string") && <Button size="sm" variant="outline" className="h-9" onClick={() => { const f = runEvents.find((e) => typeof e.detail?.content === "string"); if (f) setCodeOpen(String(f.id)); }}><FileCode2 className="h-4 w-4" />Ver código sendo criado ao vivo</Button>}
          {mode !== "chat" && (autoIn !== null || autoRetrying) && !sending && <div role="status" className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm"><Loader2 className="h-4 w-4 animate-spin text-primary" /><span className="flex-1">Continuando a tarefa automaticamente… (tentativa {autoCount.current + 1} de {MAX_AUTO_RESUMES})</span><Button size="sm" variant="outline" onClick={() => { setAutoOff(true); setAutoIn(null); setAutoRetrying(false); }}>Pausar</Button></div>}
          {mode !== "chat" && interrupted && autoIn === null && !autoRetrying && <InterruptedCard lastStep={interrupted.title} onResume={() => { autoCount.current = 0; autoRetries.current = 0; setAutoOff(false); void run(RESUME_MESSAGE); }} />}
          <div ref={endRef} />
        </div>
      </div>
      <div className="pb-safe shrink-0 border-t bg-background">
        {plans.data?.[0] && <ApprovalCard key={plans.data[0].id} plan={plans.data[0]} disabled={busy} onApproved={(msg) => void run(msg)} onDone={() => { qc.invalidateQueries({ queryKey: ["chat-plans", id] }); qc.invalidateQueries({ queryKey: ["agent-events", id] }); }} />}
        <ActivityPill events={events.data ?? []} busy={busy} realtime={realtimeConnected} onOpen={() => setActivityOpen(true)} />
        <LiveCodeDialog openId={codeOpen} onClose={() => setCodeOpen(null)} events={events.data ?? []} busy={busy} />
        <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
          <DialogContent className="flex max-h-[85dvh] w-[calc(100vw-1.5rem)] max-w-lg flex-col gap-3 p-4">
            <DialogHeader><DialogTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-primary" />Atividade da execução</DialogTitle><DialogDescription>Cada passo da WLC.IA aparece aqui assim que acontece.</DialogDescription></DialogHeader>
            <div ref={activityRef} className="min-h-0 flex-1 overflow-y-auto scroll-smooth"><AgentEventTimeline onOpenCode={(eid) => setCodeOpen(eid)} events={events.data ?? []} loading={events.isLoading} realtime={realtimeConnected} error={events.error ? "Não foi possível carregar os eventos. A conversa continua funcionando." : null} /></div>
          </DialogContent>
        </Dialog>
        <ChatComposer busy={busy} remoteBusy={remoteBusy} mode={mode} onModeChange={setMode} onSend={(m, a) => { if (busy) return false; void run(m, false, a); }} />
      </div>
    </div>
  );
}


type AgentEvent = {
  id: number;
  event_type: string;
  status: string;
  title: string;
  detail: Record<string, unknown> | null;
  created_at: string;
};

type PendingPlan = { id: string; goal: string; plan: any; plan_hash: string; status: string; created_at: string };

function ActivityPill({ events, busy, realtime, onOpen }: { events: AgentEvent[]; busy: boolean; realtime: boolean; onOpen: () => void }) {
  if (!events.length && !busy) return null;
  const last = events[0];
  return (
    <div className="mx-auto max-w-3xl px-2 pt-2 sm:px-3">
      <button type="button" onClick={onOpen} className="flex h-9 w-full items-center gap-2 rounded-full border bg-card px-3 text-xs hover:bg-accent" aria-label="Abrir atividade da execução">
        {busy ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" /> : <Activity className="h-3.5 w-3.5 shrink-0 text-primary" />}
        <span className="shrink-0 font-medium">{events.length} evento(s)</span>
        <span className="min-w-0 flex-1 truncate text-left text-muted-foreground">{last?.title ?? "Iniciando…"}</span>
        <span className="inline-flex shrink-0 items-center gap-1 text-muted-foreground"><Radio className={cn("h-3 w-3", realtime ? "text-emerald-500" : "text-amber-500")} />{realtime ? "ao vivo" : "sinc."}</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>
    </div>
  );
}

function ApprovalCard({ plan, disabled, onApproved, onDone }: { plan: PendingPlan; disabled: boolean; onApproved: (message: string) => void; onDone: () => void }) {
  const approve = useServerFn(approveAgentPlan);
  const reject = useServerFn(rejectAgentPlan);
  const [busy, setBusy] = useState<null | "approve" | "reject">(null);
  const steps: any[] = Array.isArray(plan.plan?.steps) ? plan.plan.steps : [];
  async function decide(kind: "approve" | "reject") {
    setBusy(kind);
    try {
      if (kind === "approve") {
        await approve({ data: { id: plan.id, planHash: plan.plan_hash } });
        toast.success("Aprovado. A WLC.IA vai executar este plano — o modo selecionado não muda.");
        onApproved(approvalMessage(plan.goal, steps.map((st) => (typeof st === "string" ? st : st.title ?? st.description ?? "")).filter(Boolean)));
      }
      else { await reject({ data: { id: plan.id, planHash: plan.plan_hash } }); toast.info("Ok, seguimos conversando sem alterar arquivos."); }
      onDone();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }
  return (
    <div className="mx-auto max-w-3xl px-2 pt-2 sm:px-3">
    <div className="max-h-[40dvh] space-y-3 overflow-y-auto rounded-xl border border-primary/40 bg-card p-3 shadow-sm">
      <div className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div className="min-w-0"><div className="text-sm font-medium">Plano pronto — posso criar?</div><div className="break-anywhere text-xs text-muted-foreground line-clamp-3">{plan.goal}</div></div></div>
      {steps.length > 0 && <ul className="space-y-0.5 pl-6 text-xs">{steps.slice(0, 5).map((st, i) => <li key={i} className="list-disc break-anywhere">{typeof st === "string" ? st : st.title ?? st.description ?? JSON.stringify(st)}</li>)}</ul>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="sm" className="h-10 sm:flex-1" disabled={!!busy || disabled} onClick={() => decide("approve")}>{busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Criar</Button>
        <Button size="sm" variant="outline" className="h-10 sm:flex-1" disabled={!!busy || disabled} onClick={() => decide("reject")}>{busy === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Continuar no chat</Button>
      </div>
    </div>
    </div>
  );
}

function AgentEventTimeline({ events, loading, realtime, error, onOpenCode }: { onOpenCode: (id: string) => void; events: AgentEvent[]; loading: boolean; realtime: boolean; error: string | null }) {
  if (loading && events.length === 0) return null;
  if (events.length === 0 && !error) return null;
  const visible = [...events].reverse();
  return (
    <section className="overflow-hidden rounded-lg border bg-card text-xs" aria-label="Atividade da WLC.IA">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Activity className="h-3.5 w-3.5 text-primary" />
        <span className="font-medium">Atividade da execução</span>
        <span className="text-muted-foreground">{events.length} evento(s)</span>
        <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground" title={realtime ? "Atualização em tempo real conectada" : "Atualização por consulta periódica"}>
          <Radio className={cn("h-3 w-3", realtime ? "text-emerald-500" : "text-amber-500")} />
          {realtime ? "ao vivo" : "sincronização"}
        </span>
      </div>
      {error && <p className="px-3 py-2 text-muted-foreground">{error}</p>}
      <ol className="ml-4 space-y-0 border-l py-2">
        {visible.map((event) => {
          const detail = event.detail ?? {};
          const tool = typeof detail.tool === "string" ? detail.tool : null;
          const path = typeof detail.path === "string" ? detail.path : null;
          const commit = typeof detail.commit_sha === "string" ? detail.commit_sha : null;
          const failed = event.status === "failed" || event.status === "error";
          return (
            <li key={event.id} className={cn("relative px-3 py-1.5 pl-4", typeof detail.content === "string" && "cursor-pointer rounded hover:bg-accent")} onClick={typeof detail.content === "string" ? () => onOpenCode(String(event.id)) : undefined}>
              <span className={cn("absolute -left-[5px] top-3 h-2 w-2 rounded-full ring-2 ring-card", failed ? "bg-destructive" : event.status === "running" ? "animate-pulse bg-primary" : "bg-primary")} />
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className={cn("font-medium", failed && "text-destructive")}>{event.title}</span>
                <span className="text-muted-foreground">{new Date(event.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
              </div>
              {(tool || path || commit) && <div className="mt-0.5 break-all text-muted-foreground">{tool && <span className="font-mono">{tool}</span>}{path && <span> · {path}</span>}{commit && <span> · commit {commit.slice(0, 7)}</span>}</div>}
              {typeof detail.content === "string" && <div className="mt-0.5 inline-flex items-center gap-1 text-primary"><FileCode2 className="h-3 w-3" />Ver código ao vivo</div>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Msg({ m, clean = false }: { m: { role: string; content: string; metadata?: any }; clean?: boolean }) {
  const md = m.metadata ?? {};
  const plain = clean || md.mode === "chat";
  if (m.role === "user") return <div className="flex flex-col items-end gap-0.5">{Array.isArray(m.metadata?.attachments) && m.metadata.attachments.length > 0 && <div className="flex max-w-[85%] flex-wrap justify-end gap-1.5">{m.metadata.attachments.map((a: any, i: number) => a.kind === "image" ? <img key={i} src={a.content} alt={a.name} className="h-20 w-20 rounded-lg border object-cover" /> : <span key={i} className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 text-xs"><FileCode2 className="h-3 w-3" />{a.name}</span>)}</div>}<div className="max-w-[85%] whitespace-pre-wrap break-anywhere rounded-lg bg-primary/15 px-3 py-2 text-sm">{m.content}</div><CopyButton text={m.content} /></div>;
  if (m.role === "system") return <div className="space-y-0.5"><div className="whitespace-pre-wrap break-anywhere rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">{m.content}</div><CopyButton text={m.content} /></div>;
  const tools: any[] = plain ? [] : (md.tool_log ?? []);
  return (
    <div className="space-y-2">
      {tools.length > 0 && (
        <details open className="rounded-lg border bg-card text-xs">
          <summary className="cursor-pointer px-3 py-2 text-muted-foreground">{tools.length} operação(ões) · {tools.filter((t) => t.ok).length} ok</summary>
          <ul className="space-y-1 border-t p-2">
            {tools.map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                {t.ok ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />}
                <span className="min-w-0 break-anywhere"><span className="font-mono">{t.tool}</span> — {t.summary}
                  {t.commit_url && <a href={t.commit_url} target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center gap-0.5 text-primary"><GitCommit className="h-3 w-3" />{t.commit_sha?.slice(0, 7)}</a>}
                  {t.verified === false && <span className="ml-1 text-warning">(não verificado)</span>}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className={cn("prose-studio break-anywhere text-sm leading-relaxed")}><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown></div>
      {!plain && md.completion && (md.completion as CompletionReport).status !== "answered" && <Completion r={md.completion as CompletionReport} />}
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <CopyButton text={m.content} />
        {md.provider && <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />WLC.IA</span>}
        {!plain && md.paused && <span className="inline-flex items-center gap-1 text-warning"><PauseCircle className="h-3 w-3" /> pausado em checkpoint</span>}
      </div>
    </div>
  );
}

function formatElapsed(secs: number) {
  return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}min ${String(secs % 60).padStart(2, "0")}s`;
}

function LiveStatus({ since, events, onOpen }: { since: number; events: AgentEvent[]; onOpen: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const secs = Math.max(0, Math.floor((now - since) / 1000));
  const current = events[0];
  const previous = events.slice(1, 4);
  const ops = events.filter((e) => e.event_type === "tool" && e.status === "completed").length;
  return (
    <div role="status" aria-live="polite" className="overflow-hidden rounded-lg border bg-card text-sm">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
        <div className="min-w-0 flex-1">
          <div className="font-medium">WLC.IA está trabalhando</div>
          <div className="truncate text-xs text-muted-foreground">{current?.title ?? "Iniciando a execução…"}</div>
        </div>
        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{formatElapsed(secs)}</span>
      </div>
      {previous.length > 0 && (
        <ol className="space-y-1 border-t px-3 py-2 text-xs text-muted-foreground">
          {previous.map((e) => (
            <li key={e.id} className="flex min-w-0 items-center gap-2">
              {e.status === "failed" ? <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" /> : <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />}
              <span className="truncate">{e.title}</span>
            </li>
          ))}
        </ol>
      )}
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-1 border-t px-3 py-2 text-left text-xs text-primary hover:bg-accent">
        <Activity className="h-3.5 w-3.5" />Acompanhar ao vivo · {ops} operação(ões) concluída(s)<ChevronRight className="ml-auto h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function InterruptedCard({ lastStep, onResume }: { lastStep: string; onResume: () => void }) {
  return (
    <div role="status" className="space-y-2 rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm">
      <div className="flex items-start gap-2">
        <PauseCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div className="min-w-0">
          <div className="font-medium">A execução anterior parou antes de terminar</div>
          <div className="break-anywhere text-xs text-muted-foreground">Último passo: {lastStep}. O que já foi gravado continua salvo.</div>
        </div>
      </div>
      <Button size="sm" className="h-10 w-full sm:w-auto" onClick={onResume}><RotateCcw className="h-4 w-4" />Continuar de onde parou</Button>
    </div>
  );
}

const completionLook: Record<CompletionReport["status"], { label: string; icon: typeof CheckCircle2; cls: string }> = {
  success: { label: "Concluído e verificado", icon: CheckCircle2, cls: "border-success/40 bg-success/5 text-success" },
  partial: { label: "Concluído com pendências", icon: AlertTriangle, cls: "border-warning/40 bg-warning/5 text-warning" },
  paused: { label: "Pausado em checkpoint", icon: PauseCircle, cls: "border-warning/40 bg-warning/5 text-warning" },
  error: { label: "Falhou", icon: XCircle, cls: "border-destructive/40 bg-destructive/5 text-destructive" },
  answered: { label: "Resposta concluída", icon: CheckCircle2, cls: "border-border bg-muted/30 text-muted-foreground" },
};

function Completion({ r }: { r: CompletionReport }) {
  const look = completionLook[r.status] ?? completionLook.answered;
  const Icon = look.icon;
  const dur = r.duration_ms >= 1000 ? `${Math.round(r.duration_ms / 1000)}s` : `${r.duration_ms}ms`;
  if (r.status === "answered") return <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Icon className="h-3.5 w-3.5" />{look.label} · {dur} · nenhuma alteração no repositório</div>;
  return (
    <div className={cn("space-y-2 rounded-lg border p-3 text-xs", look.cls)}>
      <div className="flex items-center gap-2 font-medium"><Icon className="h-4 w-4 shrink-0" /><span className="flex-1">{look.label}</span><span className="inline-flex items-center gap-1 font-normal text-muted-foreground"><Clock className="h-3 w-3" />{dur}</span></div>
      <div className="space-y-2 text-foreground">
        {r.done.length > 0 && <Section icon={ListChecks} title={`Realizado (${r.done.length})`} items={r.done.slice(0, 8)} more={r.done.length - 8} />}
        {r.files.length > 0 && <Section icon={FileCode2} title="Arquivos criados ou modificados" items={r.files} mono />}
        {r.commits.length > 0 && <div><div className="mb-1 flex items-center gap-1 text-muted-foreground"><GitCommit className="h-3 w-3" /> Commits</div><div className="flex flex-wrap gap-1.5">{r.commits.map((c) => c.url ? <a key={c.sha} href={c.url} target="_blank" rel="noreferrer" className="rounded border px-1.5 py-0.5 font-mono text-primary hover:bg-muted">{c.sha.slice(0, 7)}</a> : <span key={c.sha} className="rounded border px-1.5 py-0.5 font-mono">{c.sha.slice(0, 7)}</span>)}</div></div>}
        {r.tests.length > 0 && <Section icon={CheckCircle2} title="Testes / verificações" items={r.tests} />}
        {r.pending.length > 0 && <Section icon={PauseCircle} title="Pendências" items={r.pending} />}
        {r.issues.length > 0 && <Section icon={AlertTriangle} title="Erros encontrados" items={r.issues} />}
        {!r.commits.length && r.status !== "error" && <div className="text-muted-foreground">Nenhum commit realizado nesta execução.</div>}
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, items, more = 0, mono }: { icon: typeof CheckCircle2; title: string; items: string[]; more?: number; mono?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1 text-muted-foreground"><Icon className="h-3 w-3" /> {title}</div>
      <ul className="space-y-0.5 pl-4">{items.map((t, i) => <li key={i} className={cn("list-disc break-anywhere", mono && "font-mono")}>{t}</li>)}{more > 0 && <li className="list-none text-muted-foreground">+{more}</li>}</ul>
    </div>
  );
}

/** Shows the code the agent is writing, line by line, following each new file automatically. */
function LiveCodeDialog({ openId, onClose, events, busy }: { openId: string | null; onClose: () => void; events: AgentEvent[]; busy: boolean }) {
  const files = events.filter((e) => typeof e.detail?.content === "string");
  const [follow, setFollow] = useState(true);
  const [shownId, setShownId] = useState<string | null>(null);
  const [lines, setLines] = useState(0);
  const boxRef = useRef<HTMLPreElement>(null);
  useEffect(() => { if (openId) { setShownId(openId); setFollow(true); } }, [openId]);
  // While following, jump to the newest file as soon as the agent starts it.
  useEffect(() => { if (openId && follow && files[0] && String(files[0].id) !== shownId) setShownId(String(files[0].id)); }, [files[0]?.id, follow, openId]);
  const ev = files.find((e) => String(e.id) === shownId) ?? files[0];
  const all = typeof ev?.detail?.content === "string" ? String(ev.detail.content).split("\n") : [];
  useEffect(() => { setLines(0); }, [ev?.id]);
  useEffect(() => {
    if (!openId || lines >= all.length) return;
    const step = Math.max(1, Math.ceil(all.length / 200));
    const t = setTimeout(() => setLines((n) => Math.min(all.length, n + step)), 25);
    return () => clearTimeout(t);
  }, [lines, all.length, openId]);
  useEffect(() => { const el = boxRef.current; if (el) el.scrollTop = el.scrollHeight; }, [lines]);
  const path = typeof ev?.detail?.path === "string" ? ev.detail.path : "arquivo";
  const writing = lines < all.length;
  return (
    <Dialog open={!!openId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-3 p-4">
        <DialogHeader>
          <DialogTitle className="flex min-w-0 items-center gap-2 text-base"><FileCode2 className="h-4 w-4 shrink-0 text-primary" /><span className="truncate font-mono text-sm">{path}</span></DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {writing ? <><Loader2 className="h-3 w-3 animate-spin" />Escrevendo… linha {lines} de {all.length}</> : <>{all.length} linhas{busy && follow ? " · aguardando o próximo arquivo" : ""}</>}
            <button type="button" className="ml-auto rounded border px-2 py-0.5 text-xs hover:bg-accent" onClick={() => setFollow((f) => !f)}>{follow ? "Seguindo ao vivo" : "Seguir ao vivo"}</button>
          </DialogDescription>
        </DialogHeader>
        {files.length > 1 && <div className="flex gap-1 overflow-x-auto pb-1">{files.slice(0, 12).map((f) => <button key={f.id} type="button" onClick={() => { setFollow(false); setShownId(String(f.id)); }} className={cn("shrink-0 rounded border px-2 py-0.5 font-mono text-[11px]", String(f.id) === String(ev?.id) ? "border-primary text-primary" : "text-muted-foreground hover:bg-accent")}>{String(f.detail?.path ?? "").split("/").pop()}</button>)}</div>}
        <pre ref={boxRef} className="min-h-[40dvh] flex-1 overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs leading-5">
          {all.slice(0, lines).map((l, i) => <div key={i} className="flex"><span className="mr-3 w-8 shrink-0 select-none text-right text-muted-foreground">{i + 1}</span><span className="whitespace-pre">{l}</span></div>)}
          {writing && <span className="ml-11 inline-block h-4 w-2 animate-pulse bg-primary align-middle" />}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
