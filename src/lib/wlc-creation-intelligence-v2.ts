/**
 * WLC.IA Creation Intelligence v2.0
 * ---------------------------------------------------------------------------
 * Camada determinística que eleva o chat de criação de "amador" para "profissional":
 *
 *  1. Detecção de intenção de criação (inclui imperativos: "crie", "monte", "preciso de...")
 *  2. Classificação de domínio por PONTUAÇÃO ponderada (domínio primário + secundários)
 *  3. Blueprint de produto: entidades com campos/relações, invariantes de negócio,
 *     máquinas de estado, permissões, casos de borda, KPIs e integrações que NÃO podem ser fingidas
 *  4. Extração de requisitos explícitos, restrições e suposições declaradas
 *  5. Complexidade (0–100) → escopo em camadas (MVP / Núcleo / Depois) e fases com portões de verificação
 *  6. Auditoria de código gerado (padrões amadores: botões falsos, dados inventados, lorem ipsum,
 *     falta de estados loading/empty/error, a11y, etc.) com nota e prompt de auto-correção
 *
 * Este módulo NÃO chama LLM, NÃO executa código e NÃO concede permissões.
 * Produz sinais estruturados e texto de política para o modelo conectado.
 * Sem dependências externas (roda em qualquer runtime e é testável isoladamente).
 */

export const WLC_CREATION_INTELLIGENCE_V2_VERSION = "2.0.0";

/* ------------------------------------------------------------------ tipos */

export type CreationDomain =
  | "pdv" | "inventory" | "fintech" | "ecommerce" | "saas" | "crm" | "dashboard" | "admin"
  | "landing" | "game" | "audio" | "booking" | "social" | "education" | "delivery" | "cms"
  | "utility" | "generic";

export type CreationTier = "simple" | "standard" | "complex" | "enterprise";
export type CreationMode = "chat" | "plan" | "build" | undefined;

export type EntitySpec = { name: string; fields: string[]; relations?: string[] };
export type StateMachineSpec = { name: string; states: string[]; transitions: string[] };

export type DomainKnowledge = {
  label: string;
  entities: EntitySpec[];
  invariants: string[];
  stateMachines: StateMachineSpec[];
  permissions: string[];
  edgeCases: string[];
  kpis: string[];
  neverFake: string[];
  routes: string[];
  ux: string[];
  modules: string[];
};

export type DomainScore = { domain: CreationDomain; score: number };

export type CreationRequirement = { id: string; text: string; kind: "explicit" | "inferred" };

export type CreationPhase = { name: string; goals: string[]; exitCriteria: string[] };

export type CreationBlueprint = {
  version: string;
  request: string;
  isCreation: boolean;
  primary: CreationDomain;
  secondary: CreationDomain[];
  ranking: DomainScore[];
  confidence: "high" | "medium" | "low";
  platform: "web" | "mobile-web" | "game" | "api" | "unknown";
  constraints: string[];
  requirements: CreationRequirement[];
  assumptions: string[];
  complexityScore: number;
  tier: CreationTier;
  scope: { mvp: string[]; core: string[]; later: string[] };
  knowledge: DomainKnowledge;
  phases: CreationPhase[];
  qualityBar: string[];
  openQuestions: string[];
};

/* --------------------------------------------------------- normalização */

