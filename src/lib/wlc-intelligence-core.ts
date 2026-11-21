/**
 * WLC.IA Integrated Intelligence Core v1.
 * Deterministic conversation/task framing. The connected language model remains
 * responsible for semantic interpretation; this module supplies observable signals.
 */
export type WlcInteractionMode =
  | "conversation" | "answer" | "clarify" | "plan" | "research"
  | "create" | "modify" | "debug" | "review" | "execute";

export type WlcIntelligenceFrame = {
  mode: WlcInteractionMode;
  continuity: "new_topic" | "follow_up" | "correction" | "continuation" | "unclear";
  objective: string;
  constraints: string[];
  missingInformation: string[];
  requiresPlan: boolean;
  requiresTools: boolean;
  risk: "low" | "medium" | "high";
  autonomy: "advanced";
  confidence: "low" | "medium" | "high";
  nextBestAction: string;
};

const normalize = (value: string) => value.toLocaleLowerCase("pt-BR")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
const includesAny = (value: string, terms: string[]) => terms.some(term => value.includes(term));

function recentUserTurns(history: Array<{ role: string; content: string }>, limit = 5): string[] {
  return history.filter(item => item.role === "user").slice(-limit).map(item => item.content);
}

export function buildWlcIntelligenceFrame(
  message: string,
  history: Array<{ role: string; content: string }> = [],
): WlcIntelligenceFrame {
  const current = message.trim();
  const q = normalize(current);
  const previousTurns = recentUserTurns(history);
  const hasHistory = previousTurns.length > 0;
  const correction = includesAny(q, ["na verdade", "corrigindo", "quis dizer", "em vez disso", "troque", "substitua", "ajuste", "corrige", "corrigir"]);
  const continuation = includesAny(q, ["continue", "continuar", "prossiga", "vamos continuar", "proximo passo", "siga de onde", "retome"]);
  const followUp = hasHistory && includesAny(q, ["isso", "esse", "essa", "aquele", "aquela", "ele", "ela", "o projeto", "a ideia", "como falei", "com base nisso", "e agora", "entao"]);

  let continuity: WlcIntelligenceFrame["continuity"] = "new_topic";
  if (correction) continuity = "correction";
  else if (continuation) continuity = "continuation";
  else if (followUp) continuity = "follow_up";
  else if (hasHistory && q.length < 8) continuity = "unclear";

  const isDebug = includesAny(q, ["bug", "erro", "falha", "debug", "quebrou", "nao funciona", "corrigir erro"]);
  const isReview = includesAny(q, ["auditoria", "auditar", "revisar", "revisao", "analise", "analisar", "avaliar", "verifique"]);
  const isResearch = includesAny(q, ["pesquise", "pesquisar", "pesquisa", "fontes atuais", "procure na internet", "compare opcoes"]);
  const isPlan = includesAny(q, ["plano", "planejar", "planeje", "estrategia", "roadmap", "etapas", "prioridades"]);
  const isCreate = includesAny(q, ["crie", "criar", "construa", "construir", "desenvolva", "desenvolver", "implemente", "implementar", "escreva", "gerar"]);
  const isModify = includesAny(q, ["altere", "alterar", "mude", "modifique", "modificar", "ajuste", "atualize", "atualizar", "adicione", "adicionar", "remova", "remover"]);
  const explicitExecution = includesAny(q, ["execute", "executar", "publique", "publicar", "envie", "enviar", "instale", "instalar", "rode", "rodar"]);

  let mode: WlcInteractionMode = "answer";
  if (!q || includesAny(q, ["oi", "ola", "bom dia", "boa tarde", "boa noite", "obrigado", "valeu"])) mode = "conversation";
  else if (isDebug) mode = "debug";
  else if (isReview) mode = "review";
  else if (explicitExecution) mode = "execute";
  else if (isResearch) mode = "research";
  else if (isModify) mode = "modify";
  else if (isCreate) mode = "create";
  else if (isPlan) mode = "plan";
  else if (current.length < 12 && hasHistory) mode = "clarify";

  const requiresPlan = ["plan", "create", "modify", "debug", "review", "execute"].includes(mode) ||
    current.length > 500 || includesAny(q, ["projeto inteiro", "sistema completo", "arquitetura", "todas as funcionalidades"]);
  const requiresTools = ["research", "debug", "review", "execute"].includes(mode) ||
    (["create", "modify"].includes(mode) && includesAny(q, ["codigo", "arquivo", "repositorio", "projeto"]));
  const highRisk = includesAny(q, ["apagar", "deletar", "excluir", "publicar", "deploy", "producao", "pagamento", "comprar", "credencial", "senha", "token", "migracao"]);
  const risk: WlcIntelligenceFrame["risk"] = highRisk ? "high" : (requiresTools || requiresPlan) ? "medium" : "low";

  const constraints: string[] = [];
  if (includesAny(q, ["sem ", "nao use", "preserve", "manter", "exatamente", "apenas"])) constraints.push("Preservar restrições explícitas; não tratá-las como sugestões.");
  if (includesAny(q, ["pouco dinheiro", "orcamento", "barato", "baixo custo"])) constraints.push("Considerar a limitação de orçamento nas recomendações.");
  if (includesAny(q, ["prazo", "urgente", "hoje", "ate "])) constraints.push("Considerar o prazo declarado e explicitar impactos no escopo.");
  if (hasHistory && continuity !== "new_topic") constraints.push("Usar o histórico recente para resolver referências e preservar decisões anteriores; não pedir novamente dados já fornecidos.");

  const missingInformation: string[] = [];
  if (mode === "clarify" || continuity === "unclear") missingInformation.push("O referente ou resultado esperado não está suficientemente claro.");
  const confidence: WlcIntelligenceFrame["confidence"] = continuity === "unclear" || mode === "clarify" ? "low" : (q.length < 20 ? "medium" : "high");
  const nextBestAction = mode === "conversation" ? "Responder naturalmente e acompanhar o rumo da conversa." :
    mode === "clarify" ? "Fazer uma única pergunta objetiva sobre a informação essencial ausente." :
    mode === "plan" ? "Construir um plano proporcional com objetivo, etapas, prioridades, riscos e critérios de sucesso." :
    mode === "research" ? "Pesquisar fontes adequadas, comparar evidências e separar fatos de inferências." :
    ["create", "modify"].includes(mode) ? "Inspecionar o contexto, implementar a mudança solicitada e validar o resultado." :
    mode === "debug" ? "Reproduzir o problema, localizar a causa provável, corrigir e testar regressões." :
    mode === "review" ? "Avaliar com evidências, severidade, impacto e recomendações acionáveis." :
    mode === "execute" ? "Verificar permissões e consequências; executar apenas dentro do escopo autorizado." :
    "Responder diretamente, usando o contexto relevante e explicitando incertezas.";

  return { mode, continuity, objective: current.slice(0, 1200), constraints, missingInformation,
    requiresPlan, requiresTools, risk, autonomy: "advanced", confidence, nextBestAction };
}

