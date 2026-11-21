/**
 * WLC.IA Cognitive Orchestrator Pro v1.0
 * ---------------------------------------------------------------------------
 * Unified, multi-signal decision layer that upgrades the deterministic core:
 * - Weighted intent scoring (not first-match keyword)
 * - Continuity + anti-rewrite-loop detection (critical for long autonomous runs)
 * - Engineering quality policy for commercial software (atomic ops, real metrics)
 * - Compact, actionable plan with explicit stop conditions
 * - Observable confidence and rationale (no private chain-of-thought)
 *
 * This module does NOT call an LLM and does NOT grant tool permissions.
 * It only produces structured signals and policy text for the connected model.
 */

export const WLC_COGNITIVE_ORCHESTRATOR_PRO_VERSION = "1.0.0";

export type ProIntent =
  | "conversation"
  | "question"
  | "learning"
  | "math"
  | "physics"
  | "research"
  | "planning"
  | "development"
  | "debugging"
  | "review"
  | "security"
  | "writing"
  | "ops"
  | "unknown";

export type ProComplexity = "low" | "medium" | "high" | "critical";
export type ProRisk = "low" | "medium" | "high" | "critical";
export type ContinuitySignal =
  | "new_topic"
  | "follow_up"
  | "continuation"
  | "correction"
  | "restart_request"
  | "loop_suspected"
  | "unclear";

export type EngineeringPolicy = {
  /** Prefer incremental edits over full rewrites */
  incrementalOnly: boolean;
  /** Forbid inventing metrics / growth percentages */
  realDataOnly: boolean;
  /** Require atomic multi-step business operations (sale → stock → cash) */
  requireAtomicDomainOps: boolean;
  /** Cap automatic full-file rewrites of entrypoints */
  forbidBlindAppRewrite: boolean;
  /** Require tests or explicit verification claims only when executed */
  honestVerification: boolean;
  /** Prefer checkpoint + resume over restart */
  checkpointOverRestart: boolean;
};

export type ProCognitiveDecision = {
  version: string;
  intent: ProIntent;
  intentScores: Partial<Record<ProIntent, number>>;
  complexity: ProComplexity;
  risk: ProRisk;
  continuity: ContinuitySignal;
  confidence: "low" | "medium" | "high";
  needsTools: boolean;
  needsClarification: boolean;
  needsInspection: boolean;
  needsPlan: boolean;
  needsVerification: boolean;
  approvalRequired: boolean;
  engineering: EngineeringPolicy;
  antiPatterns: string[];
  suggestedActions: string[];
  plan: string[];
  stopConditions: string[];
  rationale: string;
};

const normalize = (s: string) =>
  s
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s./:-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const has = (s: string, terms: string[]) => terms.some((t) => s.includes(t));
const scoreTerms = (s: string, terms: string[], weight = 1) =>
  terms.reduce((acc, t) => (s.includes(t) ? acc + weight : acc), 0);

function scoreIntents(q: string): Partial<Record<ProIntent, number>> {
  const scores: Partial<Record<ProIntent, number>> = {};
  const add = (intent: ProIntent, n: number) => {
    if (n <= 0) return;
    scores[intent] = (scores[intent] ?? 0) + n;
  };

  add(
    "math",
    scoreTerms(q, ["calcule", "calcul", "quanto e", "porcent", "raiz", "equacao", "expressao"], 2) +
      (/(?:\d[\d.,]*)\s*[+\-*/^%]\s*\d/.test(q) ? 3 : 0),
  );
  add("physics", scoreTerms(q, ["fisica", "velocidade", "aceleracao", "forca", "energia", "massa", "mru", "mruv", "newton"], 2));
  add("debugging", scoreTerms(q, ["bug", "erro", "falha", "debug", "quebrou", "corrigir", "corrige", "nao funciona", "stack trace"], 2));
  add("security", scoreTerms(q, ["seguranca", "vulnerabilidade", "token", "secret", "xss", "sql injection", "permissao", "auth"], 2));
  add("review", scoreTerms(q, ["analise", "analisar", "revisar", "review", "auditar", "avaliar", "verifique", "auditoria"], 2));
  add(
    "development",
    scoreTerms(
      q,
      [
        "criar",
        "implementar",
        "desenvolver",
        "programar",
        "codigo",
        "site",
        "app",
        "projeto",
        "refator",
        "otimizar",
        "atualizar",
        "modulo",
        "pdv",
        "sistema",
        "api",
        "banco",
        "componente",
      ],
      1.5,
    ),
  );
  add("research", scoreTerms(q, ["pesquise", "pesquisa", "procure", "buscar", "documentacao", "compare", "fonte"], 2));
  add("planning", scoreTerms(q, ["planeje", "plano", "etapas", "estrategia", "roadmap", "organizar", "arquitetura"], 2));
  add("learning", scoreTerms(q, ["ensine", "explica", "explique", "aprender", "estudar", "como funciona", "tutorial"], 2));
  add("writing", scoreTerms(q, ["escreva", "redija", "legenda", "bio", "texto", "resuma", "reescreva"], 2));
  add("ops", scoreTerms(q, ["deploy", "publicar", "ci", "pipeline", "rollback", "monitor", "logs", "infra"], 2));
  add("conversation", scoreTerms(q, ["ola", "oi", "bom dia", "boa tarde", "obrigado", "valeu", "tudo bem"], 1));
  add("question", q.includes("?") || has(q, ["o que", "por que", "porque", "quando", "onde", "qual", "como"]) ? 1 : 0);

  return scores;
}

