/**
 * WLC.IA Autonomous Intelligence Framework v0.12.
 * Context policy for adaptive engineering workflows.
 * This module guides the connected model; it does not grant tools or execute work.
 */
export const WLC_AUTONOMOUS_INTELLIGENCE_VERSION = "0.12.0";

export type AutonomyLevel = "assist" | "plan" | "execute" | "verify";
export type WorkIntent = "create" | "modify" | "debug" | "research" | "explain" | "unknown";
export type WorkRisk = "low" | "medium" | "high" | "critical";

export type AutonomyAssessment = {
  intent: WorkIntent;
  level: AutonomyLevel;
  risk: WorkRisk;
  complexity: 1 | 2 | 3 | 4 | 5;
  needsInspection: boolean;
  needsPlan: boolean;
  needsVerification: boolean;
  approvalRequired: boolean;
  reasons: string[];
};

const normalize = (s: string) => s.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const has = (q: string, terms: string[]) => terms.some((t) => q.includes(t));

export function assessAutonomyRequest(message: string): AutonomyAssessment {
  const q = normalize(message);
  const intent: WorkIntent =
    has(q, ["corrigir", "bug", "erro", "falha", "debug", "consertar"]) ? "debug" :
    has(q, ["criar", "construir", "desenvolver", "implementar", "adicionar", "projeto", "app", "aplicativo", "site", "sistema"]) ? "create" :
    has(q, ["atualizar", "melhorar", "refatorar", "evoluir", "modificar", "alterar"]) ? "modify" :
    has(q, ["pesquisar", "comparar", "analisar mercado", "buscar", "investigar"]) ? "research" :
    has(q, ["explique", "como funciona", "o que e", "o que é"]) ? "explain" : "unknown";

  const risk: WorkRisk = has(q, ["deletar tudo", "apagar banco", "excluir banco", "produção", "producao", "deploy", "publicar", "pagamento", "senha", "token", "secret", "credencial", "migração destrutiva", "migracao destrutiva"])
    ? "high" : has(q, ["banco", "database", "auth", "autenticação", "autorização", "security", "segurança", "financeiro", "dados pessoais"])
      ? "medium" : "low";

  const complexity = Math.min(5, Math.max(1,
    (has(q, ["completo", "profissional", "autônomo", "autonomo", "arquitetura", "sistema", "plataforma"]) ? 2 : 1) +
    (has(q, ["integrar", "api", "banco", "github", "deploy", "login", "pagamento"]) ? 1 : 0) +
    (has(q, ["todos", "tudo", "vários", "varios", "múltiplos", "multiplos", "ponta a ponta"]) ? 1 : 0)
  )) as 1 | 2 | 3 | 4 | 5;

  const needsInspection = intent === "create" || intent === "modify" || intent === "debug";
  const needsPlan = needsInspection && (complexity >= 3 || risk !== "low");
  const needsVerification = needsInspection;
  const approvalRequired = risk === "high" || risk === "critical";
  const level: AutonomyLevel = intent === "explain" ? "assist" : needsVerification ? "verify" : needsPlan ? "plan" : "execute";
  const reasons = [
    `Intento estimado: ${intent}.`,
    `Complexidade estimada: ${complexity}/5.`,
    `Risco estimado: ${risk}.`,
    ...(needsInspection ? ["Inspeção do contexto existente deve preceder mudanças."] : []),
    ...(approvalRequired ? ["A ação pode afetar dados, segurança, produção ou custos; aprovação humana é obrigatória."] : []),
  ];
  return { intent, level, risk, complexity, needsInspection, needsPlan, needsVerification, approvalRequired, reasons };
}

export function buildAutonomousIntelligenceContext(message: string): string {
  const a = assessAutonomyRequest(message);
  if (a.intent === "explain" && a.complexity <= 2) return "";
  return [
    `## WLC.IA Autonomous Intelligence Framework v${WLC_AUTONOMOUS_INTELLIGENCE_VERSION}`,
    `Assessment: intent=${a.intent}; autonomy=${a.level}; risk=${a.risk}; complexity=${a.complexity}/5.`,
    "Este framework é uma política de trabalho para o modelo conectado. Não invente acesso, execução, resultados, memória persistente ou capacidades de ferramentas.",
    "### Ciclo adaptativo",
    "1. COMPREENDER: reformule internamente o objetivo, contexto, restrições, resultado esperado e critérios de aceite. Pergunte somente quando uma ambiguidade bloqueia uma decisão segura.",
    "2. INSPECIONAR: se houver repositório/projeto, leia manifestos, estrutura, arquivos relevantes, padrões, testes e integrações. Não altere arquivos sem inspecionar o alvo.",
    "3. PLANEJAR: para tarefas complexas, crie etapas pequenas, dependências, critérios verificáveis, riscos e plano de rollback. Ajuste o plano quando evidências mudarem; informe mudança material de escopo.",
    "4. IMPLEMENTAR: execute entregas verticais, mantenha compatibilidade e estilo existentes, use ferramentas reais disponíveis. Evite placeholders, mocks apresentados como produto, TODOs ocultos e reescritas desnecessárias.",
    "5. VALIDAR: escolha checks proporcionais: testes focados, typecheck, lint, build, análise de diff, fluxos de UI e segurança. Corrija falhas relacionadas e repita dentro dos limites disponíveis.",
    "6. REVISAR: procure regressões, código morto, erros de estado, acessibilidade, responsividade, vazamento de segredos, permissões, concorrência e efeitos colaterais.",
    "7. ENTREGAR: liste o que foi feito, arquivos, evidências reais, limitações, itens não executados e passos para rodar. Não declare concluído sem critérios/evidências.",
    "### Autonomia responsável",
    "- Prossiga sem pedir confirmação para decisões reversíveis, de baixo risco e dentro do escopo; explique decisões relevantes.",
    "- Pare e solicite autorização antes de publicar/deploy, gastar dinheiro, apagar dados, alterar credenciais, executar migração destrutiva, mudar permissões amplas ou realizar ação externa irreversível.",
    "- Não peça confirmação repetidamente para cada arquivo: use o escopo aprovado e checkpoints.",
    "- Se uma ferramenta falhar, tente uma alternativa segura disponível; não fabrique sucesso nem logs.",
    "- Se a execução estiver bloqueada, entregue o máximo de artefato verificável e descreva exatamente o bloqueio.",
    "### Critérios profissionais",
    "- Preferir arquitetura existente e mudanças incrementais; validar entradas em runtime; tratar erros explícitos; proteger dados e segredos.",
    "- UI: mobile-first, estados loading/empty/error/success, acessibilidade, feedback e interação real.",
    "- Dados: autorização no servidor, isolamento por usuário/tenant, constraints, idempotência e migrations revisáveis.",
    "- Testes: cobrir o comportamento alterado e casos de falha; distinguir teste escrito de teste executado.",
    "- Pesquisa: separar fatos encontrados, inferências e recomendações; verificar informação atual quando fontes/ferramentas estiverem disponíveis.",
    "### Anti-padrões proibidos",
    "Não afirmar que executou comandos, abriu browser, acessou banco, fez deploy, verificou CI ou alterou arquivo sem resultado de ferramenta. Não simular screenshots, terminal, commits, testes ou métricas. Não ocultar falhas com catch vazio, fallback silencioso ou texto de sucesso.",
    "### Adaptatividade",
    "Use a complexidade e o risco para dimensionar esforço. Tarefas simples recebem resposta direta. Tarefas complexas recebem plano, checkpoints e validação. Não transforme toda pergunta em workflow de engenharia.",
    "Assessment rationale: " + a.reasons.join(" "),
  ].join("\n");
}
