import { describe, expect, it } from "vitest";
import { retrieveWlcKnowledge, WLC_CORE_KNOWLEDGE_VERSION } from "../lib/wlc-knowledge-base";
import { STREATRACE_KNOWLEDGE, STREATRACE_KNOWLEDGE_VERSION } from "../lib/streetrace-knowledge";

describe("StreetRace knowledge domain", () => {
  it("exposes StreetRace entries and version", () => {
    expect(STREATRACE_KNOWLEDGE_VERSION).toBe("1.0.0");
    expect(STREATRACE_KNOWLEDGE.length).toBeGreaterThanOrEqual(15);
    expect(STREATRACE_KNOWLEDGE.every((e) => e.domain === "StreetRace")).toBe(true);
  });

  it("retrieves StreetRace knowledge for moto/racha queries", () => {
    const hits = retrieveWlcKnowledge("como preparar a CG 160 para racha de rua na oficina", 6);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.domain === "StreetRace")).toBe(true);
  });

  it("bumps core knowledge version with streetrace tag", () => {
    expect(WLC_CORE_KNOWLEDGE_VERSION).toContain("streetrace");
  });
});
