/**
 * WLC Autonomous Orchestrator 2.0 — Core Controller (Stage 6 Alpha)
 *
 * Central controller of the Sovereign Builder software factory.
 * Transforms the existing autonomous development core into the orchestrator
 * of all engineering operations. Does not spawn processes.
 * Persistence and worker adapters are host responsibilities.
 * Stage 6: Requirement Compiler + Evidence Packages + Trusted Workspace contract.
 */

import {
  createSession,
  createTaskPlan,
  validateTaskGraph,
  checkpointSession,
  type DevelopmentSession,
  type DevTask,
} from "../wlc-autonomous-development-core";
import {
  type OrchestratorExecution,
  type OrchestratorPlan,
  type OrchestratorStatus,
  type OrchestratorTransition,
  type OrchestratorTask,
} from "./orchestrator.types";
import {
  assertTransition,
  canTransition,
  isTerminal,
  validatePlan,
  enforceNoExecutionWithoutPlan,
  enforceCompletionRequiresValidation,
  enforceResumeRequiresCheckpointIntegrity,
  createOrchestratorTask,
} from "./orchestrator.schemas";
import { compileRequirements, type CompiledRequirements } from "./requirement-compiler";
import {
  createEvidencePackage,
  fromValidationResults,
  assertEvidenceAllowsCompletion,
  type EvidencePackage,
} from "./evidence-package";

const now = () => new Date().toISOString();
const id = (prefix = "orc") =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function pushTransition(
  execution: OrchestratorExecution,
  to: OrchestratorStatus,
  reason: string,
  actor?: string,
): void {
  assertTransition(execution.status, to, reason);
  const transition: OrchestratorTransition = {
    from: execution.status,
    to,
    at: now(),
    reason,
    actor,
  };
  execution.transitions.push(transition);
  execution.status = to;
  execution.updatedAt = now();
}

/** Create a new execution in RECEIVED state. */
export function receiveRequest(goal: string, projectId?: string, workspacePath?: string): OrchestratorExecution {
  if (!goal?.trim()) throw new Error("goal is required");
  return {
    executionId: id("exec"),
    projectId,
    workspacePath,
    goal: goal.trim(),
    status: "RECEIVED",
    plan: null,
    session: null,
    transitions: [],
    checkpoints: [],
    validationResults: [],
    createdAt: now(),
    updatedAt: now(),
  };
}

/** Move RECEIVED → PLANNING and build a structured plan from the existing core. */
export function planExecution(
  execution: OrchestratorExecution,
  steps?: Array<{ title: string; description?: string; criteria?: string[] }>,
): OrchestratorExecution {
  if (execution.status !== "RECEIVED" && execution.status !== "PLANNING") {
    throw new Error(`Cannot plan from status ${execution.status}`);
  }
  if (execution.status === "RECEIVED") {
    pushTransition(execution, "PLANNING", "Iniciando planejamento estruturado");
  }

  const baseTasks = createTaskPlan(execution.goal, steps) as DevTask[];
  const graph = validateTaskGraph(baseTasks);
  if (!graph.valid) {
    pushTransition(execution, "FAILED", `Grafo de tarefas inválido: ${graph.errors.join("; ")}`);
    execution.error = graph.errors.join("; ");
    return execution;
  }

  const tasks: OrchestratorTask[] = baseTasks.map((t) =>
    createOrchestratorTask(t.id, t.title, t.description, t.dependsOn, t.acceptanceCriteria, true),
  );

  const plan: OrchestratorPlan = {
    planId: id("plan"),
    goal: execution.goal,
    tasks,
    dependenciesValid: true,
    createdAt: now(),
    acceptanceCriteria: tasks.flatMap((t) => t.acceptanceCriteria),
  };

  const planCheck = validatePlan(plan);
  if (!planCheck.valid) {
    pushTransition(execution, "FAILED", `Plano inválido: ${planCheck.errors.join("; ")}`);
    execution.error = planCheck.errors.join("; ");
    return execution;
  }

  execution.plan = plan;
  // Bridge to existing DevelopmentSession
  execution.session = createSession(execution.goal, baseTasks);
  // Stage 6: formalize requirements (deterministic)
  try {
    execution.compiledRequirements = compileRequirements(execution.goal);
  } catch (e) {
    // Non-fatal for planning; record in error if needed
    execution.error = (execution.error ? execution.error + "; " : "") + String((e as Error)?.message ?? e);
  }
  return execution;
}

/** After planning, either wait for approval or queue directly. */
export function requestApproval(execution: OrchestratorExecution, requiresApproval = true): OrchestratorExecution {
  const policy = enforceNoExecutionWithoutPlan(execution);
  if (!policy.allowed) {
    pushTransition(execution, "FAILED", policy.reason);
    execution.error = policy.reason;
    return execution;
  }
  if (requiresApproval) {
    execution.approvalToken = id("appr");
    pushTransition(execution, "WAITING_APPROVAL", "Aguardando autorização verificável");
  } else {
    pushTransition(execution, "QUEUED", "Plano aprovado automaticamente (não sensível)");
  }
  return execution;
}

