/**
 * WLC.IA Project Creation Intelligence v1.0
 * Turns a creation request into an evidence-aware product brief before code generation.
 * Domain modules are suggestions, never silently-added requirements.
 */
export const WLC_PROJECT_CREATION_INTELLIGENCE_VERSION = "1.0.0";

export type ProjectCreationSignal =
  | "dashboard" | "fintech" | "pdv" | "ecommerce" | "saas" | "crm"
  | "admin" | "portfolio" | "game" | "booking" | "social" | "generic";
export type ProjectCreationBrief = {
  request: string;
  detected: ProjectCreationSignal[];
  confidence: "high" | "medium" | "low";
  recommendedModules: string[];
  coreWorkflows: string[];
  candidateEntities: string[];
  candidateRoutes: string[];
  acceptanceCriteria: string[];
  risks: string[];
  openQuestions: string[];
  designDirection: string[];
};

const normalize = (text: string) => (text ?? "").toLocaleLowerCase("pt-BR")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const patterns: Array<[ProjectCreationSignal, RegExp]> = [
  ["pdv", /\bpdv\b|ponto de venda|caixa de loja|checkout de balcao/],
  ["fintech", /fintech|financeir|bancari|roi|fluxo de caixa|investimento/],
  ["ecommerce", /e-?commerce|loja virtual|marketplace|carrinho|catalogo|checkout online/],
  ["saas", /saas|multi.?tenant|assinatura|workspace|plataforma/],
  ["crm", /\bcrm\b|clientes|leads|pipeline comercial|vendas/],
  ["dashboard", /dashboard|painel|analytics|indicadores|relatorios|relatorio/],
  ["admin", /admin|backoffice|gestao|gerenciamento/],
  ["portfolio", /portfolio|agencia|estudio|landing page/],
  ["game", /\bjogo\b|\bgame\b|gamifica|arcade/],
  ["booking", /agenda|agendamento|reservas|booking/],
  ["social", /rede social|comunidade|feed|chat|mensagens/],
];
const moduleMap: Record<ProjectCreationSignal, string[]> = {
  pdv: ["Venda/checkout com fluxo rápido", "Catálogo e busca de produtos", "Carrinho e cálculo de totais/descontos", "Controle de caixa (abertura, movimentações e fechamento)", "Estoque e alertas de reposição", "Histórico de vendas e comprovantes", "Permissões por operador e trilha de auditoria"],
  fintech: ["Visão consolidada com indicadores e período selecionável", "Movimentações categorizadas", "Receitas, despesas e saldo", "Relatórios e exportação", "Regras de cálculo transparentes e validação de dados", "Autenticação e proteção de dados sensíveis"],
  ecommerce: ["Catálogo, categorias e busca", "Detalhes do produto", "Carrinho e checkout", "Pedidos e estados de pagamento/entrega", "Gestão de produtos e pedidos", "Estados vazios, falhas e confirmação"],
  saas: ["Onboarding e configuração do workspace", "Autenticação e recuperação de acesso", "Membros, roles e permissões", "Configurações e billing (se solicitado)", "Limites claros de isolamento entre tenants", "Logs e estado de assinatura (se houver cobrança)"],
  crm: ["Cadastro e perfil de cliente/lead", "Pipeline e etapas configuráveis", "Registro de interações e tarefas", "Busca, filtros e histórico", "Indicadores de conversão", "Importação/exportação controlada"],
  dashboard: ["KPIs com definição e período explícitos", "Filtros e comparação temporal quando relevantes", "Gráficos que respondem a dados reais", "Tabelas com busca, ordenação e paginação", "Estados loading/empty/error", "Exportação quando fizer sentido"],
  admin: ["Visão geral", "Listagem com busca e filtros", "Detalhes e ações CRUD autorizadas", "Configurações", "Auditoria de ações", "Estados e confirmação de ações destrutivas"],
  portfolio: ["Apresentação clara da proposta/identidade", "Projetos ou serviços com conteúdo realista", "Navegação e contato/CTA", "Responsividade e SEO", "Performance e acessibilidade"],
  game: ["Loop principal de jogo", "Controles e feedback", "Estados início/pausa/fim", "Progressão e regras", "Persistência apenas se necessária", "Performance e compatibilidade de entrada"],
  booking: ["Disponibilidade e calendário", "Seleção de serviço/slot", "Confirmação e cancelamento", "Prevenção de conflitos de horário", "Lembretes/status quando configurados", "Painel de gestão"],
  social: ["Perfil e preferências", "Feed ou espaço principal", "Criar/editar conteúdo", "Interações e moderação", "Mensagens/notificações apenas se solicitadas", "Privacidade e controles de usuário"],
  generic: ["Fluxo principal identificado no pedido", "Navegação orientada às tarefas", "Dados e estados explícitos", "Feedback para ações", "Tratamento de falhas e vazio", "Validação e acessibilidade"],
};
const entities: Record<ProjectCreationSignal, string[]> = {
  pdv: ["Produto", "Venda", "ItemVenda", "Operador", "Caixa", "MovimentoCaixa", "Estoque"],
  fintech: ["Conta", "Transação", "Categoria", "Orçamento", "Relatório"],
  ecommerce: ["Produto", "Categoria", "Carrinho", "Pedido", "Cliente", "Pagamento"],
  saas: ["Workspace", "Usuário", "Membership", "Role", "Configuração"],
  crm: ["Contato", "Lead", "Oportunidade", "Atividade", "Etapa"],
  dashboard: ["Métrica", "Registro de origem", "Filtro/Período"],
  admin: ["Usuário", "Registro gerenciado", "Evento de auditoria"],
  portfolio: ["Projeto", "Serviço", "Conteúdo", "Contato"],
  game: ["Estado do jogo", "Entidade jogável", "Progresso"],
  booking: ["Serviço", "Disponibilidade", "Reserva", "Cliente"],
  social: ["Perfil", "Publicação", "Interação", "Preferência"],
  generic: ["Entidades derivadas do caso de uso (definir antes de persistir)"],
};
const routes: Record<ProjectCreationSignal, string[]> = {
  pdv: ["/sales", "/products", "/inventory", "/cash", "/reports", "/settings"],
  fintech: ["/overview", "/transactions", "/budgets", "/reports", "/settings"],
  ecommerce: ["/", "/products/:slug", "/cart", "/checkout", "/orders", "/admin"],
  saas: ["/app", "/onboarding", "/workspace/settings", "/members", "/billing (se requerido)"],
  crm: ["/dashboard", "/contacts", "/pipeline", "/activities", "/reports"],
  dashboard: ["/overview", "/reports", "/settings (se requerido)"],
  admin: ["/overview", "/records", "/records/:id", "/settings", "/audit"],
  portfolio: ["/", "/projects", "/about", "/contact"],
  game: ["/game", "/settings", "/help (se requerido)"],
  booking: ["/services", "/availability", "/booking/confirm", "/manage"],
  social: ["/feed", "/profile", "/create", "/settings"],
  generic: ["Definir rotas a partir das tarefas essenciais; evitar páginas por convenção sem necessidade."],
};

