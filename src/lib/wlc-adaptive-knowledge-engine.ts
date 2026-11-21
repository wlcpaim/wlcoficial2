/**
 * WLC.IA Adaptive Knowledge Engine v1.0
 * Structured knowledge acquisition, organization, retrieval, validation and update.
 * Extends the existing lexical base without replacing it. Does not train model weights.
 * Does not invent research results. When internet tools are unavailable, works only with
 * curated/local knowledge and declares the limitation.
 */

import { wlcLogger } from "./wlc-logger";

export const WLC_ADAPTIVE_KNOWLEDGE_VERSION = "1.0.0";

export type KnowledgeCategory =
  | "HTML5" | "CSS" | "JavaScript" | "TypeScript" | "Bootstrap" | "Tailwind"
  | "React" | "Next.js" | "Vue" | "Svelte" | "Node.js" | "Python"
  | "APIs" | "Backend" | "Frontend" | "Databases" | "Architecture"
  | "Systems Engineering" | "Security" | "DevOps" | "CI/CD" | "Cloud"
  | "Artificial Intelligence" | "Autonomous Agents" | "Automation"
  | "UI/UX" | "Design Systems" | "Performance" | "Accessibility"
  | "Testing" | "Product Engineering" | "Other";

export type ValidationStatus = "verified" | "experimental" | "outdated" | "pending" | "rejected";
export type ConfidenceLevel = "high" | "medium" | "low" | "unverified";

export type AdaptiveKnowledgeEntry = {
  id: string;
  category: KnowledgeCategory;
  title: string;
  description: string;
  content: string;
  examples?: string[];
  applicability?: string[];
  relatedTechnologies?: string[];
  source?: string;
  sourceUrl?: string;
  acquiredAt: string;
  updatedAt: string;
  confidence: ConfidenceLevel;
  validationStatus: ValidationStatus;
  version: string;
  keywords: string[];
  priority?: number;
};

export type KnowledgeGap = {
  category: KnowledgeCategory;
  topic: string;
  reason: string;
  suggestedSources: string[];
};

export type RetrievalResult = {
  entries: AdaptiveKnowledgeEntry[];
  gaps: KnowledgeGap[];
  query: string;
  engineVersion: string;
};

const normalize = (s: string) =>
  s.toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s./:-]/g, " ")
    .trim();

/** Official / high-trust source patterns (used for ranking and validation heuristics). */
const TRUSTED_SOURCE_HINTS = [
  "mdn", "developer.mozilla.org", "web.dev", "react.dev", "nextjs.org",
  "vuejs.org", "svelte.dev", "nodejs.org", "python.org", "typescriptlang.org",
  "tailwindcss.com", "getbootstrap.com", "w3.org", "github.com/",
  "docs.", "official", "specification", "rfc",
];

