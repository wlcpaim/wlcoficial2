import { describe, it, expect } from "vitest";
import { buildSiteFiles } from "@/lib/site-presets";
import { presetSiteKind } from "@/lib/project-presets";

describe("site presets", () => {
  it("Empty seeds nothing", () => { expect(presetSiteKind("empty")).toBeNull(); });
  it("every site preset ships an admin page", () => {
    for (const k of ["store", "blog", "forum", "news"] as const) {
      const paths = buildSiteFiles(k, "meu-site").map((f) => f.path);
      expect(paths).toContain("admin.html");
      expect(paths).toContain("item.html");
      expect(paths).toContain("content.html");
      expect(paths).toContain("search.html");
    }
  });
  it("only the store has a cart page", () => {
    expect(buildSiteFiles("store", "x").map((f) => f.path)).toContain("cart.html");
    expect(buildSiteFiles("blog", "x").map((f) => f.path)).not.toContain("cart.html");
  });
  it("generates dedicated institutional and search pages for every preset", () => {
    for (const k of ["store", "blog", "forum", "news"] as const) {
      const files = buildSiteFiles(k, "projeto");
      const content = files.find((f) => f.path === "content.html");
      const search = files.find((f) => f.path === "search.html");
      expect(content?.content).toContain('data-page="content"');
      expect(search?.content).toContain('data-page="search"');
    }
  });
  it("no page is left with template placeholders", () => {
    for (const f of buildSiteFiles("news", "jornal")) { expect(f.content).not.toContain("{{"); expect(f.content.length).toBeGreaterThan(0); }
  });
});

import { isCoolingDown } from "@/lib/key-rotation";
describe("Gemini daily quota fallback", () => {
  const base = { id: "k", name: "k", google_project: null, is_primary: true, is_active: true, status: "quota_exceeded", created_at: "" };
  it("keeps an exhausted key out until the daily reset at midnight Pacific", () => {
    const at = "2026-11-20T10:00:00Z";
    expect(isCoolingDown({ ...base, quota_exceeded_at: at }, Date.parse("2026-11-21T07:59:00Z"))).toBe(true);
    expect(isCoolingDown({ ...base, quota_exceeded_at: at }, Date.parse("2026-11-21T08:01:00Z"))).toBe(false);
  });
});

import { FREE_GEMINI_MODELS, modelCandidates } from "@/lib/models";
describe("gemini model order", () => {
  it("starts with the widest free quota and leaves gemini-3.8-flash for last", () => {
    expect(FREE_GEMINI_MODELS[0]).toBe("gemini-3.1-flash-lite");
    expect(FREE_GEMINI_MODELS.at(-1)).toBe("gemini-3.8-flash");
    expect(modelCandidates("gemini-3.8-flash").at(-1)).toBe("gemini-3.8-flash");
  });
});

import { isShaConflict } from "@/lib/agent.server";
describe("GitHub SHA conflict detection", () => {
  it("treats 422 'sha wasn't supplied' as a conflict to auto-heal", () => {
    expect(isShaConflict(new Error("GitHub 422: Invalid request. \"sha\" wasn't supplied."))).toBe(true);
  });
  it("does not retry unrelated errors", () => {
    expect(isShaConflict(new Error("GitHub 401: Bad credentials"))).toBe(false);
  });
});
