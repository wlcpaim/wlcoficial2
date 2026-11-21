import { describe, expect, it } from "vitest";
import { formatWlcKnowledgeContext, retrieveWlcKnowledge, WLC_CORE_KNOWLEDGE, WLC_CORE_KNOWLEDGE_VERSION } from "../lib/wlc-knowledge-base";
import { STREATRACE_KNOWLEDGE, STREATRACE_KNOWLEDGE_VERSION } from "../lib/streetrace-knowledge";

describe("WLC Core Knowledge Base", () => {
  it("includes a starter knowledge set across core domains", () => {
    expect(WLC_CORE_KNOWLEDGE.length).toBeGreaterThanOrEqual(10);
    expect(new Set(WLC_CORE_KNOWLEDGE.map((entry) => entry.id)).size).toBe(WLC_CORE_KNOWLEDGE.length);
  });

  it("retrieves relevant knowledge for a programming/debug request", () => {
    const results = retrieveWlcKnowledge("Como depurar um bug de programação e validar o código?");
    expect(results.some((entry) => entry.id === "software-01")).toBe(true);
    expect(results.some((entry) => entry.id === "evaluation-01")).toBe(true);
  });

  it("retrieves autonomy and action principles for agent questions", () => {
    const results = retrieveWlcKnowledge("Como um agente autônomo decide executar ações e usar ferramentas?");
    expect(results.some((entry) => entry.id === "core-agent-01")).toBe(true);
    expect(results.some((entry) => entry.id === "tools-01")).toBe(true);
  });

  it("retrieves mathematical and physics foundations", () => {
    expect(retrieveWlcKnowledge("resolver conta porcentagem e equação", 6).some((e) => e.id === "math-01")).toBe(true);
    expect(retrieveWlcKnowledge("quanto é 15% de 850", 4).some((e) => e.id === "math-01")).toBe(true);
    expect(retrieveWlcKnowledge("exercício de física movimento aceleração", 6).some((e) => e.id === "physics-01")).toBe(true);
  });

  it("retrieves website creation and developer knowledge", () => {
    const results = retrieveWlcKnowledge("criar site profissional frontend responsivo HTML CSS JavaScript", 8);
    expect(results.some((e) => e.id === "webdev-01")).toBe(true);
    expect(results.some((e) => e.id === "webdev-02")).toBe(true);
  });

  it("retrieves advanced full-stack engineering knowledge", () => {
    const cases = [
      ["TypeScript strict generics e validação Zod", "dev-ts-01"],
      ["React hooks componentes estado frontend", "dev-react-01"],
      ["PostgreSQL SQL migrations índices transações", "dev-db-01"],
      ["API REST backend endpoints validação", "dev-api-01"],
      ["segurança OWASP XSS JWT autorização", "dev-auth-01"],
      ["Playwright testes E2E Vitest build", "dev-testing-01"],
      ["CI/CD GitHub deploy pipeline releases", "dev-git-01"],
      ["criar SaaS dashboard UX painel responsivo", "dev-product-01"],
      ["scripts CLI automação cron processamento", "dev-automation-01"],
    ] as const;
    for (const [query, id] of cases) {
      expect(retrieveWlcKnowledge(query, 8).some((entry) => entry.id === id), query).toBe(true);
    }
  });

  it("returns no results for an empty/stopword-only query", () => {
    expect(retrieveWlcKnowledge("e de para com a")).toEqual([]);
  });

  it("formats recovered knowledge for prompt injection", () => {
    const context = formatWlcKnowledgeContext(retrieveWlcKnowledge("memória e contexto"));
    expect(context).toContain("Memória");
    expect(context).toContain("recuperação contextual");
  });
});


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