const normalize = (text: string): string =>
  (text ?? "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const uniq = <T>(items: T[]): T[] => [...new Set(items)];

/* ------------------------------------------------- intenção de criação */

const CREATE_VERBS =
  /\b(cri(ar|e|a|ando)|desenvolv(er|a|e)|implement(ar|e|a)|ger(ar|e|a)|constru(ir|a|i)|mont(ar|e|a)|fa(z|ca|ze|zer|zendo)|program(ar|e|a)|projet(ar|e|a)|elabor(ar|e|a)|prepar(ar|e|a)|bol(ar|e|a))\b/;
const NEED_PHRASES =
  /\b(preciso de|quero (um|uma|o|a|ter|fazer|criar)|me (faz|faca|cria|crie|monta|monte)|gostaria de (um|uma|criar)|vamos (criar|fazer|montar|construir)|novo (site|app|projeto|sistema|jogo|painel|dashboard|landing))\b/;
const ARTIFACT_NOUNS =
  /\b(site|app|aplicativo|aplicacao|sistema|plataforma|jogo|game|painel|dashboard|landing|loja|pdv|crm|erp|portal|blog|api|ferramenta|calculadora|extensao|bot|template|interface|tela|pagina|sequenciador|player|editor|gerador|conversor|simulador|plugin|biblioteca|componente|formulario|cardapio|agenda|catalogo)\b/;
const NOT_CREATION =
  /\b(apenas explique|so explique|o que e|como funciona|qual a diferenca|por que|porque|bug|erro|corrig(ir|e)|refator(ar|e) so|explique|me explica|duvida)\b/;

export function isCreationRequest(message: string): boolean {
  const q = normalize(message);
  if (!q.trim()) return false;
  if (NOT_CREATION.test(q) && !/\b(e depois|em seguida)\b.*\b(cri|mont|constru)/.test(q)) {
    // "corrigir bug" / "explique" sem verbo de criação explícito => não é criação
    if (!CREATE_VERBS.test(q) || /\b(corrig|bug|erro|explique|me explica)\b/.test(q)) return false;
  }
  // Substantivo explícito OU domínio forte (ex.: "web audio", "funil de vendas") conta como artefato.
  const hasNoun = ARTIFACT_NOUNS.test(q) || (scoreDomains(message)[0]?.score ?? 0) >= 4;
  return (CREATE_VERBS.test(q) && hasNoun) || (NEED_PHRASES.test(q) && hasNoun) || /\bnovo (site|app|projeto|sistema|jogo)\b/.test(q);
}

/* -------------------------------------------- pontuação de domínio */

type Signal = [RegExp, number];
const DOMAIN_SIGNALS: Record<Exclude<CreationDomain, "generic">, Signal[]> = {
  pdv: [[/\bpdv\b/, 6], [/ponto de venda/, 6], [/\bcaixa\b/, 3], [/frente de caixa/, 5], [/cupom|nfc-?e|comprovante/, 2], [/operador/, 1], [/balcao/, 2]],
  inventory: [[/estoque/, 4], [/inventario/, 4], [/\berp\b/, 4], [/fornecedor|compras/, 2], [/reposicao|ponto de pedido/, 3], [/almoxarifado|armazem/, 3]],
  fintech: [[/fintech/, 5], [/financeir/, 4], [/fluxo de caixa/, 5], [/\broi\b/, 3], [/investiment/, 3], [/carteira|extrato|saldo/, 2], [/orcamento/, 2], [/bancari/, 4]],
  ecommerce: [[/e-?commerce/, 6], [/loja virtual/, 6], [/marketplace/, 4], [/carrinho/, 3], [/catalogo/, 2], [/checkout/, 3], [/vitrine/, 2]],
  saas: [[/saas/, 6], [/multi.?tenant/, 6], [/assinatura/, 3], [/workspace/, 2], [/planos? (pro|free|premium)/, 3]],
  crm: [[/\bcrm\b/, 6], [/\bleads?\b/, 4], [/pipeline/, 3], [/funil de vendas/, 4], [/clientes/, 1], [/oportunidade/, 2]],
  dashboard: [[/dashboard/, 5], [/painel/, 3], [/analytics/, 4], [/indicadores|kpis?/, 4], [/relatorios?/, 2], [/graficos?/, 2]],
  admin: [[/\badmin\b/, 4], [/backoffice/, 5], [/gestao|gerenciamento|gerenciar/, 2], [/painel administrativo/, 5]],
  landing: [[/landing/, 5], [/portfolio/, 5], [/site institucional/, 5], [/agencia|estudio/, 2], [/\bsite\b/, 1], [/apresentacao da marca|pagina de vendas/, 4]],
  game: [[/\bjogo\b|\bgame\b/, 5], [/arcade/, 4], [/fase|nivel|inimigo|pontuacao|score/, 2], [/corrida|plataforma 2d|rpg|puzzle/, 3], [/canvas|sprite|colisao/, 3]],
  audio: [[/\bmusica\b|\baudio\b|\bsom\b/, 3], [/sequenciador|synth|sintetizador|beat|daw/, 6], [/player de (musica|audio)/, 5], [/web audio|midi/, 6], [/playlist/, 3]],
  booking: [[/agendamento|agenda/, 4], [/reservas?/, 4], [/booking/, 5], [/horario disponivel|disponibilidade/, 3], [/consulta|barbearia|salao/, 2]],
  social: [[/rede social/, 6], [/\bfeed\b/, 4], [/comunidade/, 3], [/mensagens|chat entre/, 2], [/seguir|curtir|comentarios/, 3]],
  education: [[/curso|aula|escola|alunos?/, 3], [/\blms\b|plataforma de ensino/, 6], [/quiz|prova|simulado/, 3], [/trilha de aprendizado/, 4]],
  delivery: [[/delivery/, 5], [/restaurante|cardapio|pizzaria|lanchonete/, 4], [/pedido(s)? online/, 3], [/entregador|rastreamento de entrega/, 4]],
  cms: [[/\bblog\b/, 4], [/\bcms\b/, 6], [/artigos?|publicacoes/, 2], [/editor de conteudo|rich text|markdown/, 4]],
  utility: [[/calculadora/, 5], [/conversor/, 5], [/gerador de/, 3], [/ferramenta (simples|online)/, 3], [/extensao/, 2], [/\bto-?do\b|lista de tarefas|kanban/, 4]],
};

const PLATFORM: Array<[CreationBlueprint["platform"], RegExp]> = [
  ["game", /\bjogo\b|\bgame\b|canvas|sprite/],
  ["mobile-web", /mobile|celular|pwa|app de celular|responsiv/],
  ["api", /\bapi\b|webhook|backend only|servico http/],
  ["web", /site|web|dashboard|painel|sistema|plataforma|landing|loja/],
];

export function scoreDomains(request: string): DomainScore[] {
  const q = normalize(request);
  const out: DomainScore[] = [];
  for (const [domain, signals] of Object.entries(DOMAIN_SIGNALS) as [Exclude<CreationDomain, "generic">, Signal[]][]) {
    let score = 0;
    for (const [rx, w] of signals) if (rx.test(q)) score += w;
    if (score > 0) out.push({ domain, score });
  }
  // Conflitos conhecidos: "painel" dentro de PDV/ERP não deve virar dashboard primário.
  const has = (d: CreationDomain) => out.find((x) => x.domain === d);
  const dash = has("dashboard");
  if (dash && (has("pdv") || has("crm") || has("ecommerce") || has("inventory"))) dash.score = Math.max(1, dash.score - 3);
  const landing = has("landing");
  if (landing && out.some((x) => x.domain !== "landing" && x.score >= 5)) landing.score = Math.max(1, landing.score - 2);
  return out.sort((a, b) => b.score - a.score);
}

/* ------------------------------------------ conhecimento de domínio */

const K = (k: DomainKnowledge): DomainKnowledge => k;

export const DOMAIN_KNOWLEDGE: Record<CreationDomain, DomainKnowledge> = {
  pdv: K({
    label: "PDV / Ponto de venda",
    modules: ["Venda rápida com busca/leitura de código", "Carrinho com descontos e totais", "Pagamento (dinheiro/cartão/PIX) com troco", "Controle de caixa (abertura, sangria, suprimento, fechamento)", "Estoque com baixa automática", "Histórico e comprovante", "Operadores e permissões"],
    entities: [
      { name: "Produto", fields: ["id", "sku", "nome", "preço (centavos)", "custo", "estoque_atual", "ativo"], relations: ["Categoria"] },
      { name: "Venda", fields: ["id", "operador_id", "caixa_id", "status", "subtotal", "desconto", "total", "criada_em"], relations: ["ItemVenda[]", "Pagamento[]"] },
      { name: "ItemVenda", fields: ["venda_id", "produto_id", "quantidade", "preço_unitário", "desconto"] },
      { name: "Caixa", fields: ["id", "operador_id", "aberto_em", "fechado_em", "valor_inicial", "valor_contado"], relations: ["MovimentoCaixa[]"] },
      { name: "MovimentoCaixa", fields: ["caixa_id", "tipo (venda|sangria|suprimento)", "valor", "motivo", "criado_em"] },
    ],
    invariants: [
      "Dinheiro sempre em centavos inteiros (nunca float) para evitar erro de arredondamento.",
      "Finalizar venda é operação ATÔMICA: grava venda + itens + pagamentos + baixa de estoque + movimento de caixa, ou nada.",
      "Soma dos pagamentos deve cobrir o total; troco só existe para dinheiro.",
      "Não vender com caixa fechado; não fechar caixa com venda em andamento.",
      "Estoque negativo só se a regra do negócio permitir explicitamente (configuração visível).",
      "Cancelamento/estorno gera movimento inverso, nunca apaga histórico.",
    ],
    stateMachines: [
      { name: "Venda", states: ["rascunho", "aguardando_pagamento", "paga", "cancelada", "estornada"], transitions: ["rascunho→aguardando_pagamento", "aguardando_pagamento→paga", "rascunho→cancelada", "paga→estornada"] },
      { name: "Caixa", states: ["fechado", "aberto", "em_conferência"], transitions: ["fechado→aberto", "aberto→em_conferência", "em_conferência→fechado"] },
    ],
    permissions: ["Operador: vender e consultar o próprio caixa", "Gerente: descontos acima do limite, estornos, relatórios, ajustes de estoque", "Admin: usuários, catálogo e configurações"],
    edgeCases: ["Produto sem estoque", "Desconto maior que o subtotal", "Pagamento parcial/múltiplo", "Fechamento com diferença de caixa", "Duplo clique em 'Finalizar'", "Queda de conexão no meio da venda"],
    kpis: ["Faturamento do período (soma de vendas pagas)", "Ticket médio = faturamento ÷ nº de vendas", "Produtos abaixo do estoque mínimo"],
    neverFake: ["Integração fiscal (NFC-e/SAT) e maquininha — só declarar se realmente implementada", "Métricas de crescimento sem histórico real"],
    routes: ["/sales", "/products", "/inventory", "/cash", "/reports", "/settings"],
    ux: ["Densidade alta e foco no teclado (atalhos, foco automático na busca)", "Botões grandes para toque", "Feedback imediato de total/troco"],
  }),
  inventory: K({
    label: "Estoque / ERP leve",
    modules: ["Cadastro de itens e categorias", "Movimentações (entrada/saída/ajuste)", "Alertas de estoque mínimo", "Fornecedores e compras", "Inventário e conferência", "Relatórios de giro"],
    entities: [
      { name: "Item", fields: ["id", "sku", "nome", "unidade", "estoque_mínimo", "custo_médio"], relations: ["Categoria", "Fornecedor"] },
      { name: "Movimentação", fields: ["item_id", "tipo (entrada|saída|ajuste)", "quantidade", "motivo", "origem", "criada_em", "usuário_id"] },
      { name: "Fornecedor", fields: ["id", "nome", "contato", "prazo_médio"] },
    ],
    invariants: ["Saldo = soma das movimentações (fonte única de verdade), nunca um campo editado à mão sem movimento.", "Ajuste exige motivo e usuário.", "Quantidade respeita a unidade (inteiro vs fracionado)."],
    stateMachines: [{ name: "Pedido de compra", states: ["rascunho", "enviado", "recebido_parcial", "recebido", "cancelado"], transitions: ["rascunho→enviado", "enviado→recebido_parcial", "recebido_parcial→recebido", "enviado→cancelado"] }],
    permissions: ["Operador: movimentar", "Gestor: ajustes, compras e relatórios"],
    edgeCases: ["Saída maior que saldo", "Item inativo com saldo", "Recebimento parcial", "Contagem divergente"],
    kpis: ["Giro de estoque", "Itens abaixo do mínimo", "Valor total em estoque (qtd × custo médio)"],
    neverFake: ["Previsão de demanda sem histórico", "Integração com fornecedor/ERP externo"],
    routes: ["/items", "/movements", "/purchases", "/suppliers", "/reports"],
    ux: ["Tabelas densas com filtros, edição inline segura e confirmação em ajustes"],
  }),
  fintech: K({
    label: "Financeiro / Fintech",
    modules: ["Visão geral com período selecionável", "Lançamentos categorizados", "Receitas × despesas × saldo", "Orçamentos e metas", "Relatórios e exportação"],
    entities: [
      { name: "Conta", fields: ["id", "nome", "tipo", "saldo_inicial", "moeda"] },
      { name: "Transação", fields: ["id", "conta_id", "tipo (receita|despesa|transferência)", "valor (centavos)", "categoria_id", "data", "status"] },
      { name: "Categoria", fields: ["id", "nome", "tipo"] },
      { name: "Orçamento", fields: ["categoria_id", "mês", "limite"] },
    ],
    invariants: ["Valores em centavos inteiros + moeda explícita.", "Transferência cria DOIS lançamentos vinculados (saída e entrada) de forma atômica.", "Saldo é derivado: saldo_inicial + Σ transações.", "Fórmulas (ROI, margem, variação %) documentadas e testadas com casos conhecidos."],
    stateMachines: [{ name: "Transação", states: ["pendente", "confirmada", "cancelada"], transitions: ["pendente→confirmada", "pendente→cancelada"] }],
    permissions: ["Usuário vê apenas os próprios dados (RLS/escopo por usuário)", "Dados sensíveis nunca em logs ou URLs"],
    edgeCases: ["Período sem dados", "Divisão por zero em % de variação", "Fuso horário na virada do mês", "Valores negativos/estornos"],
    kpis: ["Saldo do período", "Despesa por categoria", "Variação % vs período anterior (só com base real)"],
    neverFake: ["Cotações, rendimento e dados bancários sem API real", "Percentuais de crescimento inventados"],
    routes: ["/overview", "/transactions", "/budgets", "/reports", "/settings"],
    ux: ["Números tabulares alinhados, cores semânticas (receita/despesa) com contraste AA", "Estados vazios que ensinam o primeiro lançamento"],
  }),
  ecommerce: K({
    label: "E-commerce / Loja",
    modules: ["Catálogo com busca e filtros", "Página de produto", "Carrinho persistente", "Checkout com validação", "Pedidos e status", "Gestão de produtos"],
    entities: [
      { name: "Produto", fields: ["id", "slug", "nome", "descrição", "preço (centavos)", "estoque", "imagens[]", "ativo"], relations: ["Categoria", "Variação[]"] },
      { name: "Carrinho", fields: ["id", "cliente_id|sessão", "itens[]", "cupom"] },
      { name: "Pedido", fields: ["id", "cliente_id", "status", "total", "endereço", "criado_em"], relations: ["ItemPedido[]", "Pagamento"] },
    ],
    invariants: ["Preço do pedido é CONGELADO no momento da compra (não referencia o preço atual).", "Checkout revalida estoque e preço no servidor/dados reais.", "Pagamento real só com gateway integrado — sem isso, rotular como simulação."],
    stateMachines: [{ name: "Pedido", states: ["carrinho", "aguardando_pagamento", "pago", "em_separação", "enviado", "entregue", "cancelado"], transitions: ["carrinho→aguardando_pagamento", "aguardando_pagamento→pago", "pago→em_separação", "em_separação→enviado", "enviado→entregue", "aguardando_pagamento→cancelado"] }],
    permissions: ["Cliente: carrinho e próprios pedidos", "Admin: catálogo, pedidos e estoque"],
    edgeCases: ["Produto esgota durante o checkout", "Cupom inválido/expirado", "Carrinho vazio", "Variação indisponível"],
    kpis: ["Conversão carrinho→pedido", "Ticket médio", "Produtos mais vendidos (dados reais)"],
    neverFake: ["Gateway de pagamento, frete e nota fiscal sem integração real", "Avaliações/depoimentos inventados"],
    routes: ["/", "/products/:slug", "/cart", "/checkout", "/orders", "/admin"],
    ux: ["Imagens com proporção fixa e lazy loading", "Preço e CTA sempre visíveis", "Checkout em poucos passos"],
  }),
  saas: K({
    label: "SaaS / Multi-tenant",
    modules: ["Onboarding", "Autenticação e recuperação", "Workspaces e membros", "Roles e permissões", "Configurações", "Cobrança (somente se solicitada)"],
    entities: [
      { name: "Workspace", fields: ["id", "nome", "plano", "criado_em"] },
      { name: "Membership", fields: ["workspace_id", "user_id", "role"] },
      { name: "Convite", fields: ["workspace_id", "email", "role", "expira_em", "status"] },
    ],
    invariants: ["TODA consulta é escopada por workspace_id (isolamento entre tenants).", "Permissões checadas no backend/RLS, nunca só escondendo botão.", "Sempre existe ao menos um owner por workspace."],
    stateMachines: [{ name: "Convite", states: ["pendente", "aceito", "expirado", "revogado"], transitions: ["pendente→aceito", "pendente→expirado", "pendente→revogado"] }],
    permissions: ["owner > admin > member > viewer, com matriz explícita por ação"],
    edgeCases: ["Usuário em vários workspaces", "Remover o último owner", "Convite para e-mail já membro"],
    kpis: ["Membros ativos", "Uso por plano (somente com telemetria real)"],
    neverFake: ["Cobrança/Stripe sem integração real", "Métricas de MRR inventadas"],
    routes: ["/app", "/onboarding", "/workspace/settings", "/members"],
    ux: ["Troca de workspace sempre visível", "Estados de permissão negada explicados"],
  }),
  crm: K({
    label: "CRM / Vendas",
    modules: ["Contatos e leads", "Pipeline em etapas", "Atividades e tarefas", "Busca e filtros", "Indicadores de conversão"],
    entities: [
      { name: "Contato", fields: ["id", "nome", "email", "telefone", "origem"], relations: ["Empresa"] },
      { name: "Oportunidade", fields: ["id", "contato_id", "etapa", "valor", "previsão_fechamento", "responsável"] },
      { name: "Atividade", fields: ["id", "oportunidade_id", "tipo", "data", "notas", "concluída"] },
    ],
    invariants: ["Mover etapa registra histórico (quem, quando, de→para).", "Ganho/perdido exige motivo.", "E-mail/telefone validados e deduplicados."],
    stateMachines: [{ name: "Oportunidade", states: ["novo", "qualificado", "proposta", "negociação", "ganho", "perdido"], transitions: ["novo→qualificado", "qualificado→proposta", "proposta→negociação", "negociação→ganho", "negociação→perdido"] }],
    permissions: ["Vendedor: seus leads", "Gestor: todos e relatórios"],
    edgeCases: ["Contato duplicado", "Lead sem responsável", "Arrastar card entre colunas com falha de rede"],
    kpis: ["Taxa de conversão por etapa", "Valor em pipeline", "Tempo médio por etapa"],
    neverFake: ["Integração com e-mail/WhatsApp sem API real"],
    routes: ["/dashboard", "/contacts", "/pipeline", "/activities", "/reports"],
    ux: ["Kanban com arrastar e alternativa por teclado", "Timeline por contato"],
  }),
  dashboard: K({
    label: "Dashboard / Analytics",
    modules: ["KPIs com definição", "Filtro de período e comparação", "Gráficos coerentes com os dados", "Tabela com busca/ordenação/paginação", "Estados loading/empty/error"],
    entities: [{ name: "Métrica", fields: ["id", "nome", "definição", "unidade", "fonte"] }, { name: "Registro", fields: ["id", "métrica_id", "valor", "data", "dimensões"] }],
    invariants: ["Cada KPI tem fórmula, unidade e período explícitos.", "Gráfico e tabela derivam da MESMA fonte de dados.", "Comparações só quando existe período anterior real."],
    stateMachines: [],
    permissions: ["Visibilidade de dados por papel, quando houver"],
    edgeCases: ["Sem dados no período", "Outliers", "Divisão por zero", "Muitas categorias no gráfico"],
    kpis: ["Os definidos pelo usuário; nunca inventar"],
    neverFake: ["Séries com Math.random apresentadas como reais", "Percentuais de crescimento sem base"],
    routes: ["/overview", "/reports"],
    ux: ["Hierarquia: KPI principal → tendência → detalhe", "Gráfico adequado ao dado (linha=tempo, barra=comparação)", "Acessível: não depender só de cor"],
  }),
  admin: K({
    label: "Admin / Backoffice",
    modules: ["Listagem com busca/filtros/paginação", "Detalhe e edição", "Ações em massa com confirmação", "Auditoria", "Configurações"],
    entities: [{ name: "Registro gerenciado", fields: ["id", "status", "criado_em", "atualizado_em"] }, { name: "EventoAuditoria", fields: ["ator_id", "ação", "alvo", "antes", "depois", "em"] }],
    invariants: ["Ações destrutivas exigem confirmação e são auditadas.", "Autorização verificada no servidor."],
    stateMachines: [],
    permissions: ["Matriz papel × ação"],
    edgeCases: ["Edição concorrente", "Exclusão de registro referenciado", "Lista vazia/enorme"],
    kpis: [],
    neverFake: ["Ações que não persistem"],
    routes: ["/overview", "/records", "/records/:id", "/settings", "/audit"],
    ux: ["Tabelas densas, filtros persistentes na URL, desfazer quando possível"],
  }),
  landing: K({
    label: "Landing / Site institucional / Portfólio",
    modules: ["Hero com proposta clara e CTA", "Prova (casos reais fornecidos)", "Serviços/projetos", "Contato funcional", "SEO e performance"],
    entities: [{ name: "Projeto", fields: ["slug", "título", "resumo", "imagens", "links"] }, { name: "Contato", fields: ["nome", "email", "mensagem"] }],
    invariants: ["Um CTA primário por seção.", "Formulário de contato realmente envia/persiste ou é rotulado como não conectado."],
    stateMachines: [],
    permissions: [],
    edgeCases: ["Imagens que falham", "Formulário com spam/validação", "Mobile estreito (320px)"],
    kpis: [],
    neverFake: ["Depoimentos, logos de clientes e números inventados", "Formulário que finge enviar"],
    routes: ["/", "/projects", "/about", "/contact"],
    ux: ["Tipografia com escala e ritmo", "Seções com propósito distinto (não repetir cards iguais)", "Meta tags, OG e alt em imagens"],
  }),
  game: K({
    label: "Jogo",
    modules: ["Loop principal (update/render desacoplados)", "Entrada unificada (teclado/toque/gamepad)", "Estados: menu/jogando/pausa/fim", "Colisão e física simples", "Progressão e pontuação", "Áudio com desbloqueio por gesto", "Persistência de recorde"],
    entities: [{ name: "EstadoDoJogo", fields: ["fase", "pontuação", "vidas", "tempo"] }, { name: "Entidade", fields: ["posição", "velocidade", "hitbox", "estado"] }],
    invariants: ["Passo de tempo fixo (ou delta clampado) para física determinística.", "requestAnimationFrame pausa em aba oculta.", "Sem alocação por frame em laços quentes (reusar objetos).", "Reiniciar limpa TODO estado e listeners."],
    stateMachines: [{ name: "Jogo", states: ["menu", "jogando", "pausado", "fim"], transitions: ["menu→jogando", "jogando→pausado", "pausado→jogando", "jogando→fim", "fim→menu"] }],
    permissions: [],
    edgeCases: ["Aba em segundo plano", "Resize/orientação", "Toque múltiplo", "Delta enorme após lag", "AudioContext bloqueado"],
    kpis: ["60 fps alvo; orçamento de frame ≤ 16 ms"],
    neverFake: ["Multiplayer/ranking online sem backend"],
    routes: ["/game", "/settings"],
    ux: ["Feedback imediato (hit, score, juice)", "Controles legíveis no mobile", "Tela de pausa/ajuda"],
  }),
  audio: K({
    label: "Áudio / Música",
    modules: ["Contexto de áudio com desbloqueio por gesto", "Transporte (play/pause/seek)", "Sequenciador/instrumentos (se pedido)", "Visualização (analyser)", "Persistência de projeto"],
    entities: [{ name: "Faixa", fields: ["id", "título", "fonte", "duração"] }, { name: "Padrão", fields: ["bpm", "steps[]", "instrumento"] }],
    invariants: ["AudioContext só inicia após gesto do usuário.", "Agendar com relógio do AudioContext (não setTimeout) para ritmo estável.", "Liberar nós/URLs ao trocar de faixa."],
    stateMachines: [{ name: "Player", states: ["parado", "carregando", "tocando", "pausado", "erro"], transitions: ["parado→carregando", "carregando→tocando", "tocando→pausado", "pausado→tocando", "carregando→erro"] }],
    permissions: [],
    edgeCases: ["Formato não suportado", "Autoplay bloqueado", "Latência no mobile"],
    kpis: [],
    neverFake: ["Streaming/catálogo musical sem fonte licenciada"],
    routes: ["/player", "/library"],
    ux: ["Controles de transporte consistentes", "Visualizador sem custo excessivo de CPU"],
  }),
  booking: K({
    label: "Agendamento / Reservas",
    modules: ["Serviços e duração", "Disponibilidade e calendário", "Escolha de horário", "Confirmação/cancelamento", "Painel de gestão"],
    entities: [{ name: "Serviço", fields: ["id", "nome", "duração_min", "preço"] }, { name: "Disponibilidade", fields: ["profissional_id", "dia_semana", "início", "fim"] }, { name: "Reserva", fields: ["id", "serviço_id", "cliente", "início", "fim", "status"] }],
    invariants: ["Sem sobreposição de horários por profissional (checar na gravação, não só na UI).", "Fuso horário explícito; armazenar em UTC.", "Cancelamento respeita antecedência configurada."],
    stateMachines: [{ name: "Reserva", states: ["pendente", "confirmada", "concluída", "cancelada", "falta"], transitions: ["pendente→confirmada", "confirmada→concluída", "confirmada→cancelada", "confirmada→falta"] }],
    permissions: ["Cliente: própria reserva", "Profissional/Admin: agenda"],
    edgeCases: ["Dois clientes no mesmo slot", "Horário de verão", "Serviço que cruza o expediente"],
    kpis: ["Taxa de ocupação", "Cancelamentos"],
    neverFake: ["Lembretes por SMS/WhatsApp sem integração real"],
    routes: ["/services", "/availability", "/booking/confirm", "/manage"],
    ux: ["Calendário acessível por teclado", "Confirmação clara com resumo"],
  }),
  social: K({
    label: "Social / Comunidade",
    modules: ["Perfil", "Feed", "Criar/editar conteúdo", "Interações", "Moderação e denúncia", "Privacidade"],
    entities: [{ name: "Perfil", fields: ["id", "nome", "bio", "avatar"] }, { name: "Publicação", fields: ["id", "autor_id", "conteúdo", "criada_em"] }, { name: "Interação", fields: ["tipo", "alvo_id", "autor_id"] }],
    invariants: ["Usuário só edita/exclui o próprio conteúdo (checagem no servidor).", "Conteúdo de usuário é sanitizado (XSS).", "Paginação/cursor no feed."],
    stateMachines: [],
    permissions: ["Autor, moderador, admin"],
    edgeCases: ["Conteúdo longo/ofensivo", "Feed vazio", "Perfil privado"],
    kpis: [],
    neverFake: ["Usuários e posts fictícios apresentados como reais"],
    routes: ["/feed", "/profile", "/create", "/settings"],
    ux: ["Scroll infinito com estado de carregando e fim", "Atualização otimista com rollback"],
  }),
  education: K({
    label: "Educação / Cursos",
    modules: ["Catálogo de cursos", "Aulas e progresso", "Quizzes com correção", "Certificados (se pedido)", "Painel do instrutor"],
    entities: [{ name: "Curso", fields: ["id", "título", "módulos[]"] }, { name: "Aula", fields: ["id", "curso_id", "ordem", "conteúdo"] }, { name: "Progresso", fields: ["aluno_id", "aula_id", "concluída_em"] }, { name: "Tentativa", fields: ["quiz_id", "aluno_id", "respostas", "nota"] }],
    invariants: ["Progresso é derivado de eventos reais de conclusão.", "Gabarito não é exposto ao cliente antes da correção."],
    stateMachines: [{ name: "Matrícula", states: ["ativa", "concluída", "cancelada"], transitions: ["ativa→concluída", "ativa→cancelada"] }],
    permissions: ["Aluno, instrutor, admin"],
    edgeCases: ["Retomar aula", "Quiz refeito", "Conteúdo removido"],
    kpis: ["Taxa de conclusão (dados reais)"],
    neverFake: ["Certificados válidos sem emissão real"],
    routes: ["/courses", "/courses/:id", "/learn/:lesson", "/instructor"],
    ux: ["Progresso visível", "Leitura confortável e navegação entre aulas"],
  }),
  delivery: K({
    label: "Delivery / Restaurante",
    modules: ["Cardápio com categorias", "Carrinho e observações", "Checkout com endereço", "Pedidos em tempo real (se houver backend)", "Painel da cozinha"],
    entities: [{ name: "ItemCardápio", fields: ["id", "nome", "preço", "adicionais[]", "disponível"] }, { name: "Pedido", fields: ["id", "cliente", "itens", "total", "status", "endereço"] }],
    invariants: ["Preço congelado no pedido.", "Item indisponível não entra no carrinho.", "Taxa de entrega calculada por regra explícita."],
    stateMachines: [{ name: "Pedido", states: ["recebido", "em_preparo", "pronto", "saiu_para_entrega", "entregue", "cancelado"], transitions: ["recebido→em_preparo", "em_preparo→pronto", "pronto→saiu_para_entrega", "saiu_para_entrega→entregue", "recebido→cancelado"] }],
    permissions: ["Cliente, cozinha, entregador, admin"],
    edgeCases: ["Item esgota", "Endereço fora da área", "Pedido duplicado"],
    kpis: ["Tempo médio de preparo", "Pedidos por status"],
    neverFake: ["Rastreamento GPS e pagamento sem integração real"],
    routes: ["/menu", "/cart", "/checkout", "/orders", "/kitchen"],
    ux: ["Mobile-first, CTA fixo no carrinho", "Status do pedido claro"],
  }),
  cms: K({
    label: "Blog / CMS",
    modules: ["Editor de conteúdo", "Rascunho/publicação", "Listagem e leitura", "Categorias/tags", "SEO"],
    entities: [{ name: "Artigo", fields: ["id", "slug", "título", "corpo", "status", "publicado_em"] }, { name: "Categoria", fields: ["id", "nome"] }],
    invariants: ["Slug único e estável.", "Corpo renderizado é sanitizado.", "Rascunho nunca é público."],
    stateMachines: [{ name: "Artigo", states: ["rascunho", "publicado", "arquivado"], transitions: ["rascunho→publicado", "publicado→arquivado", "arquivado→rascunho"] }],
    permissions: ["Editor, autor, leitor"],
    edgeCases: ["Slug duplicado", "Conteúdo muito longo", "Imagens quebradas"],
    kpis: [],
    neverFake: ["Artigos fictícios apresentados como reais"],
    routes: ["/", "/posts/:slug", "/admin/posts"],
    ux: ["Tipografia de leitura (medida 60–75 caracteres)", "Metadados e OG por artigo"],
  }),
  utility: K({
    label: "Ferramenta / Utilitário",
    modules: ["Entrada validada", "Cálculo/transformação correta", "Resultado claro e copiável", "Histórico/persistência (se útil)"],
    entities: [{ name: "Entrada", fields: ["valor", "unidade/formato"] }, { name: "Resultado", fields: ["valor", "explicação"] }],
    invariants: ["Lógica pura separada da UI e testada com casos conhecidos.", "Precisão numérica tratada (arredondamento explícito)."],
    stateMachines: [],
    permissions: [],
    edgeCases: ["Entrada vazia/inválida", "Valores extremos", "Separador decimal pt-BR"],
    kpis: [],
    neverFake: ["Resultados fixos que não dependem da entrada"],
    routes: ["/"],
    ux: ["Resultado em tempo real, atalhos e foco correto", "Mensagens de erro específicas"],
  }),
  generic: K({
    label: "Produto genérico (a definir)",
    modules: ["Fluxo principal do pedido", "Navegação por tarefas", "Dados e estados explícitos", "Feedback e tratamento de falhas", "Acessibilidade e responsividade"],
    entities: [{ name: "Entidades derivadas do caso de uso", fields: ["definir antes de persistir"] }],
    invariants: ["Nenhum controle sem efeito real.", "Dados persistidos só após modelo definido."],
    stateMachines: [],
    permissions: [],
    edgeCases: ["Estado vazio", "Falha de rede", "Entrada inválida"],
    kpis: [],
    neverFake: ["Dados, integrações e métricas inventados"],
    routes: ["Definir a partir das tarefas essenciais"],
    ux: ["Escolher estrutura pelo contexto (workspace, fluxo guiado, editorial, canvas)"],
  }),
};

/* ------------------------------------ requisitos, restrições, suposições */

const CONSTRAINT_PATTERNS: Array<[RegExp, string]> = [
  [/\breact\b/, "Stack: React"],
  [/\bvue\b/, "Stack: Vue"],
  [/\bsupabase\b/, "Backend: Supabase"],
  [/\bfirebase\b/, "Backend: Firebase"],
  [/\btailwind\b/, "Estilo: Tailwind"],
  [/typescript|\bts\b/, "Linguagem: TypeScript"],
  [/offline|sem internet/, "Funciona offline (persistência local + sincronização)"],
  [/\bpwa\b|instalavel/, "PWA instalável"],
  [/responsiv|mobile|celular/, "Responsivo / mobile é requisito"],
  [/dark mode|modo escuro|tema escuro/, "Tema escuro obrigatório"],
  [/portugues|pt-?br/, "Idioma da interface: português (pt-BR)"],
  [/sem backend|so frontend|apenas frontend/, "Somente frontend (sem backend próprio)"],
  [/rapido|performance|leve/, "Performance é requisito explícito"],
  [/acessibil/, "Acessibilidade é requisito explícito"],
];

export function extractRequirements(request: string): CreationRequirement[] {
  const parts = (request ?? "")
    .split(/[\n;•]|(?<=[.!?])\s+|,\s*(?=(?:com|e|tambem|alem|incluindo|que)\b)/i)
    .map((p) => p.replace(/^[-*\d.)\s]+/, "").trim())
    .filter((p) => p.length >= 8 && p.length <= 220);
  const verbs = /\b(precisa|deve|tem que|quero|preciso|com|incluindo|permit|possa|ter|mostrar|gerenciar|cadastr|control|exibir|calcular|exportar|filtrar|buscar)\w*/i;
  const explicit = parts.filter((p) => verbs.test(p)).slice(0, 12);
  return explicit.map((text, i) => ({ id: `R${i + 1}`, text, kind: "explicit" as const }));
}

