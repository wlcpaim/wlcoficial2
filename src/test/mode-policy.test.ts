import { describe, it, expect } from "vitest";
import { allowedTools, parseMode, isApprovalMessage, modeSystemPrompt } from "@/lib/mode-policy";

const WRITE = ["write_file", "patch_file", "delete_file", "create_branch"];

describe("modos independentes", () => {
  it("Chat nunca recebe ferramentas de gravação nem de plano", () => {
    const t = allowedTools("chat");
    for (const w of [...WRITE, "propose_plan"]) expect(t.has(w)).toBe(false);
  });
  it("Planejar sem aprovação não grava", () => {
    const t = allowedTools("plan", false);
    for (const w of WRITE) expect(t.has(w)).toBe(false);
    expect(t.has("propose_plan")).toBe(true);
  });
  it("Planejar com aprovação executa sem pedir de novo", () => {
    const t = allowedTools("plan", true);
    expect(t.has("write_file")).toBe(true);
    expect(t.has("propose_plan")).toBe(false);
  });
  it("Criar grava sem propose_plan", () => {
    const t = allowedTools("build");
    expect(t.has("write_file")).toBe(true);
    expect(t.has("propose_plan")).toBe(false);
  });
  it("modo inválido ou ausente cai em Chat, nunca em Criar", () => {
    expect(parseMode(undefined)).toBe("chat");
    expect(parseMode("criar")).toBe("chat");
  });
  it("só a mensagem do botão aprovar conta como aprovação", () => {
    expect(isApprovalMessage("✅ Aprovado — pode criar.")).toBe(true);
    expect(isApprovalMessage("pode criar o app")).toBe(false);
  });
  it("cada modo tem prompt próprio", () => {
    const p = new Set([modeSystemPrompt("chat"), modeSystemPrompt("plan"), modeSystemPrompt("build")]);
    expect(p.size).toBe(3);
  });
});
