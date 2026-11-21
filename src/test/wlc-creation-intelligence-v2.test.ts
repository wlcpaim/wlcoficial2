import { describe, expect, it } from "vitest";
import {
  analyzeCreation,
  auditGeneratedFiles,
  buildAuditSelfReviewPrompt,
  buildCreationProtocol,
  formatCreationBlueprintContext,
  isCreationRequest,
  scoreDomains,
} from "@/lib/wlc-creation-intelligence-v2";

describe("WLC creation intelligence v2 — intenção", () => {
  it("reconhece imperativos e necessidades de criação", () => {
    expect(isCreationRequest("Crie um sistema de PDV para minha loja")).toBe(true);
    expect(isCreationRequest("Preciso de um app de agendamento")).toBe(true);
    expect(isCreationRequest("Monte uma landing page para meu estúdio")).toBe(true);
    expect(isCreationRequest("quero um jogo de corrida")).toBe(true);
    expect(isCreationRequest("Faça uma loja virtual de camisetas com carrinho")).toBe(true);
    expect(isCreationRequest("Monte um sequenciador de beats com web audio")).toBe(true);
  });
  it("não trata dúvidas, explicações e correções como criação", () => {
    expect(isCreationRequest("Explique o que é React")).toBe(false);
    expect(isCreationRequest("Corrigir bug no formulário de login")).toBe(false);
    expect(isCreationRequest("Como funciona um sistema de filas?")).toBe(false);
    expect(isCreationRequest("")).toBe(false);
  });
});

describe("WLC creation intelligence v2 — domínio", () => {
  it("PDV vence dashboard quando 'painel' aparece dentro de PDV", () => {
    const ranking = scoreDomains("Criar um PDV com caixa, estoque e um painel de vendas");
    expect(ranking[0]?.domain).toBe("pdv");
  });
  it("detecta domínio primário e secundários", () => {
    const b = analyzeCreation("Criar um PDV com controle de estoque e relatórios de vendas, com login de operador");
    expect(b.primary).toBe("pdv");
    expect(b.secondary).toContain("inventory");
    expect(b.confidence).toBe("high");
  });
  it("jogo recebe conhecimento específico de game loop", () => {
    const b = analyzeCreation("Crie um jogo de corrida de moto em canvas com fases e pontuação");
    expect(b.primary).toBe("game");
    expect(b.platform).toBe("game");
    expect(b.knowledge.invariants.join(" ")).toMatch(/tempo fixo|delta/i);
  });
  it("pedido vago cai em genérico com baixa confiança e lacunas", () => {
    const b = analyzeCreation("Faz algo legal pra mim");
    expect(b.primary).toBe("generic");
    expect(b.confidence).toBe("low");
    expect(b.openQuestions.length).toBeGreaterThan(0);
    expect(b.assumptions.length).toBeGreaterThan(0);
  });
});

describe("WLC creation intelligence v2 — blueprint", () => {
  it("extrai restrições e requisitos explícitos", () => {
    const b = analyzeCreation("Criar um dashboard em React com Supabase e tailwind. Deve ter modo escuro e filtrar por período");
    expect(b.constraints).toContain("Stack: React");
    expect(b.constraints).toContain("Backend: Supabase");
    expect(b.constraints).toContain("Tema escuro obrigatório");
    expect(b.requirements.some((r) => r.kind === "explicit")).toBe(true);
  });
  it("complexidade sobe com autenticação, pagamento e multi-domínio", () => {
    const simple = analyzeCreation("Crie uma calculadora de gorjeta");
    const hard = analyzeCreation("Crie um e-commerce completo com login, permissões, checkout com pagamento, estoque e relatórios em tempo real");
    expect(hard.complexityScore).toBeGreaterThan(simple.complexityScore);
    expect(["complex", "enterprise"]).toContain(hard.tier);
    expect(simple.tier).toBe("simple");
    expect(hard.phases.some((p) => p.name.startsWith("2b"))).toBe(true);
  });
  it("separa MVP de 'depois' e não infla o escopo", () => {
    const b = analyzeCreation("Crie um PDV completo com caixa, estoque e relatórios");
    expect(b.scope.mvp.length).toBeGreaterThan(0);
    expect(b.scope.mvp.length + b.scope.core.length + b.scope.later.length).toBe(b.knowledge.modules.length);
  });
  it("contexto formatado traz invariantes, 'nunca fingir' e portões", () => {
    const text = formatCreationBlueprintContext(analyzeCreation("Criar PDV para loja"));
    expect(text).toContain("Creation Intelligence v2");
    expect(text).toContain("Invariantes de negócio");
    expect(text).toContain("NUNCA fingir");
    expect(text).toContain("Fases com portões de verificação");
    expect(text).toContain("centavos");
  });
  it("protocolo por modo", () => {
    expect(buildCreationProtocol("build")).toContain("autorrevisão");
    expect(buildCreationProtocol("plan", analyzeCreation("Criar PDV"))).toContain("MVP");
    expect(buildCreationProtocol("chat")).toBe("");
  });
});