export function extractConstraints(request: string): string[] {
  const q = normalize(request);
  return uniq(CONSTRAINT_PATTERNS.filter(([rx]) => rx.test(q)).map(([, label]) => label));
}

function detectPlatform(request: string): CreationBlueprint["platform"] {
  const q = normalize(request);
  for (const [p, rx] of PLATFORM) if (rx.test(q)) return p;
  return "unknown";
}

/* -------------------------------------------------- complexidade */

export function estimateComplexity(request: string, ranking: DomainScore[], constraints: string[]): { score: number; tier: CreationTier } {
  const q = normalize(request);
  let score = 12;
  score += Math.min(30, ranking.filter((r) => r.score >= 3).length * 10);
  score += Math.min(15, Math.floor(q.length / 60) * 3);
  if (/login|autentica|cadastro de usuario|permiss|roles?|multi.?tenant/.test(q)) score += 12;
  if (/pagamento|checkout|nota fiscal|fiscal|cobranca|assinatura/.test(q)) score += 10;
  if (/tempo real|realtime|websocket|notificac/.test(q)) score += 8;
  if (/relatorio|exportar|pdf|excel|csv/.test(q)) score += 5;
  if (/offline|sincroniz/.test(q)) score += 8;
  if (/enterprise|completo|profissional|robusto|escalavel/.test(q)) score += 8;
  score += Math.min(8, constraints.length * 2);
  score = Math.max(5, Math.min(100, score));
  const tier: CreationTier = score < 25 ? "simple" : score < 50 ? "standard" : score < 75 ? "complex" : "enterprise";
  return { score, tier };
}