function pickIntent(scores: Partial<Record<ProIntent, number>>, q: string): ProIntent {
  const entries = Object.entries(scores) as [ProIntent, number][];
  if (!entries.length || !q) return q ? "question" : "unknown";
  entries.sort((a, b) => b[1] - a[1]);
  const [top, topScore] = entries[0]!;
  if (topScore < 1) return "question";
  // Prefer development when tied with review/plan on engineering language
  if (top === "review" || top === "planning") {
    const dev = scores.development ?? 0;
    if (dev >= topScore - 0.5 && has(q, ["criar", "implementar", "codigo", "pdv", "modulo", "app"])) {
      return "development";
    }
  }
  return top;
}

function detectContinuity(
  q: string,
  history: Array<{ role: string; content: string }>,
): ContinuitySignal {
  const userTurns = history.filter((h) => h.role === "user").map((h) => normalize(h.content));
  const hasHistory = userTurns.length > 0;

  // Negated instructions ("não reinicie") must NOT count as restart.
  const restartPositive =
    has(q, ["recomece do zero", "reinicie o projeto", "do zero", "comecar de novo", "começar de novo", "apague tudo", "refaca tudo", "refaça tudo"]) ||
    (/(?:^|\s)(recomece|reinicie|recomece o sistema)\b/.test(q) && !has(q, ["nao recomece", "não recomece", "nao reinicie", "não reinicie", "sem reiniciar", "nao apague", "não apague"]));
  if (restartPositive && !has(q, ["nao reinicie", "não reinicie", "nao recomece", "não recomece", "sem reiniciar", "preserve", "nao apague", "não apague"])) {
    return "restart_request";
  }
  if (has(q, ["continue", "continuar", "prossiga", "proximo passo", "de onde parou", "retome", "checkpoint"])) {
    return "continuation";
  }
  if (has(q, ["na verdade", "corrigindo", "quis dizer", "em vez disso", "troque", "substitua", "ajuste isso"])) {
    return "correction";
  }

  // Loop heuristic: same short instruction repeated recently
  if (hasHistory) {
    const last3 = userTurns.slice(-3);
    const similar =
      last3.filter((t) => t.length > 12 && (q.includes(t.slice(0, 24)) || t.includes(q.slice(0, 24)))).length >= 2;
    if (similar && has(q, ["continue", "checkpoint", "nao repita", "não repita", "de onde parou"])) {
      return "loop_suspected";
    }
  }

  if (hasHistory && has(q, ["isso", "esse", "essa", "o projeto", "como falei", "com base nisso", "e agora"])) {
    return "follow_up";
  }
  if (hasHistory && q.length < 10) return "unclear";
  return hasHistory ? "follow_up" : "new_topic";
}

