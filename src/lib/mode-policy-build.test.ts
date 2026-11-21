import { describe, it, expect } from "vitest";
import { modeSystemPrompt, allowedTools } from "./mode-policy";

describe("Modo Criar usa conhecimento e aprende", () => {
  it("exige os motores WLC.IA como padrão", () => {
    expect(modeSystemPrompt("build")).toContain("Conhecimento WLC.IA é obrigatório");
  });
  it("exige os 4 estados e proíbe placeholders", () => {
    const p = modeSystemPrompt("build");
    expect(p).toContain("4 estados");
    expect(p).toContain("Zero placeholders");
  });
  it("registra aprendizado com save_memory, que está liberado no Criar", () => {
    expect(modeSystemPrompt("build")).toContain("save_memory");
    expect(allowedTools("build").has("save_memory")).toBe(true);
    expect(allowedTools("chat").has("save_memory")).toBe(false);
  });
});
