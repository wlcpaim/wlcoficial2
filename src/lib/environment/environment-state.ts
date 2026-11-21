/**
 * Execution State Manager for per-repository environments. Every transition is
 * validated, timestamped and recorded so a run is traceable and resumable.
 */
export const ENV_STATES = ["queued", "analyzing", "planning", "provisioning", "installing", "configuring", "building", "testing", "starting", "preview_ready", "deploying", "deployed", "failed", "stopped"] as const;
export type EnvState = (typeof ENV_STATES)[number];

const PIPELINE: EnvState[] = ["queued", "analyzing", "planning", "provisioning", "installing", "configuring", "building", "testing", "starting", "preview_ready"];

export const ENV_TRANSITIONS: Record<EnvState, readonly EnvState[]> = {
  queued: ["analyzing", "stopped"],
  analyzing: ["planning", "failed", "stopped"],
  planning: ["provisioning", "failed", "stopped"],
  provisioning: ["installing", "failed", "stopped"],
  installing: ["configuring", "failed", "stopped"],
  configuring: ["building", "starting", "failed", "stopped"],
  building: ["testing", "starting", "failed", "stopped"],
  testing: ["starting", "failed", "stopped"],
  starting: ["preview_ready", "failed", "stopped"],
  preview_ready: ["installing", "building", "testing", "starting", "deploying", "stopped"],
  deploying: ["deployed", "failed"],
  deployed: ["deploying", "building", "stopped"],
  failed: ["queued", "provisioning", "installing", "building", "starting", "stopped"],
  stopped: ["queued"],
};

export type StepRecord = { state: EnvState; startedAt: string; endedAt: string | null; ok: boolean | null; detail: string | null; error: string | null };
export type EnvRun = { environmentId: string; state: EnvState; steps: StepRecord[]; attempts: Partial<Record<EnvState, number>> };

export class InvalidTransitionError extends Error {
  constructor(public from: EnvState, public to: EnvState) { super(`Transição inválida: ${from} → ${to}`); }
}

export function canTransition(from: EnvState, to: EnvState): boolean {
  return ENV_TRANSITIONS[from].includes(to);
}

export function createRun(environmentId: string, now: string): EnvRun {
  return { environmentId, state: "queued", steps: [{ state: "queued", startedAt: now, endedAt: null, ok: null, detail: null, error: null }], attempts: { queued: 1 } };
}

/** Closes the current step with its outcome and opens the next one. */
export function transition(run: EnvRun, to: EnvState, now: string, outcome: { ok?: boolean; detail?: string; error?: string } = {}): EnvRun {
  if (!canTransition(run.state, to)) throw new InvalidTransitionError(run.state, to);
  const steps = run.steps.map((s, i) => i === run.steps.length - 1 && s.endedAt === null
    ? { ...s, endedAt: now, ok: outcome.ok ?? to !== "failed", detail: outcome.detail ?? s.detail, error: outcome.error ?? (to === "failed" ? "sem detalhe" : null) }
    : s);
  steps.push({ state: to, startedAt: now, endedAt: null, ok: null, detail: null, error: null });
  return { ...run, state: to, steps, attempts: { ...run.attempts, [to]: (run.attempts[to] ?? 0) + 1 } };
}

/** Step to resume from after a failure: the last pipeline step that failed, never re-doing finished ones. */
export function resumePoint(run: EnvRun): EnvState | null {
  if (run.state !== "failed") return null;
  const failed = [...run.steps].reverse().find((s) => s.state !== "failed" && s.ok === false);
  if (!failed) return "queued";
  const allowed = ENV_TRANSITIONS.failed;
  if (allowed.includes(failed.state)) return failed.state;
  const idx = PIPELINE.indexOf(failed.state);
  for (let i = idx; i >= 0; i--) { const s = PIPELINE[i]!; if (allowed.includes(s)) return s; }
  return "queued";
}

export function isPreviewAvailable(run: EnvRun): boolean {
  return run.state === "preview_ready" || run.state === "deploying" || run.state === "deployed";
}
