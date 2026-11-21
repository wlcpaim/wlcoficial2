import { describe, expect, it } from "vitest";
import { buildWlcIntelligenceFrame, formatWlcIntelligenceContext } from "../lib/wlc-intelligence-core";

describe("WLC integrated intelligence core", () => {
  it("recognizes continuity when a short follow-up depends on conversation history", () => {
    const frame = buildWlcIntelligenceFrame("E como fazemos isso?", [
      { role: "user", content: "Quero estruturar um plano de lançamento para meu produto." },
      { role: "assistant", content: "Vamos dividir em etapas." },
    ]);
    expect(frame.continuity).toBe("follow_up");
    expect(frame.constraints.join(" ")).toContain("histórico recente");
  });

  it("does not misclassify a short unrelated question as a follow-up", () => {
    const frame = buildWlcIntelligenceFrame("Qual a previsão do tempo?", [
      { role: "user", content: "Quero estruturar um plano de lançamento." },
    ]);
    expect(frame.continuity).toBe("new_topic");
  });

  it("recognizes an explicit correction", () => {
    const frame = buildWlcIntelligenceFrame("Na verdade, preserve a arquitetura atual e ajuste somente a interpretação.");
    expect(frame.continuity).toBe("correction");
    expect(frame.constraints.length).toBeGreaterThan(0);
  });

  it("recommends planning for complex project work", () => {
    const frame = buildWlcIntelligenceFrame("Vamos desenvolver a arquitetura completa do projeto e implementar todas as etapas.");
    expect(frame.requiresPlan).toBe(true);
    expect(frame.mode).toBe("create");
  });

  it("marks irreversible or production actions as high risk", () => {
    const frame = buildWlcIntelligenceFrame("Execute o deploy em produção.");
    expect(frame.mode).toBe("execute");
    expect(frame.risk).toBe("high");
  });

  it("does not force planning for a simple greeting", () => {
    const frame = buildWlcIntelligenceFrame("Oi, tudo bem?");
    expect(frame.mode).toBe("conversation");
    expect(frame.requiresPlan).toBe(false);
  });

  it("communicates that deterministic signals are not factual confidence", () => {
    const context = formatWlcIntelligenceContext(buildWlcIntelligenceFrame("Explique como funciona a memória contextual."));
    expect(context).toContain("não é confiança factual");
    expect(context).toContain("não invente preferências");
  });
});
