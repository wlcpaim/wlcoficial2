/**
 * WLC.IA Cognitive Orchestrator v0.1
 * Deterministic decision-support layer: routes intent, estimates complexity/risk,
 * recommends tool policy and creates a compact, revisable task plan.
 * This is not a language model and does not expose private chain-of-thought.
 */
export type WlcIntent =
  | "conversation" | "question" | "learning" | "math" | "physics"
  | "research" | "planning" | "development" | "debugging"
  | "review" | "security" | "writing" | "unknown";

export type WlcComplexity = "low" | "medium" | "high";
export type WlcRisk = "low" | "medium" | "high";
export type WlcCognitiveDecision = {
  intent: WlcIntent;
  complexity: WlcComplexity;
  risk: WlcRisk;
  needsTools: boolean;
  needsClarification: boolean;
  suggestedActions: string[];
  plan: string[];
  rationale: string;
};

const normalize = (s: string) => s.toLocaleLowerCase("pt-BR")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s./:-]/g, " ");

const has = (s: string, terms: string[]) => terms.some(t => s.includes(t));

export function assessWlcRequest(input: string): WlcCognitiveDecision {
  const q = normalize(input.trim());
  const isMath = has(q, ["quanto e", "calcule", "calcul", "som", "subtr", "multiplic", "divid", "porcent", "raiz", "equacao", "expressao", "= "]) ||
    /(?:\d[\d.,]*)\s*[+\-*/^%]\s*\d/.test(q);
  const isPhysics = has(q, ["fisica", "velocidade", "aceleracao", "forca", "energia", "massa", "peso", "mru", "mruv", "newton", "eletric"]);
  const isDebug = has(q, ["bug", "erro", "falha", "debug", "quebrou", "corrigir", "corrige", "problema tecnico"]);
  const isSecurity = has(q, ["seguranca", "vulnerabilidade", "permissao", "token", "secret", "auth", "xss", "sql injection"]);
  const isReview = has(q, ["analise", "analisar", "revisar", "review", "auditar", "avaliar", "verifique"]);
  const isDev = has(q, ["criar", "implementar", "desenvolver", "programar", "codigo", "site", "app", "projeto", "arquivo", "refator", "otimizar", "atualizar"]);
  const isResearch = has(q, ["pesquise", "pesquisa", "procure", "buscar", "fonte", "documentacao", "atualizado", "compare"]);
  const isPlan = has(q, ["planeje", "plano", "etapas", "estrategia", "roadmap", "organizar"]);
  const isLearning = has(q, ["ensine", "explica", "explique", "aprender", "estudar", "como funciona", "tutorial"]);
  const isWriting = has(q, ["escreva", "redija", "legenda", "bio", "texto", "resuma", "reescreva"]);

  let intent: WlcIntent = "question";
  if (!q) intent = "unknown";
  else if (isSecurity) intent = "security";
  else if (isDebug) intent = "debugging";
  else if (isReview) intent = "review";
  else if (isDev) intent = "development";
  else if (isResearch) intent = "research";
  else if (isPlan) intent = "planning";
  else if (isMath) intent = "math";
  else if (isPhysics) intent = "physics";
  else if (isLearning) intent = "learning";
  else if (isWriting) intent = "writing";
  else if (q.length < 18 || has(q, ["oi", "ola", "bom dia", "boa tarde", "boa noite", "obrigado", "valeu"])) intent = "conversation";

  const complex = q.length > 450 || has(q, ["completo", "sistema inteiro", "arquitetura", "integracao", "multi", "automat", "do zero", "todas as", "projeto inteiro"]);
  const medium = q.length > 120 || ["development", "debugging", "review", "research", "planning", "security"].includes(intent);
  const complexity: WlcComplexity = complex ? "high" : medium ? "medium" : "low";
  const risk: WlcRisk = has(q, ["apagar", "deletar", "remover", "publicar", "deploy", "enviar", "comprar", "migracao", "migrate", "producao", "credencial", "token"]) ? "high"
    : ["development", "debugging", "review", "security"].includes(intent) ? "medium" : "low";

  const needsTools = ["research", "development", "debugging", "review", "security"].includes(intent) || isMath;
  const needsClarification = intent === "unknown" || (q.length < 5 && intent !== "conversation");
  const suggestedActions: string[] = [];
  if (intent === "math") suggestedActions.push("Validar o cálculo com a calculadora determinística e explicar as etapas.");
  if (intent === "physics") suggestedActions.push("Identificar dados, unidades e condições do modelo; conferir fórmulas e cálculos.");
  if (intent === "research") suggestedActions.push("Pesquisar em fontes adequadas, priorizando documentação e evidências atuais.");
  if (["development", "debugging", "review", "security"].includes(intent)) suggestedActions.push("Inspecionar contexto/arquivos relevantes antes de propor ou aplicar alterações.");
  if (intent === "development") suggestedActions.push("Definir arquitetura e critérios de aceite; implementar solução funcional ponta a ponta, revisar diff e executar validações disponíveis.");
  if (intent === "debugging") suggestedActions.push("Reproduzir ou delimitar o problema, examinar logs, testar hipótese, corrigir causa raiz e validar a correção com teste de regressão.");
  if (intent === "review" || intent === "security") suggestedActions.push("Reportar achados com evidência, impacto, prioridade e recomendações.");
  if (risk === "high") suggestedActions.push("Confirmar autorização antes de operações sensíveis, externas ou irreversíveis.");
  if (!needsTools) suggestedActions.push("Responder diretamente sem executar ferramentas desnecessárias.");

  const plan: string[] = intent === "development"
    ? ["Inspecionar projeto, stack, convenções, requisitos e estado atual.", "Definir arquitetura/abordagem e critérios de aceite; identificar riscos e dependências.", "Implementar mudanças completas, integradas e compatíveis, em etapas pequenas.", "Revisar diff, segurança, acessibilidade, responsividade, tipos e tratamento de erros.", "Executar testes, lint, typecheck e build disponíveis; corrigir falhas e reportar evidências e limitações."]
    : intent === "debugging"
      ? ["Reproduzir problema e coletar sintomas, logs, stack trace e contexto.", "Formular e testar hipóteses para localizar a causa raiz.", "Aplicar correção focada e adicionar teste de regressão quando possível.", "Executar validações relacionadas e verificar efeitos colaterais.", "Relatar causa, correção, evidências e riscos restantes."]
      : complexity === "low"
        ? ["Entender a pergunta e responder de forma direta.", "Checar consistência e declarar limites se houver."]
        : ["Definir objetivo, escopo e critérios de sucesso.", "Reunir contexto e evidências relevantes.", "Escolher a próxima ação útil e executar somente ações autorizadas.", "Validar o resultado e ajustar se necessário.", "Entregar síntese, evidências e pendências."];
  const rationale = `${intent} · complexidade ${complexity} · risco ${risk}`;
  return { intent, complexity, risk, needsTools, needsClarification, suggestedActions, plan, rationale };
}

export function formatWlcCognitiveContext(decision: WlcCognitiveDecision): string {
  return `## Orquestração cognitiva WLC.IA (decisão contextual)
- Intenção estimada: ${decision.intent}
- Complexidade: ${decision.complexity}
- Nível de risco: ${decision.risk}
- Ferramentas potencialmente úteis: ${decision.needsTools ? "sim, selecione apenas se forem necessárias" : "não; prefira resposta direta"}
- Esclarecimento necessário: ${decision.needsClarification ? "verifique se falta informação essencial" : "não faça perguntas desnecessárias"}
- Diretrizes de ação:
${decision.suggestedActions.map(a => `  - ${a}`).join("\n")}
- Plano adaptativo sugerido:
${decision.plan.map((p, i) => `  ${i + 1}. ${p}`).join("\n")}
O plano é orientativo: adapte-o ao contexto, evidências e resultados. Não exponha raciocínio interno privado; comunique uma síntese breve do método e da conclusão.`;
}
