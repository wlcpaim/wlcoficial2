/**
 * WLC.IA Task State Machine v1
 * Deterministic lifecycle for engineering tasks. Complements OrchestratorStatus
 * with finer-grained cognitive phases required by Autonomous Engineering Intelligence Core.
 */

export const WLC_TASK_STATE_MACHINE_VERSION = "1.0.0";

export type TaskLifecycleState =
  | "CREATED"
  | "UNDERSTANDING"
  | "ANALYZING"
  | "PLANNING"
  | "READY"
  | "EXECUTING"
  | "VERIFYING"
  | "REVIEWING"
  | "CORRECTING"
  | "COMPLETED"
  | "BLOCKED"
  | "FAILED"
  | "CANCELLED";

export const TASK_ALLOWED_TRANSITIONS: Record<TaskLifecycleState, readonly TaskLifecycleState[]> = {
  CREATED: ["UNDERSTANDING", "CANCELLED"],
  UNDERSTANDING: ["ANALYZING", "PLANNING", "BLOCKED", "CANCELLED"],
  ANALYZING: ["PLANNING", "READY", "BLOCKED", "CANCELLED"],
  PLANNING: ["READY", "ANALYZING", "BLOCKED", "CANCELLED"],
  READY: ["EXECUTING", "CANCELLED"],
  EXECUTING: ["VERIFYING", "CORRECTING", "BLOCKED", "FAILED", "CANCELLED"],
  VERIFYING: ["REVIEWING", "CORRECTING", "COMPLETED", "FAILED", "BLOCKED"],
  REVIEWING: ["COMPLETED", "CORRECTING", "FAILED"],
  CORRECTING: ["EXECUTING", "VERIFYING", "FAILED", "BLOCKED"],
  COMPLETED: [],
  BLOCKED: ["READY", "PLANNING", "CANCELLED", "FAILED"],
  FAILED: ["PLANNING", "CANCELLED"],
  CANCELLED: [],
} as const;

export type TaskTransitionRecord = {
  from: TaskLifecycleState;
  to: TaskLifecycleState;
  at: string;
  reason: string;
  actor?: string;
};

export type TaskRuntime = {
  taskId: string;
  objective: string;
  projectId?: string;
  state: TaskLifecycleState;
  currentStep?: string;
  completedSteps: string[];
  failedSteps: string[];
  transitions: TaskTransitionRecord[];
  terminationReason?: string;
  updatedAt: string;
};

export function canTransition(from: TaskLifecycleState, to: TaskLifecycleState): boolean {
  return (TASK_ALLOWED_TRANSITIONS[from] as readonly string[]).includes(to);
}

export function transitionTask(
  runtime: TaskRuntime,
  to: TaskLifecycleState,
  reason: string,
  actor = "system",
): { ok: true; runtime: TaskRuntime } | { ok: false; error: string } {
  if (!canTransition(runtime.state, to)) {
    return {
      ok: false,
      error: `Transição inválida: ${runtime.state} → ${to}. Permitidas: ${TASK_ALLOWED_TRANSITIONS[runtime.state].join(", ") || "(terminal)"}`,
    };
  }
  // Guardrails from the engineering core spec
  if (to === "EXECUTING" && runtime.state === "READY" && runtime.completedSteps.length === 0 && !runtime.currentStep) {
    // Allow first execution from READY without prior steps — planner may set currentStep
  }
  if (to === "COMPLETED") {
    if (runtime.state === "EXECUTING") {
      return { ok: false, error: "Não é permitido COMPLETED direto de EXECUTING sem VERIFYING/REVIEWING." };
    }
  }
  const at = new Date().toISOString();
  const next: TaskRuntime = {
    ...runtime,
    state: to,
    updatedAt: at,
    transitions: [...runtime.transitions, { from: runtime.state, to, at, reason, actor }],
    terminationReason: to === "COMPLETED" || to === "FAILED" || to === "CANCELLED" ? reason : runtime.terminationReason,
  };
  return { ok: true, runtime: next };
}

export function createTaskRuntime(objective: string, projectId?: string): TaskRuntime {
  const taskId = `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    taskId,
    objective: objective.slice(0, 2000),
    projectId,
    state: "CREATED",
    completedSteps: [],
    failedSteps: [],
    transitions: [],
    updatedAt: new Date().toISOString(),
  };
}

/** Detect oscillation between the same two states (loop). */
export function detectStateOscillation(runtime: TaskRuntime, window = 8): boolean {
  const recent = runtime.transitions.slice(-window);
  if (recent.length < 6) return false;
  const pairs = recent.map((t) => `${t.from}>${t.to}`);
  const counts = new Map<string, number>();
  for (const p of pairs) counts.set(p, (counts.get(p) ?? 0) + 1);
  return [...counts.values()].some((c) => c >= 3);
}

export function formatTaskStateMachineContext(runtime: TaskRuntime): string {
  return [
    `## Task State Machine v${WLC_TASK_STATE_MACHINE_VERSION}`,
    `- task_id: ${runtime.taskId}`,
    `- state: ${runtime.state}`,
    `- objective: ${runtime.objective.slice(0, 240)}`,
    `- current_step: ${runtime.currentStep ?? "(none)"}`,
    `- completed_steps: ${runtime.completedSteps.length}`,
    `- failed_steps: ${runtime.failedSteps.length}`,
    `- transitions: ${runtime.transitions.length}`,
    runtime.terminationReason ? `- termination: ${runtime.terminationReason}` : "",
    detectStateOscillation(runtime) ? "- ⚠ Oscilação de estados detectada — replanejar ou mudar estratégia." : "",
  ]
    .filter(Boolean)
    .join("\n");
}
