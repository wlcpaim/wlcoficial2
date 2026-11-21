#!/usr/bin/env node
/**
 * WLC.IA Autonomous Runtime V1.
 * Run as a separate Node process. Job execution is fail-closed: an explicitly
 * configured executor module must export executeApprovedJob().
 */
import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import path from "node:path";

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
for (const key of required) if (!process.env[key]) throw new Error(`${key} is required`);
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const workerId = process.env.WLC_WORKER_ID || `wlc-worker-${randomUUID()}`;
const pollMs = boundedInt(process.env.WLC_POLL_MS, 2000, 250, 30000);
const heartbeatMs = boundedInt(process.env.WLC_HEARTBEAT_MS, 15000, 5000, 60000);
const staleSeconds = boundedInt(process.env.WLC_STALE_SECONDS, 120, 30, 3600);
const maxRuntimeMs = boundedInt(process.env.WLC_JOB_TIMEOUT_MS, 15 * 60 * 1000, 1000, 60 * 60 * 1000);
let stopping = false;
let executor;

function boundedInt(raw, fallback, min, max) {
  const n = Number(raw ?? fallback);
  if (!Number.isSafeInteger(n) || n < min || n > max) return fallback;
  return n;
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const canonical = (v) => {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
};
const sha256 = (v) => createHash("sha256").update(v).digest("hex");
async function rpc(name, args) {
  const { data, error } = await db.rpc(name, args);
  if (error) throw new Error(`${name}: ${error.message}`);
  return data;
}
async function loadExecutor() {
  const spec = process.env.WLC_EXECUTOR_MODULE;
  if (!spec) return null;
  const url = spec.startsWith("file:") ? spec : pathToFileURL(path.resolve(spec)).href;
  const mod = await import(url);
  if (typeof mod.executeApprovedJob !== "function") throw new Error("Executor module must export executeApprovedJob(context)");
  return mod.executeApprovedJob;
}
async function emit(job, eventType, title, detail = {}, status = "info") {
  const { error } = await db.from("agent_events").insert({
    job_id: job.id, user_id: job.user_id, project_id: job.project_id, chat_id: job.chat_id,
    event_type: eventType, status, title, detail,
  });
  if (error) throw new Error(`Event persistence failed: ${error.message}`);
}
async function loadApprovedPlan(job) {
  const { data: plan, error } = await db.from("agent_plans").select("*")
    .eq("id", job.plan_id).eq("user_id", job.user_id).eq("project_id", job.project_id)
    .eq("chat_id", job.chat_id).eq("status", "approved").single();
  if (error || !plan) throw new Error("Approved plan not found or ownership mismatch");
  const actual = sha256(canonical(plan.plan));
  if (actual !== plan.plan_hash) throw new Error("Approved plan hash mismatch; refusing execution");
  if (!plan.plan || plan.plan.execution?.requiresApproval !== true) throw new Error("Plan execution contract is not approved");
  return plan;
}
async function latestCheckpoint(job) {
  const { data, error } = await db.from("agent_job_checkpoints").select("*")
    .eq("job_id", job.id).order("sequence", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(`Checkpoint read failed: ${error.message}`);
  return data;
}
async function runOne(job) {
  const generation = job.lease_generation;
  let heartbeatLost = false;
  let heartbeatBusy = false;
  const beat = async () => {
    if (heartbeatBusy || stopping) return;
    heartbeatBusy = true;
    try {
      const ok = await rpc("heartbeat_agent_job_v2", {
        _job_id: job.id, _worker_id: workerId, _lease_generation: generation,
      });
      if (!ok) heartbeatLost = true;
    } catch { heartbeatLost = true; }
    finally { heartbeatBusy = false; }
  };
  const timer = setInterval(beat, heartbeatMs);
  timer.unref?.();
  let timedOut = false;
  const deadlineTimer = setTimeout(() => { timedOut = true; }, maxRuntimeMs);
  deadlineTimer.unref?.();
  let checkpointId = job.checkpoint_id ?? null;
  try {
    if (!executor) throw new Error("No executor configured. Set WLC_EXECUTOR_MODULE; job execution is fail-closed.");
    const plan = await loadApprovedPlan(job);
    const checkpoint = await latestCheckpoint(job);
    await emit(job, "worker.started", "Worker iniciou a tarefa", { workerId, leaseGeneration: generation, attempt: job.attempts });
    const context = {
      db, job, plan, checkpoint, workerId, leaseGeneration: generation,
      signal: { get aborted() { return stopping || heartbeatLost || timedOut; } },
      saveCheckpoint: async ({ sequence, stepId, state }) => {
        if (heartbeatLost || stopping || timedOut) throw new Error("Lease lost, timeout or worker stopping");
        const stateJson = canonical(state ?? {});
        const id = await rpc("save_agent_job_checkpoint", {
          _job_id: job.id, _worker_id: workerId, _lease_generation: generation,
          _sequence: sequence, _step_id: stepId, _state: state ?? {},
          _state_hash: sha256(stateJson),
        });
        checkpointId = id;
        await emit(job, "worker.checkpoint", "Checkpoint persistido", { sequence, stepId });
        return id;
      },
      assertLease: () => {
        if (heartbeatLost || stopping || timedOut) throw new Error("Lease lost, timeout or worker stopping");
      },
    };
    // Executor is trusted code and must cooperatively check signal.aborted /
    // assertLease around every side effect. We intentionally do not Promise.race:
    // that would detach an un-cancelled executor after the job is retried.
    const result = await executor(context);
    context.assertLease();
    const finished = await rpc("finish_agent_job_v2", {
      _job_id: job.id, _worker_id: workerId, _lease_generation: generation,
      _status: "completed", _last_error: null, _available_at: null, _checkpoint_id: checkpointId,
    });
    if (!finished) throw new Error("Lease fencing rejected completion; another worker owns the job");
    await emit(job, "worker.completed", "Tarefa concluída", { hasResult: result !== undefined }, "success");
  } catch (error) {
    const message = String(error?.message ?? error).slice(0, 3500);
    const retry = job.attempts < job.max_attempts && !stopping && !heartbeatLost;
    const delay = Math.min(15 * 60_000, 1000 * 2 ** Math.min(job.attempts, 10));
    const status = retry ? "retry_wait" : (stopping ? "cancelled" : "failed");
    const finished = await rpc("finish_agent_job_v2", {
      _job_id: job.id, _worker_id: workerId, _lease_generation: generation,
      _status: status, _last_error: message,
      _available_at: retry ? new Date(Date.now() + delay).toISOString() : null,
      _checkpoint_id: checkpointId,
    });
    if (finished) await emit(job, `worker.${status}`, retry ? "Tarefa agendada para nova tentativa" : "Tarefa encerrada", { error: message, delayMs: retry ? delay : 0 }, retry ? "warning" : "error");
    else console.error(`[${job.id}] lease lost; stale worker cannot change job state`);
  } finally {
    clearTimeout(deadlineTimer);
    clearInterval(timer);
  }
}
async function main() {
  executor = await loadExecutor();
  console.log(`[WLC Runtime] worker=${workerId} executor=${executor ? "configured" : "NOT CONFIGURED (fail-closed)"}`);
  while (!stopping) {
    try {
      const jobs = await rpc("claim_agent_job_v2", { _worker_id: workerId, _stale_seconds: staleSeconds });
      if (Array.isArray(jobs) && jobs.length) await runOne(jobs[0]);
      else await sleep(pollMs);
    } catch (error) {
      console.error("[WLC Runtime] polling error:", String(error?.message ?? error));
      await sleep(Math.min(30000, pollMs * 3));
    }
  }
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { stopping = true; });
main().catch((error) => { console.error(error); process.exitCode = 1; });
