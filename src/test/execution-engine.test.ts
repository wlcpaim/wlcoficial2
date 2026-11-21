import { describe, it, expect } from "vitest";
import { OperationLedger, classifyError, enrichFailure, normalizeRepoPath, honestStatus, guardClaims, reconcileCheckpoint } from "@/lib/execution-engine";

const missing = JSON.stringify({ error: "Arquivo não existe", path: "src/js/app.js" });

describe("execution engine regressions", () => {
  it("1: stops re-reading a missing file and suggests the real path", () => {
    const l = new OperationLedger();
    for (let i = 0; i < 2; i++) { const op = l.start("read_file", { path: "src/js/app.js" }); l.finish(op, missing); }
    expect(l.guard("read_file", { path: "./src/js//app.js" })).toMatch(/anti-loop/);
    const out = JSON.parse(enrichFailure(missing, "read_file", "src/js/app.js", ["js/app.js", "index.html"]));
    expect(out.error_kind).toBe("not_found");
    expect(out.did_you_mean).toEqual(["js/app.js"]);
  });
  it("2: classifies GitHub 422 missing sha as sha_conflict", () => {
    expect(classifyError("422 Invalid request: sha wasn't supplied")).toBe("sha_conflict");
  });
  it("3: a failing tool is recorded as failed with a kind", () => {
    const l = new OperationLedger();
    const op = l.finish(l.start("write_file", { path: "a.js" }), JSON.stringify({ error: "timeout" }));
    expect(op.state).toBe("failed");
    expect(op.error_kind).toBe("timeout");
  });
  it("4: resume reconciles checkpoint files with the repo", () => {
    const r = reconcileCheckpoint([{ path: "a.js", blob_sha: "1" }, { path: "b.js", blob_sha: "2" }, { path: "c.js", blob_sha: "3" }], new Map([["a.js", "1"], ["b.js", "9"]]));
    expect(r).toEqual({ confirmed: ["a.js"], diverged: ["b.js"], missing: ["c.js"] });
  });
  it("5: a verified write is marked verified, and a write unblocks re-reads", () => {
    const l = new OperationLedger();
    for (let i = 0; i < 3; i++) l.finish(l.start("list_files", {}), "{}");
    expect(l.guard("list_files", {})).toMatch(/anti-loop/);
    const w = l.finish(l.start("write_file", { path: "a.js" }), JSON.stringify({ ok: true }), { verified: true, write: true });
    expect(w.state).toBe("verified");
    expect(l.guard("list_files", {})).toBeNull();
  });
  it("6: normalizes paths so the same file is never treated as two", () => {
    expect(normalizeRepoPath("/./src\\js//app.js")).toBe("src/js/app.js");
  });
  it("8: no tests run means never CONCLUÍDO E VALIDADO, and 'funcional' is removed", () => {
    const v = honestStatus({ writes: 2, verifiedWrites: 2, failures: 0, testsRun: 0, testsPassed: 0, blocked: false, error: false });
    expect(v.status).toBe("IMPLEMENTADO, NÃO TESTADO");
    expect(guardClaims("Sistema funcional", v.status)).not.toMatch(/funcional/);
    expect(honestStatus({ writes: 2, verifiedWrites: 1, failures: 0, testsRun: 1, testsPassed: 1, blocked: false, error: false }).status).toBe("PARCIALMENTE IMPLEMENTADO");
  });
});
