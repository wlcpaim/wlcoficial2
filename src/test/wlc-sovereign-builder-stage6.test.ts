import { describe, expect, it } from "vitest";
import { compileRequirements, formatCompiledRequirements } from "../lib/orchestrator/requirement-compiler";
import {
  createEvidencePackage,
  fromValidationResults,
  assertEvidenceAllowsCompletion,
} from "../lib/orchestrator/evidence-package";
import { runTrustedWorkspaceValidation, assertFullDevelopmentAllowed } from "../lib/orchestrator/trusted-workspace-executor";
import { createAndQueue, planExecution, receiveRequest } from "../lib/orchestrator/orchestrator.server";
import type { OrchestratorExecution } from "../lib/orchestrator/orchestrator.types";

describe("Stage 6 — Requirement Compiler", () => {
  it("compiles a SaaS request with auth and tenancy risk", () => {
    const compiled = compileRequirements(
      "Crie um SaaS multi-tenant de gerenciamento de tarefas com login, dashboard e banco de dados",
    );
    expect(compiled.capabilities).toEqual(expect.arrayContaining(["saas", "auth", "tenancy", "supabase"]));
    expect(compiled.overallRisk === "high" || compiled.overallRisk === "critical").toBe(true);
    expect(compiled.requiresHumanApproval).toBe(true);
    expect(compiled.requirements.length).toBeGreaterThan(3);
    expect(compiled.suggestedStack).toContain("Supabase (Auth + Postgres + RLS)");
    const text = formatCompiledRequirements(compiled);
    expect(text).toMatch(/REQ-001/);
  });

  it("keeps simple website requests lower risk", () => {
    const compiled = compileRequirements("Faça uma landing page responsiva para um produto");
    expect(compiled.capabilities).toContain("website");
    expect(compiled.overallRisk).toBe("low");
    expect(compiled.requiresHumanApproval).toBe(false);
  });

  it("rejects empty request", () => {
    expect(() => compileRequirements("   ")).toThrow();
  });
});

describe("Stage 6 — Evidence Package", () => {
  it("blocks completion without required kinds and evidence", () => {
    const exec = createAndQueue("test") as OrchestratorExecution;
    const weak = fromValidationResults([
      { kind: "test", passed: true, summary: "ok", details: "" },
    ]);
    const pkg = createEvidencePackage(exec, weak);
    expect(pkg.overallPassed).toBe(false);
    expect(pkg.missingRequired.length).toBeGreaterThan(0);
    expect(() => assertEvidenceAllowsCompletion(pkg)).toThrow();
  });

  it("allows completion with full evidence", () => {
    const exec = createAndQueue("test") as OrchestratorExecution;
    const items = fromValidationResults([
      { kind: "typecheck", passed: true, summary: "ok", details: "tsc exit 0" },
      { kind: "test", passed: true, summary: "ok", details: "6 passed" },
      { kind: "build", passed: true, summary: "ok", details: "build success" },
    ]);
    const pkg = createEvidencePackage(exec, items);
    expect(pkg.overallPassed).toBe(true);
    expect(() => assertEvidenceAllowsCompletion(pkg)).not.toThrow();
  });
});

describe("Stage 6 — Trusted Workspace Executor", () => {
  it("reports unavailable when no sandbox runner is injected (truth over theater)", async () => {
    const report = await runTrustedWorkspaceValidation({
      workspacePath: "/tmp/project",
      mode: "validation-only",
      commands: ["typecheck", "test"],
    });
    expect(report.sandboxUsed).toBe(false);
    expect(report.allPassed).toBe(false);
    expect(report.notes.join(" ")).toMatch(/unavailable/i);
  });

  it("uses injected sandbox runner and records evidence", async () => {
    const report = await runTrustedWorkspaceValidation({
      workspacePath: "/tmp/project",
      mode: "validation-only",
      commands: ["test"],
      sandboxRunner: async () => ({
        exitCode: 0,
        stdout: "✓ 4 tests passed",
        stderr: "",
        sandbox: "docker-network-none-readonly-root",
      }),
    });
    expect(report.sandboxUsed).toBe(true);
    expect(report.allPassed).toBe(true);
    expect(report.evidenceItems[0]!.evidence).toMatch(/4 tests passed/);
  });

  it("requires approval token for full-development mode", () => {
    expect(() => assertFullDevelopmentAllowed("full-development", false)).toThrow(/approval/i);
    expect(() => assertFullDevelopmentAllowed("full-development", true)).not.toThrow();
  });
});

describe("Stage 6 — Orchestrator integration", () => {
  it("attaches compiled requirements during planning", () => {
    let exec = receiveRequest("Crie um sistema de tarefas com login e dashboard");
    exec = planExecution(exec);
    expect(exec.compiledRequirements).toBeTruthy();
    expect(exec.compiledRequirements!.capabilities.length).toBeGreaterThan(0);
  });
});
