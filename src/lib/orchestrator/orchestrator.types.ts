/**
 * WLC Autonomous Orchestrator 2.0 — Core Types (Alpha)
 *
 * Central controller types for engineering operations.
 * Builds on wlc-autonomous-development-core without replacing it.
 * All state transitions must be validated server-side.
 */

import type { DevTask, ValidationResult, Checkpoint, DevelopmentSession } from "../wlc-autonomous-development-core";

/** Execution lifecycle states — every transition is validated. */
export type OrchestratorStatus =
  | "RECEIVED"
  | "PLANNING"
  | "WAITING_APPROVAL"
  | "QUEUED"
  | "RUNNING"
  | "VALIDATING"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

/** Allowed transitions. Invalid transitions are blocked. */
export const ALLOWED_TRANSITIONS: Record<OrchestratorStatus, readonly OrchestratorStatus[]> = {
  RECEIVED: ["PLANNING", "CANCELLED"],
  PLANNING: ["WAITING_APPROVAL", "QUEUED", "FAILED", "CANCELLED"],
  WAITING_APPROVAL: ["QUEUED", "CANCELLED", "FAILED"],
  QUEUED: ["RUNNING", "CANCELLED"],
  RUNNING: ["VALIDATING", "PAUSED", "FAILED", "CANCELLED"],
  VALIDATING: ["RUNNING", "COMPLETED", "FAILED", "PAUSED"],
  PAUSED: ["RUNNING", "CANCELLED", "FAILED"],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
} as const;

export type OrchestratorTransition = {
  from: OrchestratorStatus;
  to: OrchestratorStatus;
  at: string;
  reason: string;
  actor?: string;
};

export type OrchestratorTask = DevTask & {
  /** Optional worker assignment */
  workerId?: string;
  /** Evidence required before completion */
  evidenceRequired: boolean;
};

export type OrchestratorPlan = {
  planId: string;
  goal: string;
  tasks: OrchestratorTask[];
  dependenciesValid: boolean;
  createdAt: string;
  acceptanceCriteria: string[];
};

export type OrchestratorExecution = {
  executionId: string;
  projectId?: string;
  workspacePath?: string;
  goal: string;
  status: OrchestratorStatus;
  plan: OrchestratorPlan | null;
  session: DevelopmentSession | null;
  transitions: OrchestratorTransition[];
  checkpoints: Checkpoint<unknown>[];
  validationResults: ValidationResult[];
  /** Stage 6: formalized requirements from Requirement Compiler */
  compiledRequirements?: import("./requirement-compiler").CompiledRequirements;
  /** Stage 6: mandatory evidence package for completion */
  evidencePackage?: import("./evidence-package").EvidencePackage;
  approvalToken?: string;
  createdAt: string;
  updatedAt: string;
  error?: string;
};

export type PolicyDecision = {
  allowed: boolean;
  reason: string;
  requiresApproval: boolean;
  sensitive: boolean;
};

export type WorkerDescriptor = {
  workerId: string;
  kind: "local" | "isolated" | "remote";
  capabilities: string[];
};

export type OrchestratorEvent =
  | { type: "RECEIVED"; goal: string; projectId?: string }
  | { type: "PLAN_CREATED"; plan: OrchestratorPlan }
  | { type: "APPROVAL_REQUESTED"; approvalToken: string }
  | { type: "APPROVED"; actor?: string }
  | { type: "STARTED" }
  | { type: "TASK_COMPLETED"; taskId: string }
  | { type: "VALIDATION_PASSED" }
  | { type: "VALIDATION_FAILED"; results: ValidationResult[] }
  | { type: "PAUSED"; reason: string }
  | { type: "RESUMED" }
  | { type: "FAILED"; error: string }
  | { type: "CANCELLED"; reason?: string }
  | { type: "COMPLETED" };
