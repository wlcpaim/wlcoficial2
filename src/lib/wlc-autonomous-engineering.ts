/**
 * WLC.IA Autonomous Engineering Intelligence V2.
 * Deterministic capability planning and evidence-gated execution protocol.
 * This module guides the LLM/tool runtime; it does not pretend to execute tools.
 */
export type BuildCapability = "website" | "saas" | "telegram" | "supabase" | "api" | "debug" | "testing" | "deployment";
export type EngineeringWorkItem = {
  id: string;
  title: string;
  objective: string;
  deliverables: string[];
  acceptance: string[];
  approvalRequired: boolean;
};

const normalize = (value: string) => value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const includesAny = (value: string, terms: string[]) => terms.some((term) => value.includes(term));

export function detectBuildCapabilities(request: string): BuildCapability[] {
  const q = normalize(request);
  const found = new Set<BuildCapability>();
  if (includesAny(q, ["site", "website", "landing page", "pagina", "frontend", "react", "responsivo"])) found.add("website");
  if (includesAny(q, ["saas", "assinatura", "multi-tenant", "painel administrativo", "produto web"])) found.add("saas");
  if (includesAny(q, ["telegram", "bot", "botao de telegram", "webhook"])) found.add("telegram");
  if (includesAny(q, ["supabase", "postgres", "banco de dados", "database", "rls"])) found.add("supabase");
  if (includesAny(q, ["api", "backend", "servidor", "endpoint", "webhook"])) found.add("api");
  if (includesAny(q, ["bug", "erro", "falha", "corrigir", "debug", "regressao"])) found.add("debug");
  if (includesAny(q, ["teste", "testar", "validar", "qa", "e2e", "vitest", "playwright"])) found.add("testing");
  if (includesAny(q, ["deploy", "publicar", "hospedar", "producao", "vercel", "cloudflare"])) found.add("deployment");
  return [...found];
}

const item = (id: string, title: string, objective: string, deliverables: string[], acceptance: string[], approvalRequired = false): EngineeringWorkItem => ({ id, title, objective, deliverables, acceptance, approvalRequired });

export function createAutonomousEngineeringBacklog(request: string): EngineeringWorkItem[] {
  const caps = detectBuildCapabilities(request);
  const q = normalize(request);
  const work: EngineeringWorkItem[] = [
    item("discover", "Descoberta e critérios de aceite", "Transformar o pedido em requisitos verificáveis, premissas e limites.", ["requisitos funcionais e não funcionais", "fluxos principais e estados de erro", "critérios de aceite mensuráveis"], ["Escopo e premissas explícitos", "Ambiguidades críticas resolvidas"]),
    item("inspect", "Inspeção e arquitetura", "Inspecionar o repositório e adaptar a solução à arquitetura existente.", ["mapa de módulos e dependências", "contratos e integrações", "riscos e plano de alterações"], ["Arquivos afetados lidos", "Compatibilidade avaliada"]),
  ];
  if (caps.includes("website")) work.push(item("ui", "Experiência web responsiva", "Construir interface mobile-first, acessível e consistente.", ["páginas e componentes reutilizáveis", "design tokens e estados loading/empty/error", "SEO e acessibilidade"], ["Layouts verificados em larguras mobile e desktop", "Navegação e formulários funcionais"]));
  if (caps.includes("saas")) work.push(item("saas", "Fundação SaaS", "Implementar isolamento de tenants, usuários, planos e ciclo de vida da conta.", ["modelo de organizações e membros", "papéis e permissões", "limites de uso e estados de assinatura"], ["Um tenant não acessa dados de outro", "Autorização aplicada no servidor"]));
  if (caps.includes("supabase")) work.push(item("data", "Persistência e segurança de dados", "Implementar schema, migrations, constraints, índices e políticas de acesso.", ["migrations versionadas", "políticas RLS", "tipos e validação de dados"], ["RLS testada com usuários distintos", "Migrations aplicáveis e reversíveis quando possível"]));
  if (caps.includes("telegram")) work.push(item("telegram", "Integração Telegram", "Conectar bot por webhook com validação de origem e processamento idempotente.", ["registro seguro do webhook", "tratamento de comandos e eventos", "gestão de falhas e repetição"], ["Segredo do bot somente no servidor", "Eventos duplicados não duplicam efeitos"]));
  if (caps.includes("api") || caps.includes("saas")) work.push(item("backend", "Serviços e regras de negócio", "Implementar APIs com validação, autorização, rate limit e observabilidade.", ["contratos de API", "tratamento de erros", "logs sem dados sensíveis"], ["Acesso não autorizado é negado", "Entradas inválidas são rejeitadas"]));
  if (caps.includes("debug") || includesAny(q, ["criar", "construir", "desenvolver", "implementar"])) work.push(item("repair", "Ciclo autônomo de depuração", "Reproduzir falhas, identificar causa raiz, corrigir e repetir validações.", ["caso de reprodução", "causa raiz com evidência", "correção mínima", "teste de regressão"], ["Falha original reproduzida ou limitação documentada", "Teste que falhava passa após a correção", "Nenhuma regressão conhecida"]));
  work.push(item("verify", "Verificação ponta a ponta", "Executar verificações adequadas ao projeto e reunir evidências.", ["typecheck, lint e build", "testes unitários e integração", "testes de fluxos críticos e segurança"], ["Resultados registrados por comando", "Falhas remanescentes declaradas"]));
  if (caps.includes("deployment")) work.push(item("deploy", "Preparação de publicação", "Preparar deploy reproduzível sem publicar sem autorização explícita.", ["variáveis e secrets documentados", "health checks", "plano de rollback"], ["Configuração sem secrets no cliente", "Publicação aprovada pelo usuário"], true));
  work.push(item("deliver", "Entrega auditável", "Entregar resultado, limitações e próximos passos com rastreabilidade.", ["arquivos alterados", "testes executados e resultados", "decisões e pendências"], ["Nenhum teste/deploy alegado sem evidência"]));
  return work;
}

