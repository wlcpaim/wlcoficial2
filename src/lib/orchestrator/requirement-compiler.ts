/**
 * WLC Sovereign Builder — Requirement Compiler (Stage 6)
 *
 * Deterministic transformation of natural-language product requests into
 * formalized requirements, acceptance criteria and risk classification.
 * LLM creativity is expected to operate *inside* these rails, not replace them.
 */

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type CapabilityClass =
  | "website"
  | "saas"
  | "internal_tool"
  | "api"
  | "telegram"
  | "supabase"
  | "auth"
  | "tenancy"
  | "deployment"
  | "debug"
  | "testing";

export type FormalRequirement = {
  id: string;
  statement: string;
  category: "functional" | "non_functional" | "constraint" | "assumption";
  priority: "must" | "should" | "could";
  risk: RiskLevel;
  acceptanceCriteria: string[];
};

export type CompiledRequirements = {
  requestId: string;
  originalRequest: string;
  summary: string;
  capabilities: CapabilityClass[];
  requirements: FormalRequirement[];
  overallRisk: RiskLevel;
  requiresHumanApproval: boolean;
  assumptions: string[];
  openQuestions: string[];
  suggestedStack: string[];
  compiledAt: string;
};

const normalize = (value: string) =>
  value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const includesAny = (value: string, terms: string[]) => terms.some((t) => value.includes(t));

function detectCapabilities(request: string): CapabilityClass[] {
  const q = normalize(request);
  const found = new Set<CapabilityClass>();
  if (includesAny(q, ["site", "website", "landing", "pagina", "frontend", "react", "responsivo", "ui"])) found.add("website");
  if (includesAny(q, ["saas", "assinatura", "multi-tenant", "multi tenant", "painel administrativo", "produto web"])) found.add("saas");
  if (includesAny(q, ["ferramenta interna", "internal tool", "admin", "backoffice", "dashboard interno"])) found.add("internal_tool");
  if (includesAny(q, ["api", "backend", "servidor", "endpoint", "rest", "graphql"])) found.add("api");
  if (includesAny(q, ["telegram", "bot", "webhook telegram"])) found.add("telegram");
  if (includesAny(q, ["supabase", "postgres", "banco de dados", "database", "rls", "sql"])) found.add("supabase");
  if (includesAny(q, ["login", "auth", "autenticacao", "oauth", "jwt", "sessao", "cadastro"])) found.add("auth");
  if (includesAny(q, ["tenant", "multi-tenant", "organizacao", "workspace", "equipe"])) found.add("tenancy");
  if (includesAny(q, ["deploy", "publicar", "hospedar", "producao", "vercel", "cloudflare", "preview"])) found.add("deployment");
  if (includesAny(q, ["bug", "erro", "falha", "corrigir", "debug", "regressao"])) found.add("debug");
  if (includesAny(q, ["teste", "testar", "validar", "qa", "e2e", "vitest", "playwright"])) found.add("testing");
  if (found.size === 0) found.add("website"); // safe default for product-like requests
  return [...found];
}

function riskFromCapabilities(caps: CapabilityClass[]): RiskLevel {
  if (caps.includes("deployment") || caps.includes("tenancy")) return "high";
  if (caps.includes("saas") || caps.includes("auth") || caps.includes("supabase")) return "medium";
  if (caps.includes("debug")) return "medium";
  return "low";
}

function buildRequirements(request: string, caps: CapabilityClass[]): FormalRequirement[] {
  const reqs: FormalRequirement[] = [];
  let n = 1;
  const add = (
    statement: string,
    category: FormalRequirement["category"],
    priority: FormalRequirement["priority"],
    risk: RiskLevel,
    criteria: string[],
  ) => {
    reqs.push({
      id: `REQ-${String(n++).padStart(3, "0")}`,
      statement,
      category,
      priority,
      risk,
      acceptanceCriteria: criteria,
    });
  };

  add(
    `O sistema deve atender ao pedido: "${request.slice(0, 200)}${request.length > 200 ? "…" : ""}"`,
    "functional",
    "must",
    "medium",
    ["Escopo funcional principal implementado e verificável"],
  );

  if (caps.includes("auth")) {
    add("Usuários devem poder se autenticar de forma segura.", "functional", "must", "high", [
      "Fluxo de login/cadastro funcional",
      "Sessão protegida; rotas privadas inacessíveis sem autenticação",
    ]);
  }
  if (caps.includes("supabase") || caps.includes("saas")) {
    add("Dados persistidos em banco com políticas de acesso adequadas.", "functional", "must", "high", [
      "Schema criado e migrável",
      "RLS ou equivalente ativo para dados sensíveis",
    ]);
  }
  if (caps.includes("tenancy") || caps.includes("saas")) {
    add("Isolamento de dados por organização/tenant.", "functional", "must", "critical", [
      "Um tenant não consegue ler dados de outro",
      "Queries e policies testadas contra vazamento cross-tenant",
    ]);
  }
  if (caps.includes("website") || caps.includes("saas") || caps.includes("internal_tool")) {
    add("Interface responsiva e utilizável em desktop e mobile.", "non_functional", "must", "low", [
      "Layout legível em larguras ≥ 320px e ≥ 1024px",
      "Navegação principal acessível",
    ]);
  }
  if (caps.includes("deployment")) {
    add("Publicação em ambiente de preview/produção sob aprovação explícita.", "constraint", "must", "critical", [
      "Deploy só ocorre após gate de aprovação humana",
      "Rollback documentado ou automatizado disponível",
    ]);
  }

  add("Nenhuma credencial ou segredo deve ser commitado no repositório.", "constraint", "must", "critical", [
    "Ausência de .env, chaves e tokens no diff entregue",
  ]);

  add("Todas as validações devem produzir evidência auditável.", "non_functional", "must", "medium", [
    "typecheck/lint/test/build (quando aplicáveis) com exit code e output capturados",
  ]);

  return reqs;
}

