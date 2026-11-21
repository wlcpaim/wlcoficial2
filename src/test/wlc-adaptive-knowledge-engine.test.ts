import { describe, expect, it } from "vitest";
import {
  ADAPTIVE_SEED_KNOWLEDGE,
  findDuplicates,
  formatAdaptiveKnowledgeContext,
  getAdaptiveKnowledgeStats,
  listCategories,
  registerKnowledge,
  retrieveAdaptiveKnowledge,
  WLC_ADAPTIVE_KNOWLEDGE_VERSION,
} from "../lib/wlc-adaptive-knowledge-engine";

describe("WLC Adaptive Knowledge Engine", () => {
  it("exposes version and seed entries", () => {
    expect(WLC_ADAPTIVE_KNOWLEDGE_VERSION).toMatch(/^\d+\.\d+\.\d+/);
    expect(ADAPTIVE_SEED_KNOWLEDGE.length).toBeGreaterThan(5);
    expect(listCategories().length).toBeGreaterThan(3);
  });

  it("retrieves relevant structured knowledge for TypeScript queries", () => {
    const result = retrieveAdaptiveKnowledge("TypeScript estrito e validação com Zod", 3);
    expect(result.entries.length).toBeGreaterThan(0);
    expect(result.entries.some((e) => e.category === "TypeScript" || e.keywords.some((k) => k.includes("typescript")))).toBe(true);
    expect(result.engineVersion).toBe(WLC_ADAPTIVE_KNOWLEDGE_VERSION);
  });

  it("retrieves security and architecture knowledge", () => {
    const result = retrieveAdaptiveKnowledge("API segura validação na borda SQL injection", 4);
    expect(result.entries.length).toBeGreaterThan(0);
    const cats = result.entries.map((e) => e.category);
    expect(cats.some((c) => c === "Security" || c === "Architecture")).toBe(true);
  });

  it("detects duplicates by title and keywords", () => {
    const dups = findDuplicates({
      title: "TypeScript estrito e seguro",
      category: "TypeScript",
      keywords: ["typescript", "strict", "tipos", "zod"],
    });
    expect(dups.length).toBeGreaterThan(0);
  });

  it("rejects registration of duplicate id", () => {
    const existing = ADAPTIVE_SEED_KNOWLEDGE[0]!;
    const res = registerKnowledge({
      ...existing,
      title: "Outro título",
    });
    expect(res.ok).toBe(false);
  });

  it("formats context without inventing research", () => {
    const result = retrieveAdaptiveKnowledge("design tokens tema dark mode", 2);
    const ctx = formatAdaptiveKnowledgeContext(result);
    expect(ctx).toContain("Adaptive Knowledge Engine");
    expect(ctx.toLowerCase()).not.toContain("pesquisei na internet");
  });

  it("reports stats", () => {
    const stats = getAdaptiveKnowledgeStats();
    expect(stats.total).toBeGreaterThan(0);
    expect(stats.version).toBe(WLC_ADAPTIVE_KNOWLEDGE_VERSION);
  });
});
