import { describe, expect, it } from "vitest";
import { buildSpecialistAcademyContext, detectSpecialistProfiles, WLC_COMPETENCY_LEVELS } from "../lib/wlc-specialist-academy";

describe("WLC specialist academy", () => {
  it("selects data, database and integration specialists for a Telegram SaaS", () => {
    const profiles = detectSpecialistProfiles("Criar SaaS com pipeline de dados, Supabase PostgreSQL e bot Telegram webhook");
    expect(profiles.map((p) => p.id)).toEqual(expect.arrayContaining(["data-engineering", "database", "integrations"]));
  });
  it("selects web design and frontend specialties", () => {
    const profiles = detectSpecialistProfiles("Criar landing page responsiva com React, UI e design system");
    expect(profiles.map((p) => p.id)).toEqual(expect.arrayContaining(["frontend", "web-design"]));
  });
  it("builds principal-level guidance with safety and evidence boundaries", () => {
    const context = buildSpecialistAcademyContext("Corrigir bug em API backend e pipeline de dados");
    expect(context).toContain("principal");
    expect(context).toContain("evidências");
    expect(context).toContain("Engenheiro(a) Backend");
    expect(context).toContain("Engenheiro(a) de Dados");
  });
  it("does not claim academic credentials or model-weight training", () => {
    const context = buildSpecialistAcademyContext("Desenvolver API");
    expect(context).toContain("Não alegue diploma");
    expect(WLC_COMPETENCY_LEVELS.postgraduate).toContain("Pós-graduação");
  });
  it("returns no specialist context for unrelated casual conversation", () => {
    expect(buildSpecialistAcademyContext("Olá, tudo bem?")).toBe("");
  });
});
