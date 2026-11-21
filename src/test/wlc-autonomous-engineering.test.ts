import { describe, expect, it } from "vitest";
import { createAutonomousEngineeringBacklog, detectBuildCapabilities, formatAutonomousEngineeringContext } from "../lib/wlc-autonomous-engineering";

describe("WLC autonomous engineering intelligence", () => {
  it("detects a Telegram SaaS with Supabase and responsive website", () => {
    expect(detectBuildCapabilities("Criar SaaS com landing page responsiva, bot Telegram e banco Supabase")).toEqual(expect.arrayContaining(["website", "saas", "telegram", "supabase"]));
  });
  it("builds an end-to-end product backlog", () => {
    const backlog = createAutonomousEngineeringBacklog("Desenvolver SaaS com site, API, Supabase e Telegram");
    expect(backlog.map((x) => x.id)).toEqual(expect.arrayContaining(["discover", "inspect", "ui", "saas", "data", "telegram", "backend", "verify", "deliver"]));
  });
  it("includes evidence-gated debugging and regression testing", () => {
    const context = formatAutonomousEngineeringContext("Corrigir bug de autenticação e criar teste de regressão");
    expect(context).toContain("reproduza falhas");
    expect(context).toContain("teste de regressão");
    expect(context).toContain("não invente causa raiz");
  });
  it("requires approval for deployment", () => {
    const deploy = createAutonomousEngineeringBacklog("Publicar aplicação em produção").find((x) => x.id === "deploy");
    expect(deploy?.approvalRequired).toBe(true);
  });
  it("does not inject an engineering workflow for casual messages", () => {
    expect(formatAutonomousEngineeringContext("Olá, tudo bem?")).toBe("");
  });
});
