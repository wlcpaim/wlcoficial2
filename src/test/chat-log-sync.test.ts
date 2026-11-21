import { describe, expect, it } from "vitest";
import { appendExchange, chatLogPath } from "@/lib/chat-log-sync";

describe("chat log files", () => {
  it("each mode has its own file inside WLC.IA", () => {
    expect(chatLogPath("chat")).toBe("WLC.IA/Chat.md");
    expect(chatLogPath("plan")).toBe("WLC.IA/Planejar.md");
    expect(chatLogPath("build")).toBe("WLC.IA/Criar.md");
  });
  it("appends without losing earlier history", () => {
    const at = new Date("2026-11-21T00:00:00Z");
    const one = appendExchange(null, { mode: "chat", chatTitle: "T", chatId: "abcdef123", user: "oi", assistant: "olá", at });
    const two = appendExchange(one, { mode: "chat", chatTitle: "T", chatId: "abcdef123", user: "tudo bem?", assistant: "sim", at });
    expect(two).toContain("oi");
    expect(two).toContain("tudo bem?");
    expect(two.match(/\*\*Usuário:\*\*/g)?.length).toBe(2);
  });
});
