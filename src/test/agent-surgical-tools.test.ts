import { describe, expect, it } from "vitest";
import { applyContextualPatch, searchCodebase, suggestedValidationCommands } from "../lib/agent-surgical-tools";

describe("applyContextualPatch", () => {
  it("replaces a unique hunk", () => {
    const src = "function a() {\n  return 1;\n}\n";
    const r = applyContextualPatch(src, [{ old_text: "return 1;", new_text: "return 2;" }]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.content).toContain("return 2;");
      expect(r.replacements).toBe(1);
    }
  });

  it("fails on ambiguous hunk", () => {
    const src = "x = 1;\nx = 1;\n";
    const r = applyContextualPatch(src, [{ old_text: "x = 1;", new_text: "x = 2;" }]);
    expect(r.ok).toBe(false);
  });

  it("fails when anchor missing", () => {
    const r = applyContextualPatch("hello", [{ old_text: "missing", new_text: "x" }]);
    expect(r.ok).toBe(false);
  });
});

describe("searchCodebase", () => {
  it("finds regex hits with line numbers", () => {
    const files = { "src/a.ts": "export const foo = 1;\nexport const bar = 2;\n" };
    const r = searchCodebase(files, "export const");
    expect(r.hits.length).toBe(2);
    expect(r.hits[0]?.line).toBe(1);
  });
});

describe("suggestedValidationCommands", () => {
  it("suggests bun/tsc when stack detected", () => {
    const cmds = suggestedValidationCommands({ hasPackageJson: true, hasTsConfig: true, packageManager: "bun" });
    expect(cmds.some((c) => c.includes("tsc"))).toBe(true);
  });
});