function buildEngineeringPolicy(intent: ProIntent, continuity: ContinuitySignal, q: string): EngineeringPolicy {
  const isProductWork =
    intent === "development" ||
    intent === "debugging" ||
    intent === "review" ||
    has(q, ["pdv", "estoque", "caixa", "financeiro", "venda", "erp", "dashboard"]);

  return {
    incrementalOnly: isProductWork || continuity === "continuation" || continuity === "loop_suspected",
    realDataOnly: isProductWork || has(q, ["dashboard", "metric", "indicador", "roi", "faturamento", "lucro"]),
    requireAtomicDomainOps: has(q, ["venda", "pdv", "estoque", "caixa", "pagamento", "transacao", "transação"]),
    forbidBlindAppRewrite:
      continuity === "loop_suspected" ||
      continuity === "continuation" ||
      has(q, ["nao reinicie", "não reinicie", "nao recomece", "não recomece", "nao apague", "não apague", "preserve"]),
    honestVerification: true,
    checkpointOverRestart: continuity === "continuation" || continuity === "loop_suspected" || continuity === "restart_request",
  };
}

function detectAntiPatterns(q: string, continuity: ContinuitySignal, intent: ProIntent): string[] {
  const patterns: string[] = [];
  if (continuity === "loop_suspected") {
    patterns.push("Possível loop de continuação: não reinicie o projeto; retome do checkpoint e avance um módulo por vez.");
  }
  if (continuity === "restart_request" && intent === "development") {
    patterns.push("Pedido de reinício detectado: confirme escopo mínimo e preserve o que já funciona antes de recriar.");
  }
  if (has(q, ["enterprise", "profissional", "completo"]) && has(q, ["localstorage", "demonstracao", "demo"])) {
    patterns.push("Risco de overclaim: não rotule localStorage/demo como Enterprise sem persistência e testes reais.");
  }
  if (has(q, ["+14", "+22", "cresceu 18", "45% do faturamento", "dados ficticios", "dados fictícios"])) {
    patterns.push("Métricas inventadas proibidas: use apenas dados persistidos ou empty state.");
  }
  if (has(q, ["finalize a venda", "pdv"]) && !has(q, ["teste", "validar"])) {
    patterns.push("Fluxo de venda deve ser atômico (estoque + venda + caixa + auditoria) ou explicitamente parcial.");
  }
  if (has(q, ["declare concluido", "declare concluído", "sistema pronto"]) && !has(q, ["build", "teste", "typecheck"])) {
    patterns.push("Conclusão sem evidência: só declare pronto após build/testes executados ou liste pendências honestamente.");
  }
  return patterns;
}

function complexityOf(q: string, intent: ProIntent): ProComplexity {
  let score = 0;
  if (has(q, ["completo", "profissional", "enterprise", "plataforma", "multi", "erp", "pdv"])) score += 2;
  if (has(q, ["integrar", "api", "banco", "auth", "pagamento", "deploy", "github"])) score += 1;
  if (has(q, ["todos", "tudo", "ponta a ponta", "modulos", "módulos"])) score += 1;
  if (intent === "development" || intent === "ops") score += 1;
  if (q.length > 800) score += 1;
  if (score >= 5) return "critical";
  if (score >= 3) return "high";
  if (score >= 1) return "medium";
  return "low";
}

function riskOf(q: string, intent: ProIntent): ProRisk {
  if (has(q, ["deletar tudo", "apagar banco", "producao", "produção", "drop table", "rm -rf"])) return "critical";
  if (has(q, ["deploy", "publicar", "pagamento", "senha", "token", "secret", "credencial", "migracao", "migração"])) return "high";
  if (has(q, ["banco", "auth", "financeiro", "dados pessoais", "estoque", "caixa"])) return "medium";
  if (intent === "security" || intent === "ops") return "high";
  return "low";
}

function confidenceOf(scores: Partial<Record<ProIntent, number>>, intent: ProIntent): "low" | "medium" | "high" {
  const values = Object.values(scores);
  const top = scores[intent] ?? 0;
  const second = values.sort((a, b) => b - a)[1] ?? 0;
  if (top >= 4 && top - second >= 2) return "high";
  if (top >= 2) return "medium";
  return "low";
}

