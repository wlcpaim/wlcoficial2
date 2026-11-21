/**
 * WLC Sovereign Builder — Trusted Workspace Executor Contract (Stage 6)
 *
 * Isolation-first execution surface. This module defines the contract and
 * a safe adapter that uses the existing Docker sandbox (runtime/docker-sandbox.mjs).
 * It never claims success without real adapter evidence.
 *
 * Modes:
 * - validation-only: run typecheck/lint/test/build inside sandbox, no mutations
 * - full-development: allowlisted file mutations + validation (host still owns writes)
 */

import type { ValidationResult } from "../wlc-autonomous-development-core";
import type { EvidenceItem } from "./evidence-package";

export type ExecutorMode = "validation-only" | "full-development";

export type AllowlistedCommand =
  | "typecheck"
  | "lint"
  | "test"
  | "build"
  | "install"; // install is high-risk; host policy may forbid it

export type WorkspaceExecutorRequest = {
  workspacePath: string;
  mode: ExecutorMode;
  commands: AllowlistedCommand[];
  /** Absolute path to the docker-sandbox module or a compatible runner */
  sandboxRunner?: SandboxRunner;
  timeoutMs?: number;
};

export type SandboxResult = {
  exitCode: number | null;
  signal?: string | null;
  stdout: string;
  stderr: string;
  outputTruncated?: boolean;
  timedOut?: boolean;
  sandbox?: string;
};

export type SandboxRunner = (opts: {
  workspace: string;
  command: string;
  args?: string[];
  timeoutMs?: number;
}) => Promise<SandboxResult>;

export type WorkspaceExecutorReport = {
  mode: ExecutorMode;
  workspacePath: string;
  results: ValidationResult[];
  evidenceItems: EvidenceItem[];
  allPassed: boolean;
  sandboxUsed: boolean;
  notes: string[];
};

/** Map logical commands to container-absolute executables + args (Node/npm style). */
const COMMAND_MAP: Record<AllowlistedCommand, { command: string; args: string[] }> = {
  typecheck: { command: "/usr/local/bin/npx", args: ["tsc", "--noEmit"] },
  lint: { command: "/usr/local/bin/npx", args: ["eslint", "."] },
  test: { command: "/usr/local/bin/npx", args: ["vitest", "run"] },
  build: { command: "/usr/local/bin/npx", args: ["vite", "build"] },
  install: { command: "/usr/local/bin/npm", args: ["ci"] },
};

function toEvidenceKind(cmd: AllowlistedCommand): EvidenceItem["kind"] {
  if (cmd === "typecheck") return "typecheck";
  if (cmd === "lint") return "lint";
  if (cmd === "test") return "unit_test";
  if (cmd === "build") return "build";
  return "other";
}

/**
 * Run allowlisted validation commands inside the provided sandbox runner.
 * If no runner is supplied, returns explicit "unavailable" evidence (never fabricates success).
 */
export async function runTrustedWorkspaceValidation(
  req: WorkspaceExecutorRequest,
): Promise<WorkspaceExecutorReport> {
  const notes: string[] = [];
  const results: ValidationResult[] = [];
  const evidenceItems: EvidenceItem[] = [];
  const now = new Date().toISOString();

  if (!req.workspacePath?.trim()) {
    throw new Error("workspacePath is required");
  }
  if (!req.commands?.length) {
    throw new Error("At least one allowlisted command is required");
  }

  if (!req.sandboxRunner) {
    notes.push("No sandboxRunner provided — validation marked unavailable (truth over theater).");
    for (const cmd of req.commands) {
      results.push({
        kind: cmd === "test" ? "test" : (cmd as ValidationResult["kind"]),
        command: cmd,
        passed: false,
        summary: "Sandbox runner unavailable",
        details: "Host must inject IsolatedRunner / Docker sandbox before claiming validation.",
      });
      evidenceItems.push({
        kind: toEvidenceKind(cmd),
        name: cmd,
        passed: false,
        evidence: "Sandbox runner not configured; no execution performed.",
        capturedAt: now,
      });
    }
    return {
      mode: req.mode,
      workspacePath: req.workspacePath,
      results,
      evidenceItems,
      allPassed: false,
      sandboxUsed: false,
      notes,
    };
  }

  for (const cmd of [...new Set(req.commands)]) {
    const mapped = COMMAND_MAP[cmd];
    if (!mapped) {
      notes.push(`Command ${cmd} is not mapped; skipped.`);
      continue;
    }
    try {
      const raw = await req.sandboxRunner({
        workspace: req.workspacePath,
        command: mapped.command,
        args: mapped.args,
        timeoutMs: req.timeoutMs ?? 120_000,
      });
      const passed = raw.exitCode === 0 && !raw.timedOut;
      const evidence =
        `exit=${raw.exitCode}` +
        (raw.timedOut ? " timedOut=true" : "") +
        `\nstdout:\n${(raw.stdout || "").slice(0, 1500)}` +
        `\nstderr:\n${(raw.stderr || "").slice(0, 1500)}`;

      results.push({
        kind: cmd === "test" ? "test" : (cmd as ValidationResult["kind"]),
        command: `${mapped.command} ${mapped.args.join(" ")}`,
        passed,
        summary: passed ? `${cmd} passed` : `${cmd} failed (exit ${raw.exitCode})`,
        details: evidence,
      });
      evidenceItems.push({
        kind: toEvidenceKind(cmd),
        name: cmd,
        passed,
        exitCode: raw.exitCode ?? undefined,
        evidence,
        command: `${mapped.command} ${mapped.args.join(" ")}`,
        capturedAt: now,
        details: raw.sandbox,
      });
    } catch (err) {
      const message = String((err as Error)?.message ?? err);
      results.push({
        kind: cmd === "test" ? "test" : (cmd as ValidationResult["kind"]),
        command: cmd,
        passed: false,
        summary: "Sandbox execution error",
        details: message,
      });
      evidenceItems.push({
        kind: toEvidenceKind(cmd),
        name: cmd,
        passed: false,
        evidence: `Runner threw: ${message}`,
        capturedAt: now,
      });
    }
  }

  return {
    mode: req.mode,
    workspacePath: req.workspacePath,
    results,
    evidenceItems,
    allPassed: results.length > 0 && results.every((r) => r.passed),
    sandboxUsed: true,
    notes,
  };
}

/**
 * Policy helper: full-development mode still requires host-side path validation
 * and never writes outside the authorized workspace.
 */
export function assertFullDevelopmentAllowed(
  mode: ExecutorMode,
  hasApprovalToken: boolean,
): void {
  if (mode === "full-development" && !hasApprovalToken) {
    throw new Error(
      "full-development mode requires a verifiable approval token (high-risk mutations).",
    );
  }
}