/** Seed curated adaptive entries (structured metadata). These complement WLC_CORE_KNOWLEDGE. */
export const ADAPTIVE_SEED_KNOWLEDGE: AdaptiveKnowledgeEntry[] = [
  {
    id: "ak-html5-semantic",
    category: "HTML5",
    title: "HTML5 semântico e acessível",
    description: "Uso correto de elementos semânticos, landmarks e atributos ARIA básicos.",
    content:
      "Prefira header, nav, main, article, section, aside, footer em vez de divs genéricas. Use h1–h6 em hierarquia real. Labels associados a inputs (for/id ou embrulhando). Imagens com alt significativo ou alt=\"\" quando decorativas. Landmarks e roles apenas quando a semântica nativa não cobre. Não use tabelas para layout.",
    examples: [
      "<main><article><h1>…</h1><p>…</p></article></main>",
      "<label for=\"email\">Email</label><input id=\"email\" type=\"email\" required />",
    ],
    applicability: ["landing pages", "dashboards", "documentação", "apps React/Vue"],
    relatedTechnologies: ["HTML5", "ARIA", "Accessibility"],
    source: "MDN / WAI",
    sourceUrl: "https://developer.mozilla.org/en-US/docs/Glossary/Semantics",
    acquiredAt: "2026-11-01T00:00:00Z",
    updatedAt: "2026-11-01T00:00:00Z",
    confidence: "high",
    validationStatus: "verified",
    version: "1.0.0",
    keywords: ["html5", "semantico", "semantic", "acessibilidade", "aria", "landmarks", "header", "main", "article"],
    priority: 10,
  },
  {
    id: "ak-css-modern-layout",
    category: "CSS",
    title: "Layout moderno com Flexbox e Grid",
    description: "Escolha e combinação de Flexbox e CSS Grid para layouts responsivos sem hacks.",
    content:
      "Use Flexbox para alinhamento unidimensional (nav, toolbars, cards em linha). Use Grid para layouts bidimensionais (páginas, dashboards, galerias). Prefira gap a margins manuais. Combine com media queries ou container queries. Evite position absolute para layout principal. Mobile-first: base mobile, refine em breakpoints maiores.",
    examples: [
      "display: flex; gap: 1rem; align-items: center;",
      "display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;",
    ],
    applicability: ["qualquer frontend moderno"],
    relatedTechnologies: ["CSS3", "Flexbox", "Grid", "Tailwind", "Bootstrap"],
    source: "MDN / web.dev",
    sourceUrl: "https://web.dev/learn/css",
    acquiredAt: "2026-11-01T00:00:00Z",
    updatedAt: "2026-11-01T00:00:00Z",
    confidence: "high",
    validationStatus: "verified",
    version: "1.0.0",
    keywords: ["css", "flexbox", "grid", "layout", "responsivo", "gap", "container queries"],
    priority: 10,
  },
  {
    id: "ak-ts-strict",
    category: "TypeScript",
    title: "TypeScript estrito e seguro",
    description: "Configuração e práticas para maximizar segurança de tipos sem over-engineering.",
    content:
      "Ative strict, noUncheckedIndexedAccess e exactOptionalPropertyTypes quando possível. Prefira unknown a any; estreite com type guards. Modele dados de API com Zod ou tipos manuais e valide na borda. Evite enums numéricos; prefira union de strings ou const objects. Não silencie erros com @ts-ignore sem justificativa documentada.",
    examples: [
      "const parseUser = (data: unknown): User => userSchema.parse(data);",
      "type Status = 'idle' | 'loading' | 'success' | 'error';",
    ],
    applicability: ["React", "Node", "Next.js", "APIs", "bibliotecas"],
    relatedTechnologies: ["TypeScript", "Zod", "React", "Node.js"],
    source: "TypeScript Handbook",
    sourceUrl: "https://www.typescriptlang.org/docs/handbook/intro.html",
    acquiredAt: "2026-11-01T00:00:00Z",
    updatedAt: "2026-11-01T00:00:00Z",
    confidence: "high",
    validationStatus: "verified",
    version: "1.0.0",
    keywords: ["typescript", "strict", "tipos", "zod", "type safety", "any", "unknown"],
    priority: 10,
  },
  {
    id: "ak-react-composition",
    category: "React",
    title: "Composição de componentes React modernos",
    description: "Padrões de composição, props, estado e efeitos sem anti-patterns comuns.",
    content:
      "Prefira composição a herança e a prop-drilling profundo (use context com moderação). Componentes pequenos e com responsabilidade única. Estado local quando possível; eleve só o necessário. useEffect apenas para sincronização com sistemas externos; não use para derivar estado. Server Components / RSC quando a stack permitir e o caso de uso for adequado. Evite re-renders desnecessários com keys estáveis e memoização justificada.",
    examples: [
      "<Card><CardHeader /><CardContent /></Card>",
      "const [query, setQuery] = useState(''); const filtered = useMemo(() => items.filter(...), [items, query]);",
    ],
    applicability: ["React 18+", "Next.js App Router", "Vite + React"],
    relatedTechnologies: ["React", "Next.js", "TypeScript", "TanStack Query"],
    source: "React.dev",
    sourceUrl: "https://react.dev/learn",
    acquiredAt: "2026-11-01T00:00:00Z",
    updatedAt: "2026-11-01T00:00:00Z",
    confidence: "high",
    validationStatus: "verified",
    version: "1.0.0",
    keywords: ["react", "composicao", "hooks", "useEffect", "server components", "estado", "props"],
    priority: 10,
  },
  {
    id: "ak-design-tokens",
    category: "Design Systems",
    title: "Tokens de design e consistência visual",
    description: "Definição e uso de design tokens semânticos para temas e escala.",
    content:
      "Defina tokens semânticos antes dos componentes: cores (bg, surface, text, muted, primary, danger), radius, shadows, spacing scale, tipografia. Prefira nomes semânticos a nomes de cor brutos. Dark mode inverte superfícies e texto mantendo contraste de status. Documente variantes (size, intent). Reutilize os mesmos botões, inputs e cards em todas as páginas. Não invente estilo novo por página se o sistema já cobre o caso.",
    examples: [
      "--color-primary, --radius-md, --space-4, --font-sans",
      "button variants: default | secondary | outline | ghost | destructive",
    ],
    applicability: ["qualquer produto com UI consistente"],
    relatedTechnologies: ["Tailwind", "CSS Variables", "shadcn/ui", "Radix"],
    source: "Design Systems community / shadcn patterns",
    sourceUrl: "https://ui.shadcn.com",
    acquiredAt: "2026-11-01T00:00:00Z",
    updatedAt: "2026-11-01T00:00:00Z",
    confidence: "high",
    validationStatus: "verified",
    version: "1.0.0",
    keywords: ["design tokens", "tokens", "tema", "dark mode", "consistencia", "css variables", "shadcn"],
    priority: 10,
  },
  {
    id: "ak-api-security",
    category: "Security",
    title: "APIs seguras e validação na borda",
    description: "Princípios mínimos de segurança para APIs e backends.",
    content:
      "Valide e sanitize entradas na borda (Zod/Pydantic). Nunca confie no cliente. Use autenticação e autorização explícitas. Parametrize queries (nunca concatenação de SQL). Aplique least privilege. Não exponha service-role ou secrets no frontend. Rate-limit endpoints sensíveis. Retorne erros genéricos ao cliente; logue detalhes internamente. CORS restritivo. HTTPS obrigatório em produção.",
    examples: [
      "const body = schema.parse(await req.json());",
      "Prepared statements / parameterized queries only",
    ],
    applicability: ["REST", "GraphQL", "Server Actions", "Edge functions"],
    relatedTechnologies: ["Node.js", "Python", "FastAPI", "Zod", "Supabase", "PostgreSQL"],
    source: "OWASP / industry practice",
    sourceUrl: "https://owasp.org/www-project-api-security/",
    acquiredAt: "2026-11-01T00:00:00Z",
    updatedAt: "2026-11-01T00:00:00Z",
    confidence: "high",
    validationStatus: "verified",
    version: "1.0.0",
    keywords: ["seguranca", "api", "validacao", "zod", "sql injection", "auth", "secrets", "cors"],
    priority: 12,
  },
  {
    id: "ak-architecture-proportional",
    category: "Architecture",
    title: "Arquitetura proporcional ao problema",
    description: "Escolha de arquitetura sem over-engineering.",
    content:
      "Monolito modular bem organizado é a escolha padrão para a maioria dos produtos. Microserviços só quando limites de equipe, escala ou deploy independente justificam. Separe páginas, componentes, serviços, modelos e estilos. Use configuração de ambiente. Versionar migrations. Documente decisões. Não adicione dependências sem justificativa. Não transforme um site simples em sistema distribuído.",
    examples: [
      "src/components, src/lib, src/routes, server/",
      "Clean Architecture / hexagonal quando complexidade de domínio exigir",
    ],
    applicability: ["web apps", "APIs", "SaaS", "MVPs"],
    relatedTechnologies: ["Node.js", "Next.js", "NestJS", "FastAPI", "Docker"],
    source: "Industry practice / WLC.IA engineering principles",
    acquiredAt: "2026-11-01T00:00:00Z",
    updatedAt: "2026-11-01T00:00:00Z",
    confidence: "high",
    validationStatus: "verified",
    version: "1.0.0",
    keywords: ["arquitetura", "monolito", "microservicos", "modular", "clean architecture", "proporcional"],
    priority: 11,
  },
  {
    id: "ak-a11y-basics",
    category: "Accessibility",
    title: "Acessibilidade essencial (WCAG 2.2 AA)",
    description: "Checklist mínimo de acessibilidade para interfaces web.",
    content:
      "Contraste AA (4.5:1 texto normal, 3:1 grande). Foco visível em todos os interativos. Navegação por teclado completa. Labels em formulários. Mensagens de erro associadas. Não dependa só de cor. Alt em imagens. Hierarquia de headings. Skip links quando necessário. Teste com teclado e, quando possível, leitores de tela. Prefira componentes Radix/shadcn que já tratam foco e ARIA.",
    examples: [
      "focus-visible:ring-2 focus-visible:ring-offset-2",
      "aria-invalid + aria-describedby apontando para mensagem de erro",
    ],
    applicability: ["qualquer UI pública ou interna"],
    relatedTechnologies: ["HTML", "ARIA", "Radix UI", "shadcn/ui"],
    source: "WCAG 2.2 / WAI",
    sourceUrl: "https://www.w3.org/WAI/WCAG22/quickref/",
    acquiredAt: "2026-11-01T00:00:00Z",
    updatedAt: "2026-11-01T00:00:00Z",
    confidence: "high",
    validationStatus: "verified",
    version: "1.0.0",
    keywords: ["acessibilidade", "a11y", "wcag", "contraste", "teclado", "aria", "foco", "screen reader"],
    priority: 11,
  },
];