describe("WLC creation intelligence v2 — auditoria de código", () => {
  it("pega botão falso, lorem ipsum, dados aleatórios e segredo", () => {
    const report = auditGeneratedFiles([
      {
        path: "src/routes/dashboard.tsx",
        content: [
          "export default function D(){",
          "  const revenue = Array.from({length:12}, () => Math.random()*1000); // series",
          "  return <div><p>Lorem ipsum dolor sit amet</p><button onClick={() => {}}>Salvar</button></div>;",
          "}",
        ].join("\n"),
      },
      { path: "src/lib/api.ts", content: 'const key = "sk-abcdefghijklmnopqrstuvwxyz123456";' },
    ]);
    const rules = report.findings.map((f) => f.rule);
    expect(rules).toContain("fake-handler");
    expect(rules).toContain("placeholder-text");
    expect(rules).toContain("random-data");
    expect(rules).toContain("secret-in-code");
    expect(report.blocking.length).toBeGreaterThanOrEqual(3);
    expect(report.grade).toMatch(/[DF]/);
  });
  it("código limpo recebe nota alta", () => {
    const report = auditGeneratedFiles([
      {
        path: "src/components/Lista.tsx",
        content: [
          "export function Lista({ itens, isLoading, error }: { itens: string[]; isLoading: boolean; error?: string }) {",
          "  if (isLoading) return <p>Carregando…</p>;",
          "  if (error) return <p role=\"alert\">{error}</p>;",
          "  if (itens.length === 0) return <p>Nenhum item ainda.</p>;",
          "  return <ul>{itens.map((i) => <li key={i}>{i}</li>)}</ul>;",
          "}",
        ].join("\n"),
      },
    ]);
    expect(report.score).toBeGreaterThanOrEqual(90);
    expect(report.blocking).toHaveLength(0);
  });
  it("Math.random em jogo (spawn) não é falso positivo", () => {
    const report = auditGeneratedFiles([{ path: "src/game/engine.ts", content: "const spawnX = Math.random() * width; // enemy spawn" }]);
    expect(report.findings.map((f) => f.rule)).not.toContain("random-data");
  });
  it("detecta dinheiro em float e XSS, e ignora arquivos de teste", () => {
    const report = auditGeneratedFiles([
      { path: "src/lib/cart.ts", content: "const preco = 19.90;" },
      { path: "src/components/Post.tsx", content: "export const P = ({h}:{h:string}) => <div dangerouslySetInnerHTML={{__html:h}} />;" },
      { path: "src/test/x.test.ts", content: "const key = 'sk-abcdefghijklmnopqrstuvwxyz123456'" },
    ]);
    const rules = report.findings.map((f) => f.rule);
    expect(rules).toContain("float-money");
    expect(rules).toContain("innerhtml-xss");
    expect(rules).not.toContain("secret-in-code");
    expect(report.filesScanned).toBe(2);
  });
  it("gera prompt de autocorreção com caminhos e correções", () => {
    const report = auditGeneratedFiles([{ path: "src/a.tsx", content: "<button onClick={() => {}}>x</button>" }]);
    const prompt = buildAuditSelfReviewPrompt(report, 1);
    expect(prompt).toContain("src/a.tsx");
    expect(prompt).toContain("patch_file");
  });
});