/* ---------------------------------------------------- escopo e fases */

function buildScope(k: DomainKnowledge, tier: CreationTier): CreationBlueprint["scope"] {
  const mods = k.modules;
  const mvpCount = tier === "simple" ? Math.min(3, mods.length) : tier === "standard" ? Math.min(4, mods.length) : Math.min(3, mods.length);
  const coreCount = tier === "simple" ? 0 : tier === "standard" ? Math.min(2, mods.length - mvpCount) : Math.min(3, mods.length - mvpCount);
  return {
    mvp: mods.slice(0, mvpCount),
    core: mods.slice(mvpCount, mvpCount + coreCount),
    later: mods.slice(mvpCount + coreCount),
  };
}

function buildPhases(tier: CreationTier, primary: CreationDomain): CreationPhase[] {
  const base: CreationPhase[] = [
    { name: "1. Fundação", goals: ["Estrutura de pastas coerente com o repositório existente", "Tipos/modelo de dados", "Camada de dados isolada da UI"], exitCriteria: ["Compila sem erros", "Nenhum arquivo de entrada reescrito às cegas"] },
    { name: "2. Fluxo principal ponta a ponta", goals: ["Concluir a tarefa central do usuário com dados reais/persistidos", "Validação e mensagens de erro"], exitCriteria: ["Fluxo central funciona do início ao fim", "Nenhum botão sem ação real"] },
    { name: "3. Estados e bordas", goals: ["loading / vazio / erro / sucesso em toda tela com dados", "Casos de borda do domínio"], exitCriteria: ["Toda lista tem estado vazio", "Falhas mostram recuperação"] },
    { name: "4. Acabamento profissional", goals: ["Hierarquia visual, responsividade 320–1440px", "Acessibilidade (rótulos, foco, contraste)", "Microinterações com propósito"], exitCriteria: ["Sem overflow horizontal no mobile", "Todos os inputs têm label"] },
    { name: "5. Verificação honesta", goals: ["Rodar checks/CI quando disponível", "Resumo com caminhos e status real"], exitCriteria: ["Status 'pronto' só com evidência", "Limitações declaradas"] },
  ];
  if (tier === "complex" || tier === "enterprise") {
    base.splice(2, 0, { name: "2b. Regras de negócio e integridade", goals: [`Invariantes do domínio (${primary}) implementadas na camada de dados`, "Operações multi-passo atômicas", "Permissões aplicadas onde o dado vive"], exitCriteria: ["Invariantes cobertas por testes", "Sem estado inconsistente após falha parcial"] });
  }
  if (tier === "simple") return [base[0]!, base[1]!, base[3]!, base[base.length - 1]!];
  return base;
}