function suggestStack(caps: CapabilityClass[]): string[] {
  const stack = ["TypeScript", "React", "Vite"];
  if (caps.includes("supabase") || caps.includes("saas") || caps.includes("auth") || caps.includes("tenancy")) {
    stack.push("Supabase (Auth + Postgres + RLS)");
  }
  if (caps.includes("telegram")) stack.push("Telegram Bot API / webhook");
  if (caps.includes("deployment")) stack.push("Preview deploy adapter (approval-gated)");
  stack.push("Vitest");
  return stack;
}

/**
 * Compile a natural-language request into formal requirements.
 * Pure and deterministic — suitable for audit and testing.
 */
export function compileRequirements(request: string): CompiledRequirements {
  const trimmed = request?.trim() ?? "";
  if (!trimmed) {
    throw new Error("Requirement compiler requires a non-empty request");
  }
  const capabilities = detectCapabilities(trimmed);
  const requirements = buildRequirements(trimmed, capabilities);
  const overallRisk = riskFromCapabilities(capabilities);
  const requiresHumanApproval =
    overallRisk === "high" || overallRisk === "critical" || capabilities.includes("deployment") || capabilities.includes("tenancy");

  const assumptions: string[] = [
    "O pedido descreve um produto web (ou API) a ser construído de forma incremental.",
    "Stack padrão do projeto (React + TypeScript) é aceitável a menos que o pedido diga o contrário.",
  ];
  if (capabilities.includes("supabase")) {
    assumptions.push("Supabase estará disponível como backend de dados e autenticação.");
  }

  const openQuestions: string[] = [];
  if (capabilities.includes("saas") && !capabilities.includes("tenancy")) {
    openQuestions.push("O produto precisa de multi-tenancy real ou basta um único workspace?");
  }
  if (capabilities.includes("deployment")) {
    openQuestions.push("Qual ambiente de destino (preview apenas, staging, produção)?");
  }
  if (!capabilities.includes("auth") && (capabilities.includes("saas") || capabilities.includes("internal_tool"))) {
    openQuestions.push("Há necessidade de autenticação de usuários?");
  }

  return {
    requestId: `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    originalRequest: trimmed,
    summary: `Produto com capacidades: ${capabilities.join(", ")}. Risco geral: ${overallRisk}.`,
    capabilities,
    requirements,
    overallRisk,
    requiresHumanApproval,
    assumptions,
    openQuestions,
    suggestedStack: suggestStack(capabilities),
    compiledAt: new Date().toISOString(),
  };
}

export function formatCompiledRequirements(compiled: CompiledRequirements): string {
  const lines = [
    "## Requisitos formalizados (Requirement Compiler)",
    `Resumo: ${compiled.summary}`,
    `Risco geral: ${compiled.overallRisk}${compiled.requiresHumanApproval ? " — aprovação humana necessária" : ""}`,
    `Stack sugerida: ${compiled.suggestedStack.join(", ")}`,
    "",
    "### Requisitos",
    ...compiled.requirements.map(
      (r) =>
        `- **${r.id}** [${r.priority}/${r.risk}] ${r.statement}\n  Critérios: ${r.acceptanceCriteria.join("; ")}`,
    ),
  ];
  if (compiled.assumptions.length) {
    lines.push("", "### Premissas", ...compiled.assumptions.map((a) => `- ${a}`));
  }
  if (compiled.openQuestions.length) {
    lines.push("", "### Perguntas em aberto", ...compiled.openQuestions.map((q) => `- ${q}`));
  }
  return lines.join("\n");
}