export function formatAutonomousEngineeringContext(request: string): string {
  const capabilities = detectBuildCapabilities(request);
  if (!capabilities.length && !includesAny(normalize(request), ["criar", "construir", "desenvolver", "implementar", "corrigir", "bug", "erro"])) return "";
  const backlog = createAutonomousEngineeringBacklog(request);
  return [
    "## WLC.IA — Autonomous Software Factory & Developer V2",
    `Capacidades detectadas: ${capabilities.length ? capabilities.join(", ") : "engenharia geral"}. Trate a detecção como hipótese e confirme pelo contexto.`,
    "Você deve atuar como uma fábrica de software e desenvolvedora autônoma: transformar requisitos em alterações funcionais, não apenas sugerir snippets ou telas fictícias.",
    "PROTOCOLO OBRIGATÓRIO: (1) inspecione o projeto e seus scripts; (2) decomponha em entregas verticais pequenas; (3) implemente somente dentro do escopo aprovado; (4) execute ferramentas reais disponíveis; (5) reproduza bugs antes de corrigir; (6) crie/execute teste de regressão; (7) repita correção e validação enquanto houver falhas e orçamento/limites permitirem; (8) revise diff e entregue evidências.",
    "DEPURAÇÃO: classifique sintoma, obtenha stack trace/log, reproduza, formule hipótese testável, localize causa raiz, aplique menor correção segura, execute teste que falhava e suíte relevante. Se não conseguir reproduzir, não invente causa raiz: informe evidências e solicite dados adicionais.",
    "CRIAÇÃO DE PRODUTO: considerar UX mobile-first, acessibilidade, SEO, estados vazios/erro/carregamento, contratos API, persistência, autorização server-side, migrations, RLS, idempotência, observabilidade e testes. Para Telegram, validar webhook e manter token exclusivamente no servidor.",
    "GATES: nunca simule terminal, browser, banco, CI ou deploy. Não marque tarefa concluída sem critérios de aceite e evidência. Não exponha secrets. Publicação, gastos, exclusões, migrações destrutivas e mudanças fora do plano exigem aprovação humana.",
    "Backlog adaptativo sugerido:",
    ...backlog.map((w, i) => `${i + 1}. ${w.title} — ${w.objective}\n   Entregáveis: ${w.deliverables.join("; ")}\n   Aceite: ${w.acceptance.join("; ")}${w.approvalRequired ? "\n   APROVAÇÃO HUMANA OBRIGATÓRIA" : ""}`),
    "Se uma ferramenta necessária não estiver disponível, não alegue que executou a operação. Produza o artefato possível, identifique o bloqueio e indique a integração necessária.",
  ].join("\n");
}