function buildPlan(
  intent: ProIntent,
  complexity: ProComplexity,
  engineering: EngineeringPolicy,
  continuity: ContinuitySignal,
): string[] {
  if (intent === "debugging") {
    return [
      "Reproduzir o problema e coletar sintomas, logs e arquivos envolvidos.",
      "Isolar causa raiz com hipótese testável (não chutar).",
      "Aplicar correção mínima e local; evitar reescrita ampla.",
      "Adicionar ou atualizar teste de regressão quando possível.",
      "Validar (typecheck/test/build disponíveis) e reportar evidências + riscos restantes.",
    ];
  }
  if (intent === "development") {
    const base = [
      continuity === "continuation" || continuity === "loop_suspected"
        ? "Retomar do checkpoint: listar o que já existe e o que falta; não recriar App/entrypoints sem necessidade."
        : "Inspecionar repositório, stack, convenções e estado atual antes de planejar.",
      "Definir escopo mínimo entregável e critérios de aceite verificáveis.",
      engineering.incrementalOnly
        ? "Implementar por módulo/arquivo, preservando o que funciona; proibido restart completo."
        : "Implementar mudanças coerentes e integradas em etapas pequenas.",
    ];
    if (engineering.requireAtomicDomainOps) {
      base.push("Para operações de negócio (venda/estoque/caixa): uma transação lógica única ou rollback explícito.");
    }
    if (engineering.realDataOnly) {
      base.push("Dashboard/indicadores: somente dados persistidos; senão empty state — nunca inventar percentuais.");
    }
    base.push(
      "Validar com typecheck/lint/test/build quando disponíveis; não declarar teste aprovado sem execução.",
      "Entregar relatório: arquivos tocados, o que funciona, pendências e próximo passo único.",
    );
    return base;
  }
  if (complexity === "low") {
    return ["Entender a pergunta.", "Responder de forma direta e precisa.", "Declarar limites se houver incerteza."];
  }
  return [
    "Clarificar objetivo, escopo e restrições essenciais.",
    "Reunir contexto e evidências relevantes.",
    "Executar a próxima ação útil autorizada.",
    "Validar resultado e ajustar se necessário.",
    "Sintetizar conclusão, evidências e pendências.",
  ];
}

/**
 * Main entry: assess a user message (+ optional history) into a professional decision.
 */
export function assessProRequest(
  input: string,
  history: Array<{ role: string; content: string }> = [],
): ProCognitiveDecision {
  const raw = input.trim();
  const q = normalize(raw);
  const intentScores = scoreIntents(q);
  const intent = pickIntent(intentScores, q);
  const continuity = detectContinuity(q, history);
  const complexity = complexityOf(q, intent);
  const risk = riskOf(q, intent);
  const confidence = confidenceOf(intentScores, intent);
  const engineering = buildEngineeringPolicy(intent, continuity, q);
  const antiPatterns = detectAntiPatterns(q, continuity, intent);

  const needsTools =
    intent === "development" ||
    intent === "debugging" ||
    intent === "review" ||
    intent === "research" ||
    intent === "ops" ||
    intent === "security";
  const needsInspection = needsTools && intent !== "research";
  const needsPlan = complexity === "high" || complexity === "critical" || intent === "development" || intent === "planning";
  const needsVerification = intent === "development" || intent === "debugging" || intent === "ops";
  const needsClarification =
    continuity === "unclear" ||
    (confidence === "low" && raw.length < 20) ||
    (intent === "unknown" && raw.length > 0);
  const approvalRequired =
    risk === "critical" ||
    (risk === "high" && has(q, ["producao", "produção", "deploy", "publicar", "deletar", "apagar"]));

  const suggestedActions: string[] = [];
  if (needsInspection) suggestedActions.push("Inspecionar arquivos e estado real antes de alterar.");
  if (engineering.incrementalOnly) suggestedActions.push("Evoluir o código existente; não reescrever a aplicação inteira.");
  if (engineering.forbidBlindAppRewrite) suggestedActions.push("Não recriar App.tsx/main/entry só para 'continuar'.");
  if (engineering.realDataOnly) suggestedActions.push("Nunca inventar métricas de crescimento ou percentuais.");
  if (engineering.requireAtomicDomainOps) suggestedActions.push("Tratar venda/estoque/caixa como operação consistente.");
  if (engineering.honestVerification) suggestedActions.push("Só afirmar teste/build após executar o comando.");
  if (antiPatterns.length) suggestedActions.push("Mitigar anti-padrões detectados antes de avançar.");
  if (!needsTools) suggestedActions.push("Responder diretamente sem ferramentas desnecessárias.");

  const plan = buildPlan(intent, complexity, engineering, continuity);
  const stopConditions = [
    "Critérios de aceite do escopo mínimo satisfeitos com evidência.",
    "Bloqueio externo (credencial, permissão, ferramenta indisponível) — pausar com checkpoint e mensagem clara.",
    "Risco crítico sem aprovação explícita do usuário.",
    "Loop detectado: parar reescritas e reportar estado + próximo passo único.",
  ];

  const rationale = `${intent} · ${complexity}/${risk} · continuity=${continuity} · conf=${confidence} · pro=${WLC_COGNITIVE_ORCHESTRATOR_PRO_VERSION}`;

  return {
    version: WLC_COGNITIVE_ORCHESTRATOR_PRO_VERSION,
    intent,
    intentScores,
    complexity,
    risk,
    continuity,
    confidence,
    needsTools,
    needsClarification,
    needsInspection,
    needsPlan,
    needsVerification,
    approvalRequired,
    engineering,
    antiPatterns,
    suggestedActions,
    plan,
    stopConditions,
    rationale,
  };
}