const QUALITY_BAR = [
  "Cada controle visível faz algo real ou está claramente marcado como indisponível.",
  "Nenhum dado, métrica, depoimento ou integração inventado; exemplos devem ser rotulados como exemplo.",
  "Lógica de negócio fora dos componentes (funções puras testáveis).",
  "Toda tela com dados: loading, vazio, erro e sucesso.",
  "Formulários: label, validação, erro específico, foco e teclado.",
  "Responsivo de 320px a desktop; sem rolagem horizontal acidental.",
  "Contraste AA, foco visível, alt/aria onde necessário.",
  "Identidade visual coerente com o público (não repetir sidebar + cards + gradiente por padrão).",
  "Edição incremental (patch) em arquivos existentes; sem reescrever entrypoints.",
  "Resumo final com caminhos alterados e status real de validação.",
];

/* ------------------------------------------------------ blueprint */

export function analyzeCreation(request: string, opts: { history?: Array<{ role: string; content: string }> } = {}): CreationBlueprint {
  const history = (opts.history ?? []).filter((m) => m.role === "user").slice(-2).map((m) => m.content).join("\n");
  const text = [request ?? "", history].filter(Boolean).join("\n");
  const ranking = scoreDomains(text);
  const top = ranking[0];
  const primary: CreationDomain = top?.domain ?? "generic";
  const secondary = ranking.filter((r) => r.domain !== primary && r.score >= 3).slice(0, 3).map((r) => r.domain);
  const confidence: CreationBlueprint["confidence"] = !top ? "low" : top.score >= 8 || (ranking.length >= 2 && top.score >= 5) ? "high" : top.score >= 4 ? "medium" : "low";
  const constraints = extractConstraints(text);
  const { score, tier } = estimateComplexity(text, ranking, constraints);
  const knowledge = DOMAIN_KNOWLEDGE[primary];
  const platform = detectPlatform(text);
  const assumptions: string[] = [];
  if (!constraints.some((c) => c.startsWith("Stack") || c.startsWith("Backend"))) assumptions.push("Stack: seguir o repositório existente (não introduzir framework novo sem necessidade).");
  if (!constraints.some((c) => c.startsWith("Idioma"))) assumptions.push("Idioma da interface: português (pt-BR), salvo indicação contrária.");
  if (!/dado|banco|supabase|api|backend/.test(normalize(text))) assumptions.push("Dados: usar persistência existente do projeto; se não houver, camada de dados isolada e trocável, com dados de exemplo rotulados.");
  if (confidence === "low") assumptions.push("Pedido amplo: construir o menor produto coerente com o fluxo principal e declarar o que foi assumido.");
  const inferred: CreationRequirement[] = knowledge.invariants.slice(0, 3).map((t, i) => ({ id: `I${i + 1}`, text: t, kind: "inferred" }));
  return {
    version: WLC_CREATION_INTELLIGENCE_V2_VERSION,
    request: request ?? "",
    isCreation: isCreationRequest(request ?? ""),
    primary,
    secondary,
    ranking: ranking.slice(0, 5),
    confidence,
    platform,
    constraints,
    requirements: [...extractRequirements(request ?? ""), ...inferred],
    assumptions,
    complexityScore: score,
    tier,
    scope: buildScope(knowledge, tier),
    knowledge,
    phases: buildPhases(tier, primary),
    qualityBar: QUALITY_BAR,
    openQuestions: confidence === "low" ? ["Qual é o objetivo principal e quem usará?", "Quais ações são indispensáveis agora e quais podem ficar para depois?"] : [],
  };
}