/** In-memory registry (extensible; does not persist across process restarts). */
const registry: AdaptiveKnowledgeEntry[] = [...ADAPTIVE_SEED_KNOWLEDGE];
const idIndex = new Set(registry.map((e) => e.id));

export function listCategories(): KnowledgeCategory[] {
  return Array.from(new Set(registry.map((e) => e.category))).sort() as KnowledgeCategory[];
}

export function getEntryById(id: string): AdaptiveKnowledgeEntry | undefined {
  return registry.find((e) => e.id === id);
}

export function listEntries(filter?: {
  category?: KnowledgeCategory;
  validationStatus?: ValidationStatus;
  minConfidence?: ConfidenceLevel;
}): AdaptiveKnowledgeEntry[] {
  const confOrder: Record<ConfidenceLevel, number> = { high: 3, medium: 2, low: 1, unverified: 0 };
  const min = filter?.minConfidence ? confOrder[filter.minConfidence] : 0;
  return registry.filter((e) => {
    if (filter?.category && e.category !== filter.category) return false;
    if (filter?.validationStatus && e.validationStatus !== filter.validationStatus) return false;
    if (confOrder[e.confidence] < min) return false;
    return true;
  });
}

/** Detect near-duplicates by title + category + overlapping keywords. */
export function findDuplicates(candidate: Pick<AdaptiveKnowledgeEntry, "title" | "category" | "keywords">): AdaptiveKnowledgeEntry[] {
  const titleNorm = normalize(candidate.title);
  return registry.filter((e) => {
    if (e.category !== candidate.category) return false;
    if (normalize(e.title) === titleNorm) return true;
    const overlap = e.keywords.filter((k) => candidate.keywords.includes(k)).length;
    return overlap >= 3 && overlap / Math.max(e.keywords.length, 1) > 0.5;
  });
}

