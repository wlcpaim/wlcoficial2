/**
 * WLC Sovereign Builder — Evidence Package (Stage 6)
 *
 * Mandatory, auditable record of what was actually verified.
 * Agents must not claim success without a corresponding EvidencePackage entry.
 */

import type { ValidationResult } from "../wlc-autonomous-development-core";
import type { OrchestratorExecution } from "./orchestrator.types";

export type EvidenceKind =
  | "typecheck"
  | "lint"
  | "unit_test"
  | "build"
  | "e2e"
  | "browser_acceptance"
  | "security_scan"
  | "manual_review"
  | "diff_review"
  | "deploy_preview"
  | "other";

export type EvidenceItem = {
  kind: EvidenceKind;
  name: string;
  passed: boolean;
  exitCode?: number;
  /** Non-empty proof: command output excerpt, screenshot hash, diff summary, etc. */
  evidence: string;
  command?: string;
  durationMs?: number;
  capturedAt: string;
  details?: string;
};

export type EvidencePackage = {
  packageId: string;
  executionId: string;
  goal: string;
  items: EvidenceItem[];
  overallPassed: boolean;
  missingRequired: string[];
  createdAt: string;
  notes?: string;
};

const REQUIRED_FOR_COMPLETION: EvidenceKind[] = ["typecheck", "unit_test", "build"];

export function createEvidencePackage(
  execution: OrchestratorExecution,
  items: EvidenceItem[],
  notes?: string,
): EvidencePackage {
  const required = [...REQUIRED_FOR_COMPLETION];
  const presentKinds = new Set(items.filter((i) => i.passed).map((i) => i.kind));
  const missingRequired = required.filter((k) => !presentKinds.has(k));
  const overallPassed =
    items.length > 0 &&
    items.every((i) => i.passed) &&
    missingRequired.length === 0 &&
    items.every((i) => (i.evidence?.trim()?.length ?? 0) > 0);

  return {
    packageId: `evp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    executionId: execution.executionId,
    goal: execution.goal,
    items,
    overallPassed,
    missingRequired,
    createdAt: new Date().toISOString(),
    notes,
  };
}

/** Convert legacy ValidationResult[] into EvidenceItems (best-effort). */
export function fromValidationResults(results: ValidationResult[]): EvidenceItem[] {
  const now = new Date().toISOString();
  return results.map((r) => {
    let kind: EvidenceKind = "other";
    if (r.kind === "test") kind = "unit_test";
    else if (r.kind === "typecheck") kind = "typecheck";
    else if (r.kind === "lint") kind = "lint";
    else if (r.kind === "build") kind = "build";
    else if (r.kind === "security") kind = "security_scan";
    else if (r.kind === "manual") kind = "manual_review";

    return {
      kind,
      name: r.kind,
      passed: r.passed,
      evidence: r.details?.trim() || r.summary || "",
      command: r.command,
      capturedAt: now,
      details: r.summary,
    };
  });
}

export function assertEvidenceAllowsCompletion(pkg: EvidencePackage): void {
  if (!pkg.overallPassed) {
    const reasons = [
      pkg.missingRequired.length ? `missing required: ${pkg.missingRequired.join(", ")}` : null,
      pkg.items.some((i) => !i.passed) ? "one or more checks failed" : null,
      pkg.items.some((i) => !i.evidence?.trim()) ? "empty evidence" : null,
    ].filter(Boolean);
    throw new Error(`Evidence package does not allow completion: ${reasons.join("; ")}`);
  }
}

export function formatEvidencePackage(pkg: EvidencePackage): string {
  const lines = [
    `## Evidence Package ${pkg.packageId}`,
    `Execution: ${pkg.executionId}`,
    `Overall: ${pkg.overallPassed ? "PASSED" : "NOT PASSED"}`,
  ];
  if (pkg.missingRequired.length) {
    lines.push(`Missing required: ${pkg.missingRequired.join(", ")}`);
  }
  for (const item of pkg.items) {
    lines.push(
      `- [${item.passed ? "PASS" : "FAIL"}] ${item.kind}/${item.name}` +
        (item.exitCode !== undefined ? ` (exit ${item.exitCode})` : "") +
        `: ${item.evidence.slice(0, 200)}`,
    );
  }
  if (pkg.notes) lines.push(`Notes: ${pkg.notes}`);
  return lines.join("\n");
}