/* ------------------------------------------- contexto para o modelo */

export function formatCreationBlueprintContext(b: CreationBlueprint): string {
  const k = b.knowledge;
  const lines: string[] = [
    `## WLC.IA Creation Intelligence v${b.version} — Blueprint profissional`,
    `Domínio: ${k.label}${b.secondary.length ? ` (+ ${b.secondary.map((d) => DOMAIN_KNOWLEDGE[d].label).join(", ")})` : ""} · confiança ${b.confidence} · complexidade ${b.complexityScore}/100 (${b.tier}) · plataforma ${b.platform}.`,
    "Use este blueprint como HIPÓTESE de engenharia: implemente só o que serve ao pedido, mas com o rigor abaixo. Suposições devem ser declaradas no resumo final.",
  ];
  if (b.constraints.length) lines.push("### Restrições detectadas", ...b.constraints.map((x) => `- ${x}`));
  if (b.requirements.length) lines.push("### Requisitos (explícitos = contrato; inferidos = rigor do domínio)", ...b.requirements.map((r) => `- [${r.id}${r.kind === "inferred" ? "·inferido" : ""}] ${r.text}`));
  lines.push("### Escopo em camadas", `- MVP (entregar agora): ${b.scope.mvp.join("; ") || "—"}`);
  if (b.scope.core.length) lines.push(`- Núcleo (se couber com qualidade): ${b.scope.core.join("; ")}`);
  if (b.scope.later.length) lines.push(`- Depois (não inflar o escopo): ${b.scope.later.join("; ")}`);
  lines.push("### Modelo de dados candidato", ...k.entities.map((e) => `- ${e.name}: ${e.fields.join(", ")}${e.relations?.length ? ` → ${e.relations.join(", ")}` : ""}`));
  lines.push("### Invariantes de negócio (obrigatórias na camada de dados)", ...k.invariants.map((x) => `- ${x}`));
  if (k.stateMachines.length) lines.push("### Máquinas de estado", ...k.stateMachines.map((s) => `- ${s.name}: ${s.states.join(" · ")} | ${s.transitions.join(", ")}`));
  if (k.permissions.length) lines.push("### Permissões", ...k.permissions.map((x) => `- ${x}`));
  lines.push("### Casos de borda a tratar", ...k.edgeCases.map((x) => `- ${x}`));
  if (k.kpis.length) lines.push("### KPIs (definição explícita)", ...k.kpis.map((x) => `- ${x}`));
  lines.push("### NUNCA fingir", ...k.neverFake.map((x) => `- ${x}`));
  lines.push("### Rotas/estrutura sugeridas", `- ${k.routes.join(" · ")}`, "### Direção de UX", ...k.ux.map((x) => `- ${x}`));
  lines.push("### Fases com portões de verificação", ...b.phases.flatMap((p) => [`- ${p.name}: ${p.goals.join("; ")} ▸ saída: ${p.exitCriteria.join("; ")}`]));
  lines.push("### Barra de qualidade profissional", ...b.qualityBar.map((x) => `- ${x}`));
  if (b.assumptions.length) lines.push("### Suposições a declarar", ...b.assumptions.map((x) => `- ${x}`));
  if (b.openQuestions.length) lines.push("### Lacunas", ...b.openQuestions.map((x) => `- ${x}`));
  return lines.join("\n");
}

