import { describe, it, expect } from "vitest";
import { modeInstruction, attachmentsForModel } from "@/lib/chat-modes";
describe("chat modes", () => {
  it("Criar executa sem pedir aprovação", () => { expect(modeInstruction("build")).toContain("SEM chamar propose_plan"); });
  it("Chat não grava arquivos", () => { expect(modeInstruction("chat")).toContain("NÃO grave arquivos"); });
  it("Planejar usa propose_plan", () => { expect(modeInstruction("plan")).toContain("chame propose_plan"); });
  it("arquivo de texto anexado chega ao modelo", () => { expect(attachmentsForModel([{ name: "a.css", kind: "text", mime: "text/css", size: 5, content: "body{}" }])).toContain("body{}"); });
});
