import { describe, expect, it } from "vitest";
import { retrieveWlcKnowledge, WLC_CORE_KNOWLEDGE_VERSION } from "../lib/wlc-knowledge-base";
import { GAME_STUDIO_KNOWLEDGE, GAME_STUDIO_KNOWLEDGE_VERSION } from "../lib/game-studio-knowledge";

describe("Game Studio knowledge domain", () => {
  it("exposes Game Studio entries", () => {
    expect(GAME_STUDIO_KNOWLEDGE_VERSION).toBe("1.0.0");
    expect(GAME_STUDIO_KNOWLEDGE.length).toBeGreaterThanOrEqual(15);
    const domains = new Set(GAME_STUDIO_KNOWLEDGE.map((e) => e.domain));
    expect(domains.has("Game Studio")).toBe(true);
    expect(domains.has("Física de Jogos")).toBe(true);
  });

  it("retrieves game studio knowledge for create-game queries", () => {
    const hits = retrieveWlcKnowledge("quero criar um jogo web de simulação do zero com física determinística", 8);
    expect(hits.length).toBeGreaterThan(0);
    expect(
      hits.some((h) =>
        ["Game Studio", "Física de Jogos", "Engenharia de Jogos Web", "Matemática de Jogos"].includes(h.domain),
      ),
    ).toBe(true);
  });

  it("core version includes game-studio tag", () => {
    expect(WLC_CORE_KNOWLEDGE_VERSION).toContain("game-studio");
  });
});