/** Protocolo extra por modo do chat (anexado a modeInstruction). */
export function buildCreationProtocol(mode: CreationMode, b?: CreationBlueprint): string {
  if (mode === "plan") {
    return [
      "",
      "### Protocolo de plano profissional",
      "O plano deve (1) nomear o domínio e o fluxo principal, (2) listar entidades e regras críticas em 1 linha cada,",
      "(3) separar MVP de 'depois', (4) incluir uma etapa final de verificação, (5) declarar suposições. Etapas curtas, verificáveis e sem jargão.",
      b ? `Complexidade estimada: ${b.tier}. Use ${b.tier === "simple" ? "3–4" : b.tier === "standard" ? "4–6" : "6–8"} etapas.` : "",
    ].filter(Boolean).join("\n");
  }
  if (mode === "build") {
    return [
      "",
      "### Protocolo de criação profissional (Creation Intelligence v2)",
      "1) Antes de gravar, fixe mentalmente: fluxo principal, entidades, invariantes e o que fica FORA do escopo.",
      "2) Grave na ordem: modelo/dados → lógica pura → fluxo principal → estados (loading/vazio/erro) → acabamento visual.",
      "3) Não deixe controles falsos, TODO, lorem ipsum, dados inventados nem métricas aleatórias.",
      "4) Regras de negócio na camada de dados/funções puras, nunca espalhadas em componentes.",
      "5) Antes do resumo final, faça uma autorrevisão contra a barra de qualidade; se o sistema apontar achados de auditoria, corrija-os e só então conclua.",
      "6) No resumo final: o que foi entregue, suposições, limitações e status REAL das validações.",
    ].join("\n");
  }
  return "";
}

/* ------------------------------------------- auditoria de código gerado */

export type AuditSeverity = "critical" | "high" | "medium" | "low";
export type AuditFinding = { rule: string; severity: AuditSeverity; path: string; line?: number; message: string; fix: string };
export type AuditReport = {
  filesScanned: number;
  findings: AuditFinding[];
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  blocking: AuditFinding[];
};

type Rule = {
  id: string;
  severity: AuditSeverity;
  appliesTo: RegExp;
  test: (content: string) => number | null | Array<number>;
  message: string;
  fix: string;
};

const UI_FILE = /\.(tsx|jsx|vue|svelte|html)$/i;
const CODE_FILE = /\.(tsx?|jsx?|mjs|vue|svelte|html)$/i;
const lineOf = (content: string, index: number) => content.slice(0, index).split("\n").length;
const firstMatch = (rx: RegExp) => (content: string): number | null => {
  const m = rx.exec(content);
  return m ? lineOf(content, m.index) : null;
};

