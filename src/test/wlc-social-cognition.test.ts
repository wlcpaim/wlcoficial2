import { describe, expect, it } from "vitest";
import { assessSocialConversation, formatSocialCognitionContext } from "../lib/wlc-social-cognition";

describe("WLC social cognition", () => {
  it("starts greetings warmly and keeps response guidance conversational", () => {
    const signal = assessSocialConversation("Oi!");
    expect(signal.intent).toBe("greeting");
    expect(signal.tone).toBe("warm");
    expect(signal.responseGuidance.some((line) => line.includes("fórmula fixa"))).toBe(true);
  });

  it("uses recent history to classify a short contextual follow-up", () => {
    const history = [{ role: "user", content: "Quero melhorar o motor cognitivo da WLC.IA para programação." }];
    const signal = assessSocialConversation("Pode implementar?", history);
    expect(signal.intent).toBe("follow_up");
    expect(signal.shortContextualReply).toBe(true);
    expect(signal.topicContinuity).toBe(true);
  });

  it("identifies emotional-support requests without asserting diagnosis", () => {
    const signal = assessSocialConversation("Estou muito desanimado hoje");
    expect(signal.intent).toBe("emotional_support");
    expect(signal.tone).toBe("concerned");
    expect(signal.responseGuidance.join(" ")).toContain("diagnóstico");
  });

  it("routes research and clarification signals distinctly", () => {
    expect(assessSocialConversation("Pesquise as notícias atuais sobre IA").intent).toBe("research");
    expect(assessSocialConversation("Não entendi, explica melhor").intent).toBe("clarification");
  });

  it("formats a compact context block for the system prompt", () => {
    const block = formatSocialCognitionContext(assessSocialConversation("Valeu!"));
    expect(block).toContain("Social Cognition & Conversation Engine");
    expect(block).toContain("agradecimento");
  });
});