export function formatProCognitiveContext(decision: ProCognitiveDecision): string {
  const eng = decision.engineering;
  return [
    `## WLC.IA Cognitive Orchestrator Pro v${decision.version}`,
    `- Intenção: ${decision.intent} (confiança ${decision.confidence})`,
    `- Complexidade / risco: ${decision.complexity} / ${decision.risk}`,
    `- Continuidade: ${decision.continuity}`,
    `- Ferramentas: ${decision.needsTools ? "possivelmente úteis" : "não necessárias a priori"}`,
    `- Inspeção prévia: ${decision.needsInspection ? "sim" : "não"} · Plano: ${decision.needsPlan ? "sim" : "não"} · Verificação: ${decision.needsVerification ? "sim" : "não"}`,
    `- Aprovação humana: ${decision.approvalRequired ? "obrigatória para ações de alto impacto" : "não exigida por sinais determinísticos"}`,
    "",
    "### Política de engenharia profissional",
    `- Incremental only: ${eng.incrementalOnly ? "SIM — não reinicie o projeto" : "flexível"}`,
    `- Dados reais only: ${eng.realDataOnly ? "SIM — sem métricas inventadas" : "n/a"}`,
    `- Operações de domínio atômicas: ${eng.requireAtomicDomainOps ? "SIM" : "n/a"}`,
    `- Proibir reescrita cega de App/entry: ${eng.forbidBlindAppRewrite ? "SIM" : "não ativado"}`,
    `- Verificação honesta: ${eng.honestVerification ? "SIM" : "não"}`,
    `- Preferir checkpoint a restart: ${eng.checkpointOverRestart ? "SIM" : "não"}`,
    "",
    decision.antiPatterns.length
      ? `### Anti-padrões detectados\n${decision.antiPatterns.map((p) => `- ${p}`).join("\n")}`
      : "### Anti-padrões detectados\n- nenhum sinal forte",
    "",
    "### Ações sugeridas",
    ...decision.suggestedActions.map((a) => `- ${a}`),
    "",
    "### Plano adaptativo",
    ...decision.plan.map((p, i) => `${i + 1}. ${p}`),
    "",
    "### Condições de parada",
    ...decision.stopConditions.map((s) => `- ${s}`),
    "",
    "### Contrato",
    "- Os rótulos acima são sinais determinísticos auxiliares; a interpretação semântica final é do modelo conectado.",
    "- Não exponha raciocínio interno privado; comunique método resumido, evidências e limites.",
    "- Autonomia significa avançar em ações autorizadas e reversíveis; pause com checkpoint em risco alto ou bloqueio externo.",
    `- rationale: ${decision.rationale}`,
  ].join("\n");
}

/** Lightweight helper for tests and logging */
export function summarizeProDecision(d: ProCognitiveDecision): Record<string, unknown> {
  return {
    version: d.version,
    intent: d.intent,
    complexity: d.complexity,
    risk: d.risk,
    continuity: d.continuity,
    confidence: d.confidence,
    needsTools: d.needsTools,
    antiPatterns: d.antiPatterns.length,
    incrementalOnly: d.engineering.incrementalOnly,
    realDataOnly: d.engineering.realDataOnly,
  };
}