/**
 * Register new knowledge. Rejects exact ID collision and strong duplicates.
 * Does not claim external research was performed.
 */
export function registerKnowledge(
  entry: Omit<AdaptiveKnowledgeEntry, "acquiredAt" | "updatedAt"> & {
    acquiredAt?: string;
    updatedAt?: string;
  },
): { ok: true; entry: AdaptiveKnowledgeEntry } | { ok: false; reason: string; duplicates?: AdaptiveKnowledgeEntry[] } {
  if (idIndex.has(entry.id)) {
    return { ok: false, reason: `ID já existe: ${entry.id}` };
  }
  const dups = findDuplicates(entry);
  if (dups.length > 0) {
    return { ok: false, reason: "Possível duplicata detectada", duplicates: dups };
  }
  const now = new Date().toISOString();
  const full: AdaptiveKnowledgeEntry = {
    ...entry,
    acquiredAt: entry.acquiredAt ?? now,
    updatedAt: entry.updatedAt ?? now,
  };
  registry.push(full);
  idIndex.add(full.id);
  wlcLogger.info("adaptive-knowledge", "registered", { id: full.id, category: full.category });
  return { ok: true, entry: full };
}

export function updateKnowledge(
  id: string,
  patch: Partial<Omit<AdaptiveKnowledgeEntry, "id" | "acquiredAt">>,
): AdaptiveKnowledgeEntry | null {
  const idx = registry.findIndex((e) => e.id === id);
  const current = registry[idx];
  if (idx < 0 || !current) return null;
  const updated: AdaptiveKnowledgeEntry = {
    ...current,
    ...patch,
    id,
    acquiredAt: current.acquiredAt,
    updatedAt: new Date().toISOString(),
  };
  registry[idx] = updated;
  wlcLogger.info("adaptive-knowledge", "updated", { id });
  return updated;
}

export function markOutdated(id: string, reason?: string): boolean {
  const entry = updateKnowledge(id, {
    validationStatus: "outdated",
    confidence: "low",
    description: reason
      ? `${getEntryById(id)?.description ?? ""} [outdated: ${reason}]`
      : getEntryById(id)?.description,
  });
  return !!entry;
}