export function analyzeProjectCreationRequest(request: string): ProjectCreationBrief {
  const q = normalize(request);
  const detected = patterns.filter(([, regex]) => regex.test(q)).map(([signal]) => signal);
  const signals: ProjectCreationSignal[] = detected.length ? detected : ["generic"];
  const confidence = detected.length >= 2 ? "high" : detected.length === 1 ? "medium" : "low";
  const modules = [...new Set(signals.flatMap((s) => moduleMap[s]))];
  const candidateEntities = [...new Set(signals.flatMap((s) => entities[s]))];
  const candidateRoutes = [...new Set(signals.flatMap((s) => routes[s]))];
  return {
    request,
    detected: signals,
    confidence,
    recommendedModules: modules,
    coreWorkflows: [
      "Identificar a tarefa principal do usuário e o caminho mais curto para concluí-la.",
      "Definir entradas, validações, resultado esperado e recuperação de erro em cada fluxo.",
      "Mapear estados de carregamento, vazio, sucesso, falha e indisponibilidade.",
      "Validar persistência e consistência; não usar dados de demonstração como se fossem dados reais.",
    ],
    candidateEntities,
    candidateRoutes,
    acceptanceCriteria: [
      "O fluxo central pode ser concluído de ponta a ponta sem controles falsos ou ações sem resposta.",
      "Todos os campos têm validação e feedback; erros são recuperáveis quando possível.",
      "Layout é utilizável em mobile e desktop, teclado e leitor de tela considerados.",
      "Dados, gráficos e métricas derivam de fonte definida; fórmulas e unidades são documentadas.",
      "Build e testes relevantes passam; limitações não testadas são declaradas.",
    ],
    risks: [
      "Requisitos inferidos podem não corresponder ao produto: trate módulos/rotas/entidades como propostas, confirme itens críticos.",
      "Evitar criar CRUD, telas, integrações ou autenticação que não agreguem ao fluxo solicitado.",
      "Não inventar dados, resultados, métricas, endpoints ou capacidade de infraestrutura.",
    ],
    openQuestions: confidence === "low" ? ["Qual é o objetivo principal e quem usará?", "Quais ações são indispensáveis e quais ficam fora do escopo?"] : [],
    designDirection: [
      "Escolher identidade visual pelo público, contexto e tipo de produto; não repetir automaticamente sidebar + cards + gradiente.",
      "Variar estrutura quando apropriado (workspace, navegação lateral, tabs, fluxo guiado, editorial ou canvas).",
      "Priorizar hierarquia, densidade informacional e estados funcionais antes de decoração.",
      "Design deve servir o uso: dados densos para operações, conteúdo editorial para leitura, fluxo focado para conversão.",
    ],
  };
}

export function formatProjectCreationIntelligence(brief: ProjectCreationBrief): string {
  return [
    `## WLC.IA Project Creation Intelligence v${WLC_PROJECT_CREATION_INTELLIGENCE_VERSION}`,
    `Sinais detectados: ${brief.detected.join(", ")} (confiança ${brief.confidence}; heurística, confirme pelo contexto).`,
    "Antes de gerar arquivos, transforme o pedido em uma especificação funcional concisa. As listas abaixo são hipóteses de apoio, não autorização para inflar o escopo.",
    "### Módulos candidatos", ...brief.recommendedModules.map((x) => `- ${x}`),
    "### Fluxos essenciais", ...brief.coreWorkflows.map((x) => `- ${x}`),
    "### Entidades candidatas", ...brief.candidateEntities.map((x) => `- ${x}`),
    "### Rotas candidatas", ...brief.candidateRoutes.map((x) => `- ${x}`),
    "### Critérios de aceite", ...brief.acceptanceCriteria.map((x) => `- ${x}`),
    "### Riscos", ...brief.risks.map((x) => `- ${x}`),
    "### Direção de produto/design", ...brief.designDirection.map((x) => `- ${x}`),
    brief.openQuestions.length ? `### Lacunas importantes\n${brief.openQuestions.map((x) => `- ${x}`).join("\n")}` : "",
    "Não implemente cada sugestão automaticamente: selecione somente o que é necessário para cumprir o pedido e deixe explícitas as suposições relevantes.",
  ].filter(Boolean).join("\n");
}