const RULES: Rule[] = [
  { id: "placeholder-text", severity: "high", appliesTo: UI_FILE, test: firstMatch(/lorem ipsum|dolor sit amet|texto de exemplo aqui|your text here|insira (seu )?texto/i), message: "Texto placeholder (lorem ipsum) no produto.", fix: "Troque por conteúdo real do domínio ou rotule explicitamente como exemplo." },
  { id: "fake-handler", severity: "critical", appliesTo: UI_FILE, test: firstMatch(/onClick=\{\s*\(\s*\)\s*=>\s*(\{\s*\}|undefined|null|void 0)\s*\}|onClick=\{\s*\(\)\s*=>\s*alert\(/), message: "Botão com handler vazio ou apenas alert (controle falso).", fix: "Implemente a ação real (estado/dados) ou remova/desabilite o controle com explicação." },
  { id: "dead-link", severity: "medium", appliesTo: UI_FILE, test: firstMatch(/href=["']#["']/), message: "Link com href='#' (navegação morta).", fix: "Aponte para uma rota real ou use <button> se for uma ação." },
  { id: "random-data", severity: "critical", appliesTo: /\.(tsx?|jsx?|vue|svelte)$/i, test: (c) => { const rx = /Math\.random\(\)/g; let m; while ((m = rx.exec(c))) { const ctx = c.slice(Math.max(0, m.index - 160), m.index + 160); if (/(kpi|metric|receita|revenue|vendas|sales|growth|crescimento|chart|grafico|data\s*[:=]|series|stats?)/i.test(ctx) && !/(uuid|id\s*[:=]|key|seed|particle|spawn|enemy|game|shuffle|jitter|delay)/i.test(ctx)) return lineOf(c, m.index); } return null; }, message: "Dados/métricas gerados com Math.random apresentados como reais.", fix: "Derive de dados persistidos/definidos; se for demonstração, rotule 'dados de exemplo'." },
  { id: "invented-growth", severity: "high", appliesTo: UI_FILE, test: firstMatch(/[+-]\s?\d{1,3}([.,]\d)?%\s*(vs|em rela[cç][aã]o|desde|from|than)/i), message: "Percentual de variação hardcoded sem base de dados.", fix: "Calcule a variação a partir do período anterior real ou remova." },
  { id: "todo-left", severity: "medium", appliesTo: CODE_FILE, test: firstMatch(/\b(TODO|FIXME|XXX)\b|implementar depois|coming soon|em breve\s*\)/i), message: "TODO/FIXME ou 'em breve' deixado no código entregue.", fix: "Implemente, remova o item ou documente como limitação no resumo." },
  { id: "console-noise", severity: "low", appliesTo: /\.(tsx?|jsx?|vue|svelte)$/i, test: firstMatch(/console\.log\(/), message: "console.log deixado no código.", fix: "Remova ou use o logger do projeto." },
  { id: "any-type", severity: "low", appliesTo: /\.tsx?$/i, test: firstMatch(/:\s*any\b|as any\b|<any>/), message: "Uso de 'any' enfraquece a tipagem.", fix: "Use tipos do domínio ou 'unknown' com narrowing." },
  { id: "float-money", severity: "high", appliesTo: /\.(tsx?|jsx?|vue|svelte)$/i, test: (c) => { const m = /(preco|price|valor|total|subtotal|amount)\w*\s*[:=]\s*\d+\.\d{1,2}\b/i.exec(c); return m ? lineOf(c, m.index) : null; }, message: "Dinheiro como número decimal (float) — risco de erro de arredondamento.", fix: "Guarde centavos inteiros e formate na exibição (Intl.NumberFormat)." },
  { id: "innerhtml-xss", severity: "high", appliesTo: /\.(tsx?|jsx?|vue|svelte|html)$/i, test: firstMatch(/dangerouslySetInnerHTML|\.innerHTML\s*=\s*[^"'`;]*\+|v-html=/), message: "Injeção de HTML sem sanitização evidente (XSS).", fix: "Renderize como texto ou sanitize com biblioteca confiável (ex.: DOMPurify)." },
  { id: "secret-in-code", severity: "critical", appliesTo: CODE_FILE, test: firstMatch(/(sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,}|service_role[^\n]{0,40}eyJ|-----BEGIN [A-Z ]*PRIVATE KEY-----)/), message: "Possível segredo/chave privada no código.", fix: "Mova para variável de ambiente/segredo do servidor e rotacione a chave." },
  { id: "img-no-alt", severity: "medium", appliesTo: UI_FILE, test: firstMatch(/<img(?![^>]*\balt=)[^>]*>/i), message: "Imagem sem atributo alt.", fix: "Adicione alt descritivo (ou alt='' se decorativa)." },
  { id: "input-no-label", severity: "medium", appliesTo: UI_FILE, test: (c) => { const inputs = c.match(/<(input|textarea|select)\b[^>]*>/gi) ?? []; const labelled = /<label\b|aria-label=|aria-labelledby=|<Label\b|htmlFor=/i.test(c); if (!inputs.length || labelled) return null; return lineOf(c, c.search(/<(input|textarea|select)\b/i)); }, message: "Campos de formulário sem label/aria-label.", fix: "Associe <label htmlFor> ou aria-label a cada campo." },
  { id: "no-async-states", severity: "medium", appliesTo: /\.(tsx|jsx|vue|svelte)$/i, test: (c) => { const fetches = /(useQuery|useEffect[\s\S]{0,300}fetch\(|supabase\.from\(|await fetch\()/.test(c); if (!fetches) return null; const hasLoading = /(isLoading|isPending|loading|carregando|skeleton|Skeleton|Spinner)/i.test(c); const hasError = /(isError|error|erro|falha|catch\s*\()/i.test(c); return hasLoading && hasError ? null : 1; }, message: "Tela com busca de dados sem estado de carregamento ou de erro.", fix: "Trate loading, vazio e erro explicitamente na UI." },
  { id: "no-empty-state", severity: "low", appliesTo: /\.(tsx|jsx)$/i, test: (c) => { if (!/\.map\(/.test(c) || !/(useQuery|supabase\.from|fetch\()/.test(c)) return null; return /(length\s*===?\s*0|!\w+\.length|vazio|empty|nenhum|sem resultados)/i.test(c) ? null : 1; }, message: "Lista renderizada sem estado vazio.", fix: "Mostre uma mensagem útil quando não houver itens (e como criar o primeiro)." },
  { id: "giant-file", severity: "low", appliesTo: CODE_FILE, test: (c) => (c.split("\n").length > 600 ? 1 : null), message: "Arquivo com mais de 600 linhas (difícil de manter).", fix: "Extraia componentes, hooks e lógica pura em módulos menores." },
  { id: "empty-catch", severity: "medium", appliesTo: /\.(tsx?|jsx?|mjs|vue|svelte)$/i, test: firstMatch(/catch\s*(\([^)]*\))?\s*\{\s*\}/), message: "catch vazio engole erros silenciosamente.", fix: "Trate, registre ou mostre o erro ao usuário." },
  { id: "game-no-delta", severity: "medium", appliesTo: /\.(tsx?|jsx?|mjs|html)$/i, test: (c) => (/requestAnimationFrame/.test(c) && /(player|enemy|inimigo|velocity|velocidade)/i.test(c) && !/(delta|dt\b|deltaTime|performance\.now|timestamp|lastTime)/i.test(c) ? 1 : null), message: "Loop de jogo sem delta de tempo (velocidade dependente de FPS).", fix: "Use delta/tempo fixo e clamp para lag." },
];

const GATE_WEIGHT: Record<AuditSeverity, number> = { critical: 25, high: 12, medium: 5, low: 1 };

export function auditGeneratedFiles(files: Array<{ path: string; content: string }>): AuditReport {
  const findings: AuditFinding[] = [];
  let scanned = 0;
  for (const f of files) {
    if (!f?.path || typeof f.content !== "string" || !CODE_FILE.test(f.path)) continue;
    if (/\.(test|spec)\.[tj]sx?$/.test(f.path) || /\/test\//.test(f.path)) continue; // testes podem conter exemplos
    scanned++;
    for (const r of RULES) {
      if (!r.appliesTo.test(f.path)) continue;
      const hit = r.test(f.content);
      if (hit === null || hit === undefined) continue;
      const line = Array.isArray(hit) ? hit[0] : hit;
      findings.push({ rule: r.id, severity: r.severity, path: f.path, line, message: r.message, fix: r.fix });
    }
  }
  let penalty = 0;
  const seen = new Set<string>();
  for (const f of findings) {
    const key = `${f.rule}`;
    // penalidade com retorno decrescente por regra repetida
    const n = [...seen].filter((s) => s.startsWith(key + ":")).length;
    seen.add(`${key}:${f.path}`);
    penalty += GATE_WEIGHT[f.severity] * (n === 0 ? 1 : n < 3 ? 0.5 : 0.2);
  }
  const score = Math.max(0, Math.round(100 - penalty));
  const grade = score >= 90 ? "A" : score >= 78 ? "B" : score >= 62 ? "C" : score >= 45 ? "D" : "F";
  return { filesScanned: scanned, findings, score, grade, blocking: findings.filter((f) => f.severity === "critical" || f.severity === "high") };
}

/** Mensagem de autocorreção enviada ao modelo quando a auditoria acha problemas graves. */
export function buildAuditSelfReviewPrompt(report: AuditReport, round = 1): string {
  const top = report.blocking.slice(0, 8);
  return [
    `Autorrevisão de qualidade (rodada ${round}): a auditoria automática do que você gravou deu nota ${report.score}/100 (${report.grade}) e achou ${report.blocking.length} problema(s) grave(s).`,
    "Corrija AGORA com patch_file (edições pontuais, sem reescrever arquivos inteiros) e só depois escreva o resumo final:",
    ...top.map((f) => `- [${f.severity}] ${f.path}${f.line ? `:${f.line}` : ""} — ${f.message} → ${f.fix}`),
    report.blocking.length > top.length ? `- … e mais ${report.blocking.length - top.length} achado(s) do mesmo tipo.` : "",
    "Se algum achado for um falso positivo, diga isso no resumo final em uma linha em vez de alterar o código.",
  ].filter(Boolean).join("\n");
}

export function summarizeAudit(report: AuditReport): string {
  if (!report.filesScanned) return "Auditoria: nenhum arquivo de código para analisar.";
  return `Auditoria de qualidade: nota ${report.score}/100 (${report.grade}) · ${report.filesScanned} arquivo(s) · ${report.findings.length} achado(s), ${report.blocking.length} grave(s).`;
}