export function formatWlcIntelligenceContext(frame: WlcIntelligenceFrame): string {
  return [
    "## WLC.IA Integrated Intelligence Core",
    `- Modo de interação estimado: ${frame.mode}`,
    `- Continuidade conversacional: ${frame.continuity}`,
    `- Confiança dos sinais determinísticos: ${frame.confidence} (não é confiança factual nem substitui interpretação semântica)`,
    `- Objetivo declarado nesta mensagem: ${frame.objective || "(mensagem vazia)"}`,
    `- Risco operacional estimado: ${frame.risk}`,
    `- Planejamento estruturado recomendado: ${frame.requiresPlan ? "sim" : "não"}`,
    `- Ferramentas podem ser úteis: ${frame.requiresTools ? "sim, somente se disponíveis e necessárias" : "não necessariamente"}`,
    `- Próxima ação preferencial: ${frame.nextBestAction}`,
    `- Restrições observadas: ${frame.constraints.length ? frame.constraints.join(" ") : "nenhuma extraída deterministicamente; procure restrições semânticas no texto e no histórico."}`,
    `- Informação potencialmente ausente: ${frame.missingInformation.length ? frame.missingInformation.join(" ") : "nenhuma lacuna essencial detectada por regras."}`,
    "",
    "### Contrato de comportamento",
    "- Interprete semanticamente a mensagem atual junto do histórico disponível; os rótulos acima são sinais auxiliares, não uma verdade absoluta.",
    "- Diferencie pedido explícito, intenção provável, contexto lembrado e inferência. Não invente preferências, fatos ou histórico.",
    "- Adapte profundidade e formato ao problema. Não force plano, pesquisa ou ferramentas em uma conversa simples.",
    "- Para objetivos complexos, proponha etapas, dependências, prioridades, alternativas, riscos e critérios verificáveis.",
    "- Autonomia avançada significa iniciativa dentro das permissões: execute ações reversíveis e autorizadas; peça confirmação para ações externas, destrutivas, financeiras, sensíveis ou irreversíveis.",
    "- Após agir, observe o resultado, valide contra os critérios e replaneje quando houver evidência de falha.",
    "- Não alegue memória persistente, aprendizado dos pesos do modelo, execução ou validação sem suporte real.",
    "- Entregue conclusões, decisões e justificativas resumidas; não exponha raciocínio interno privado.",
  ].join("\n");
}
