import { describe, it, expect } from "vitest";
import { PROJECT_PRESETS, getPreset, presetContextLines } from "@/lib/project-presets";
import { isSessionActive, LOCK_STALE_SECONDS } from "@/lib/agent-lock";
import { buildCompletionReport } from "@/lib/completion-report";
import { validateRepoName, suggestRepoName } from "@/lib/repo-name";

describe("project presets", () => {
  it("offers exactly the five requested presets", () => {
    expect(PROJECT_PRESETS.map((p) => p.label)).toEqual(["Empty", "Loja Virtual", "Blog", "Fórum", "Notícia"]);
  });
  it("Empty adds no context; others add guidance", () => {
    expect(presetContextLines("empty")).toEqual([]);
    expect(presetContextLines("forum")[0]).toContain("Fórum");
  });
  it("unknown preset falls back to Empty", () => { expect(getPreset("xyz").id).toBe("empty"); });
});

describe("agent lock", () => {
  const now = Date.parse("2026-01-01T00:10:00Z");
  it("running with fresh heartbeat blocks", () => {
    expect(isSessionActive({ status: "running", heartbeat_at: new Date(now - 10_000).toISOString() }, now)).toBe(true);
  });
  it("running with heartbeat older than the stale window is abandoned", () => {
    expect(isSessionActive({ status: "running", heartbeat_at: new Date(now - (LOCK_STALE_SECONDS + 1) * 1000).toISOString() }, now)).toBe(false);
  });
  it("idle or error sessions never block", () => {
    expect(isSessionActive({ status: "idle", heartbeat_at: new Date(now).toISOString() }, now)).toBe(false);
    expect(isSessionActive({ status: "error", heartbeat_at: new Date(now).toISOString() }, now)).toBe(false);
  });
});

describe("completion report", () => {
  it("reports success only when every write is verified", () => {
    const r = buildCompletionReport([{ tool: "write_file", ok: true, verified: true, summary: "Criou a.ts", path: "a.ts", commit_sha: "abc1234", commit_url: "u" }], { durationMs: 1200 });
    expect(r.status).toBe("success");
    expect(r.files).toEqual(["a.ts"]);
    expect(r.commits).toEqual([{ sha: "abc1234", url: "u" }]);
  });
  it("a failed verification is never success", () => {
    const r = buildCompletionReport([{ tool: "write_file", ok: false, verified: false, summary: "Modificou a.ts (verificação falhou)", path: "a.ts", commit_sha: "abc" }], { durationMs: 10 });
    expect(r.status).toBe("partial");
    expect(r.issues.length).toBeGreaterThan(0);
  });
  it("delete requests are pending approval, not modified files", () => {
    const r = buildCompletionReport([{ tool: "delete_file", ok: true, summary: "Pediu aprovação", path: "b.ts" }], { durationMs: 10 });
    expect(r.files).toEqual([]);
    expect(r.pending).toHaveLength(1);
  });
  it("errors and pauses are reported as such", () => {
    expect(buildCompletionReport([], { error: "boom", durationMs: 1 }).status).toBe("error");
    expect(buildCompletionReport([], { paused: true, pauseReason: "cota", durationMs: 1 }).status).toBe("paused");
    expect(buildCompletionReport([], { durationMs: 1 }).status).toBe("answered");
  });
});

describe("repository name", () => {
  it("accepts valid names and rejects invalid ones", () => {
    expect(validateRepoName("meu-app_2.0")).toBeNull();
    expect(validateRepoName("meu app")).not.toBeNull();
    expect(validateRepoName("")).not.toBeNull();
    expect(validateRepoName("repo.git")).not.toBeNull();
  });
  it("suggests a valid name from free text", () => { expect(suggestRepoName("  Meu Projeto Ção! ")).toBe("meu-projeto-cao"); });
});