/** Lexical + metadata scoring retrieval. */
export function retrieveAdaptiveKnowledge(query: string, limit = 5): RetrievalResult {
  const q = normalize(query);
  const tokens = q.split(/\s+/).filter(Boolean);
  if (!tokens.length) {
    return { entries: [], gaps: [], query, engineVersion: WLC_ADAPTIVE_KNOWLEDGE_VERSION };
  }

  const scored = registry.map((entry) => {
    let score = 0;
    const hay = normalize(
      [entry.title, entry.description, entry.content, entry.keywords.join(" "), entry.category, ...(entry.relatedTechnologies ?? [])].join(" "),
    );
    for (const t of tokens) {
      if (hay.includes(t)) score += 2;
      if (entry.keywords.some((k) => normalize(k).includes(t))) score += 3;
      if (normalize(entry.title).includes(t)) score += 4;
      if (normalize(entry.category).includes(t)) score += 2;
    }
    if (entry.validationStatus === "verified") score += 2;
    if (entry.validationStatus === "outdated" || entry.validationStatus === "rejected") score -= 5;
    if (entry.confidence === "high") score += 2;
    if (entry.confidence === "low" || entry.confidence === "unverified") score -= 1;
    if (entry.priority) score += entry.priority * 0.1;
    if (entry.sourceUrl && TRUSTED_SOURCE_HINTS.some((h) => entry.sourceUrl!.includes(h) || (entry.source ?? "").toLowerCase().includes(h))) {
      score += 1.5;
    }
    return { entry, score };
  });

  const ranked = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.entry);

  const gaps = detectGaps(query, ranked);

  return {
    entries: ranked,
    gaps,
    query,
    engineVersion: WLC_ADAPTIVE_KNOWLEDGE_VERSION,
  };
}

function detectGaps(query: string, found: AdaptiveKnowledgeEntry[]): KnowledgeGap[] {
  const q = normalize(query);
  const gaps: KnowledgeGap[] = [];
  const categoryHints: { cat: KnowledgeCategory; terms: string[] }[] = [
    { cat: "Next.js", terms: ["next.js", "nextjs", "app router"] },
    { cat: "Vue", terms: ["vue", "nuxt"] },
    { cat: "Svelte", terms: ["svelte", "sveltekit"] },
    { cat: "Python", terms: ["python", "fastapi", "django"] },
    { cat: "DevOps", terms: ["docker", "kubernetes", "ci/cd", "github actions"] },
    { cat: "Cloud", terms: ["aws", "gcp", "azure", "cloudflare", "vercel"] },
  ];
  for (const hint of categoryHints) {
    if (hint.terms.some((t) => q.includes(t)) && !found.some((e) => e.category === hint.cat)) {
      gaps.push({
        category: hint.cat,
        topic: hint.cat,
        reason: `Consulta menciona ${hint.cat} mas a base adaptativa não retornou entradas verificadas nesta categoria.`,
        suggestedSources: ["documentação oficial", "repositório oficial no GitHub"],
      });
    }
  }
  return gaps;
}

export function formatAdaptiveKnowledgeContext(result: RetrievalResult): string {
  if (!result.entries.length && !result.gaps.length) return "";
  const lines: string[] = [
    `## WLC.IA Adaptive Knowledge Engine v${WLC_ADAPTIVE_KNOWLEDGE_VERSION}`,
    "Conhecimento estruturado recuperado (curado/local). Não invente fontes ou resultados de pesquisa externa não executada.",
  ];
  for (const e of result.entries) {
    lines.push(
      `### [${e.category}] ${e.title} (${e.validationStatus}/${e.confidence})`,
      e.content,
    );
    if (e.examples?.length) lines.push(`Exemplos: ${e.examples.slice(0, 2).join(" | ")}`);
    if (e.source) lines.push(`Fonte: ${e.source}${e.sourceUrl ? ` — ${e.sourceUrl}` : ""}`);
  }
  if (result.gaps.length) {
    lines.push("### Lacunas detectadas");
    for (const g of result.gaps) {
      lines.push(`- ${g.category}: ${g.reason} Sugestões: ${g.suggestedSources.join(", ")}`);
    }
  }
  return lines.join("\n");
}

export function getAdaptiveKnowledgeStats() {
  const byCategory: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const e of registry) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;
    byStatus[e.validationStatus] = (byStatus[e.validationStatus] ?? 0) + 1;
  }
  return {
    version: WLC_ADAPTIVE_KNOWLEDGE_VERSION,
    total: registry.length,
    byCategory,
    byStatus,
  };
}