export function approve(execution: OrchestratorExecution, actor?: string): OrchestratorExecution {
  if (execution.status !== "WAITING_APPROVAL") {
    throw new Error(`Cannot approve from ${execution.status}`);
  }
  if (!execution.approvalToken) {
    throw new Error("approvalToken ausente");
  }
  pushTransition(execution, "QUEUED", "Autorização concedida", actor);
  return execution;
}

export function startExecution(execution: OrchestratorExecution): OrchestratorExecution {
  if (execution.status !== "QUEUED") {
    throw new Error(`Cannot start from ${execution.status}`);
  }
  const policy = enforceNoExecutionWithoutPlan(execution);
  if (!policy.allowed) {
    pushTransition(execution, "FAILED", policy.reason);
    execution.error = policy.reason;
    return execution;
  }
  pushTransition(execution, "RUNNING", "Execução iniciada");
  if (execution.session) {
    execution.session.status = "implementing";
  }
  return execution;
}

export function enterValidation(execution: OrchestratorExecution): OrchestratorExecution {
  if (execution.status !== "RUNNING") {
    throw new Error(`Cannot validate from ${execution.status}`);
  }
  pushTransition(execution, "VALIDATING", "Entrando em validação com evidências");
  if (execution.session) {
    execution.session.status = "validating";
  }
  return execution;
}

export function completeFromValidation(execution: OrchestratorExecution): OrchestratorExecution {
  if (execution.status !== "VALIDATING") {
    throw new Error(`Cannot complete from ${execution.status}`);
  }
  const policy = enforceCompletionRequiresValidation(execution);
  if (!policy.allowed) {
    // Correctable error path: back to RUNNING for repair
    pushTransition(execution, "RUNNING", `Validação insuficiente: ${policy.reason}`);
    return execution;
  }

  // Stage 6: build mandatory evidence package
  const items = fromValidationResults(execution.validationResults);
  const pkg = createEvidencePackage(execution, items);
  execution.evidencePackage = pkg;

  try {
    assertEvidenceAllowsCompletion(pkg);
  } catch (e) {
    pushTransition(execution, "RUNNING", `Evidence package blocked completion: ${(e as Error).message}`);
    return execution;
  }

  pushTransition(execution, "COMPLETED", "Testes aprovados com evidências auditáveis");
  if (execution.session) {
    execution.session.status = "completed";
  }
  return execution;
}

export function fail(execution: OrchestratorExecution, error: string): OrchestratorExecution {
  if (isTerminal(execution.status)) return execution;
  if (canTransition(execution.status, "FAILED")) {
    pushTransition(execution, "FAILED", error);
    execution.error = error;
    if (execution.session) execution.session.status = "failed";
  }
  return execution;
}

export function cancel(execution: OrchestratorExecution, reason = "Cancelado pelo usuário"): OrchestratorExecution {
  if (isTerminal(execution.status)) return execution;
  if (canTransition(execution.status, "CANCELLED")) {
    pushTransition(execution, "CANCELLED", reason);
  }
  return execution;
}

export function pause(execution: OrchestratorExecution, reason: string): OrchestratorExecution {
  if (execution.status !== "RUNNING" && execution.status !== "VALIDATING") {
    throw new Error(`Cannot pause from ${execution.status}`);
  }
  // Create checkpoint before pause
  if (execution.session) {
    const cp = checkpointSession(execution.session, `Pause: ${reason}`);
    execution.checkpoints.push(cp);
  }
  pushTransition(execution, "PAUSED", reason);
  return execution;
}

export function resume(execution: OrchestratorExecution, checkpointId?: string): OrchestratorExecution {
  const policy = enforceResumeRequiresCheckpointIntegrity(execution, checkpointId);
  if (!policy.allowed) {
    throw new Error(policy.reason);
  }
  pushTransition(execution, "RUNNING", "Retomada após verificação de checkpoint");
  return execution;
}

/** Convenience: full happy-path from goal to QUEUED (no approval). */
export function createAndQueue(goal: string, projectId?: string, workspacePath?: string): OrchestratorExecution {
  let exec = receiveRequest(goal, projectId, workspacePath);
  exec = planExecution(exec);
  if (exec.status === "FAILED") return exec;
  exec = requestApproval(exec, false);
  return exec;
}

export function getReadyTasks(execution: OrchestratorExecution): OrchestratorTask[] {
  if (!execution.plan) return [];
  const completed = new Set(
    execution.plan.tasks.filter((t) => t.status === "completed").map((t) => t.id),
  );
  return execution.plan.tasks.filter(
    (t) => t.status === "queued" && t.dependsOn.every((d) => completed.has(d)),
  );
}

export { canTransition, isTerminal, validatePlan };
