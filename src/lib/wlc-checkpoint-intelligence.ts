/**
 * WLC.IA Checkpoint Intelligence v1
 * Compact resume packages + validity check against real workspace signals.
 */

export const WLC_CHECKPOINT_INTELLIGENCE_VERSION = "1.0.0";

export type CheckpointPayload = {
  id: string;
  createdAt: string;
  projectId?: string;
  objective: string;
  architectureNotes?: string;
  planSummary: string[];
  completedTasks: string[];
  pendingTasks: string[];
  failures: string[];
  decisions: string[];
  evidenceSummary: string[];
  nextAction: string;
  blockers: string[];
  /** file path → content hash or sha */
  fileSignals?: Record<string, string>;
};

export type CheckpointValidation = {
  valid: boolean;
  reasons: string[];
  staleFiles: string[];
  missingFiles: string[];
};

export function createCheckpoint(partial: Omit<CheckpointPayload, "id" | "createdAt"> & { id?: string }): CheckpointPayload {
  return {
    id: partial.id ?? `cp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    projectId: partial.projectId,
    objective: partial.objective,
    architectureNotes: partial.architectureNotes,
    planSummary: partial.planSummary ?? [],
    completedTasks: partial.completedTasks ?? [],
    pendingTasks: partial.pendingTasks ?? [],
    failures: partial.failures ?? [],
    decisions: partial.decisions ?? [],
    evidenceSummary: partial.evidenceSummary ?? [],
    nextAction: partial.nextAction,
    blockers: partial.blockers ?? [],
    fileSignals: partial.fileSignals,
  };
}

/**
 * Validate checkpoint against current file signal map (path → sha/hash).
 * Does not touch disk itself — caller supplies currentSignals.
 */
export function validateCheckpoint(
  checkpoint: CheckpointPayload,
  currentSignals: Record<string, string>,
): CheckpointValidation {
  const reasons: string[] = [];
  const staleFiles: string[] = [];
  const missingFiles: string[] = [];
  const signals = checkpoint.fileSignals ?? {};
  for (const [path, sha] of Object.entries(signals)) {
    if (!(path in currentSignals)) {
      missingFiles.push(path);
    } else if (currentSignals[path] !== sha) {
      staleFiles.push(path);
    }
  }
  if (missingFiles.length) reasons.push(`${missingFiles.length} arquivo(s) do checkpoint ausentes no estado atual`);
  if (staleFiles.length) reasons.push(`${staleFiles.length} arquivo(s) alterados desde o checkpoint`);
  if (!checkpoint.nextAction?.trim()) reasons.push("Checkpoint sem nextAction explícita");
  return {
    valid: reasons.length === 0,
    reasons,
    staleFiles,
    missingFiles,
  };
}

export function formatCheckpointResume(checkpoint: CheckpointPayload, validation?: CheckpointValidation): string {
  return [
    `## Checkpoint Intelligence v${WLC_CHECKPOINT_INTELLIGENCE_VERSION}`,
    `- id: ${checkpoint.id}`,
    `- objective: ${checkpoint.objective.slice(0, 200)}`,
    `- completed: ${checkpoint.completedTasks.length} · pending: ${checkpoint.pendingTasks.length}`,
    `- next_action: ${checkpoint.nextAction}`,
    checkpoint.blockers.length ? `- blockers: ${checkpoint.blockers.join("; ")}` : "",
    validation
      ? `- validity: ${validation.valid ? "VALID" : "STALE/INVALID"} ${validation.reasons.join("; ")}`
      : "- validity: not checked yet — verificar estado real do repositório antes de continuar",
    "- Ao retomar: não repetir completedTasks; reconciliar pending com árvore atual; avançar só next_action.",
  ]
    .filter(Boolean)
    .join("\n");
}
