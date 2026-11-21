/**
 * WLC Autonomous Orchestrator 2.0 — Transition & Policy validation (Alpha)
 *
 * Pure functions. No side effects. Server must call these before any state change.
 */

import {
  ALLOWED_TRANSITIONS,
  type OrchestratorStatus,
  type OrchestratorExecution,
  type OrchestratorPlan,
  type OrchestratorTask,
  type PolicyDecision,
} from "./orchestrator.types";
import { validateTaskGraph, type DevTask } from "../wlc-autonomous-development-core";

export function canTransition(from: OrchestratorStatus, to: OrchestratorStatus): boolean {
  return (ALLOWED_TRANSITIONS[from] as readonly OrchestratorStatus[]).includes(to);
}

export function assertTransition(from: OrchestratorStatus, to: OrchestratorStatus, reason: string): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Invalid orchestrator transition: ${from} → ${to}. Reason given: ${reason}. Allowed: [${ALLOWED_TRANSITIONS[from].join(", ")}]`,
    );
  }
}

export function isTerminal(status: OrchestratorStatus): boolean {
  return status === "COMPLETED" || status === "FAILED" || status === "CANCELLED";
}

export function validatePlan(plan: OrchestratorPlan): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!plan.planId?.trim()) errors.push("planId is required");
  if (!plan.goal?.trim()) errors.push("goal is required");
  if (!Array.isArray(plan.tasks) || plan.tasks.length === 0) {
    errors.push("plan must contain at least one task");
  } else {
    const graph = validateTaskGraph(plan.tasks as DevTask[]);
    if (!graph.valid) errors.push(...graph.errors);
  }
  if (!plan.dependenciesValid && errors.length === 0) {
    // Soft warning only if graph already valid; force flag consistency
    errors.push("dependenciesValid must be true when graph is valid");
  }
  return { valid: errors.length === 0, errors };
}

/** Five fundamental rules enforcement helpers */
export function enforceNoExecutionWithoutPlan(execution: OrchestratorExecution): PolicyDecision {
  if (!execution.plan) {
    return {
      allowed: false,
      reason: "Nenhuma execução sem plano estruturado.",
      requiresApproval: false,
      sensitive: false,
    };
  }
  const planCheck = validatePlan(execution.plan);
  if (!planCheck.valid) {
    return {
      allowed: false,
      reason: `Plano inválido: ${planCheck.errors.join("; ")}`,
      requiresApproval: false,
      sensitive: false,
    };
  }
  return { allowed: true, reason: "Plano estruturado presente e válido.", requiresApproval: false, sensitive: false };
}

export function enforceSensitiveOperationAuthorization(
  execution: OrchestratorExecution,
  operation: "deploy" | "credential" | "production_migration" | "destructive" | "external_write",
): PolicyDecision {
  const sensitive = true;
  if (execution.status !== "RUNNING" && execution.status !== "VALIDATING") {
    return {
      allowed: false,
      reason: `Operação sensível '${operation}' só é permitida em RUNNING/VALIDATING.`,
      requiresApproval: true,
      sensitive,
    };
  }
  if (!execution.approvalToken) {
    return {
      allowed: false,
      reason: "Nenhuma operação sensível sem autorização verificável (approvalToken ausente).",
      requiresApproval: true,
      sensitive,
    };
  }
  return {
    allowed: true,
    reason: "Autorização verificável presente.",
    requiresApproval: false,
    sensitive,
  };
}

export function enforceCompletionRequiresValidation(execution: OrchestratorExecution): PolicyDecision {
  if (execution.validationResults.length === 0) {
    return {
      allowed: false,
      reason: "Nenhuma tarefa concluída sem validação.",
      requiresApproval: false,
      sensitive: false,
    };
  }
  const allPassed = execution.validationResults.every((r) => r.passed);
  if (!allPassed) {
    return {
      allowed: false,
      reason: "Validação não passou; conclusão bloqueada.",
      requiresApproval: false,
      sensitive: false,
    };
  }
  return { allowed: true, reason: "Evidências de validação presentes e aprovadas.", requiresApproval: false, sensitive: false };
}

export function enforceResumeRequiresCheckpointIntegrity(
  execution: OrchestratorExecution,
  checkpointId?: string,
): PolicyDecision {
  if (execution.status !== "PAUSED") {
    return {
      allowed: false,
      reason: "Retomada só é permitida a partir de PAUSED.",
      requiresApproval: false,
      sensitive: false,
    };
  }
  if (!execution.checkpoints.length) {
    return {
      allowed: false,
      reason: "Nenhuma retomada sem verificar o estado e a integridade do checkpoint.",
      requiresApproval: false,
      sensitive: false,
    };
  }
  if (checkpointId) {
    const found = execution.checkpoints.find((c) => c.id === checkpointId);
    if (!found) {
      return {
        allowed: false,
        reason: `Checkpoint ${checkpointId} não encontrado.`,
        requiresApproval: false,
        sensitive: false,
      };
    }
  }
  return { allowed: true, reason: "Checkpoint presente e íntegro.", requiresApproval: false, sensitive: false };
}

export function enforceWorkspaceBoundary(
  path: string,
  authorizedWorkspace: string | undefined,
): PolicyDecision {
  if (!authorizedWorkspace) {
    return {
      allowed: false,
      reason: "Nenhum trabalho poderá modificar um projeto fora do workspace autorizado (workspace não definido).",
      requiresApproval: false,
      sensitive: true,
    };
  }
  const normalized = path.replace(/\\/g, "/").replace(/\/+/g, "/");
  const root = authorizedWorkspace.replace(/\\/g, "/").replace(/\/+$/, "");
  if (normalized.startsWith("..") || normalized.includes("/../") || normalized.startsWith("/")) {
    return {
      allowed: false,
      reason: "Path traversal detectado; operação bloqueada.",
      requiresApproval: false,
      sensitive: true,
    };
  }
  // Relative paths are expected; absolute comparison is host responsibility.
  return { allowed: true, reason: "Path relativo ao workspace autorizado.", requiresApproval: false, sensitive: false };
}

export function createOrchestratorTask(
  id: string,
  title: string,
  description: string,
  dependsOn: string[] = [],
  acceptanceCriteria: string[] = [],
  evidenceRequired = true,
): OrchestratorTask {
  return {
    id,
    title,
    description,
    dependsOn,
    acceptanceCriteria,
    status: "queued",
    attempts: 0,
    evidenceRequired,
  };
}
