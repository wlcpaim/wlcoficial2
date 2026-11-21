/**
 * WLC.IA Modern Technology Radar v1.0
 * Comparative matrix of technologies. Helps choose tools by requirements,
 * not by popularity alone. Honest about trade-offs.
 */

export const WLC_TECHNOLOGY_RADAR_VERSION = "1.0.0";

export type TechStatus = "adopt" | "trial" | "assess" | "hold";
export type TechArea =
  | "frontend"
  | "ui-framework"
  | "styling"
  | "motion"
  | "backend"
  | "database"
  | "infrastructure"
  | "language"
  | "testing"
  | "other";

export type TechEntry = {
  id: string;
  name: string;
  area: TechArea;
  status: TechStatus;
  purpose: string;
  advantages: string[];
  disadvantages: string[];
  complexity: "low" | "medium" | "high";
  performance: "excellent" | "good" | "adequate" | "variable";
  maturity: "mature" | "stable" | "emerging" | "experimental";
  bestFor: string[];
  avoidWhen: string[];
  alternatives: string[];
  notes?: string;
};

export const TECHNOLOGY_RADAR: TechEntry[] = [
  // Frontend / meta-frameworks
  {
    id: "react",
    name: "React",
    area: "frontend",
    status: "adopt",
    purpose: "UI component library / ecosystem for interactive applications",
    advantages: ["Ecossistema enorme", "Contratos de emprego", "Server Components (com Next)", "Ferramentas maduras"],
    disadvantages: ["Curva e decisões de arquitetura", "Bundle pode crescer sem disciplina", "Muitas formas de fazer a mesma coisa"],
    complexity: "medium",
    performance: "good",
    maturity: "mature",
    bestFor: ["SPAs", "dashboards", "SaaS", "design systems"],
    avoidWhen: ["site de conteúdo majoritariamente estático sem interatividade"],
    alternatives: ["Vue", "Svelte", "Solid", "Astro (ilhas)"],
  },
  {
    id: "nextjs",
    name: "Next.js",
    area: "frontend",
    status: "adopt",
    purpose: "React meta-framework (App Router, RSC, routing, data)",
    advantages: ["RSC", "Roteamento file-based", "Otimizações de imagem/fonte", "Deploy Vercel maduro"],
    disadvantages: ["Acoplamento ao ecossistema", "Complexidade App Router", "Alguns padrões mudam entre majors"],
    complexity: "medium",
    performance: "excellent",
    maturity: "mature",
    bestFor: ["produtos full-stack React", "SEO + interatividade", "SaaS"],
    avoidWhen: ["site estático simples", "time sem vontade de aprender App Router"],
    alternatives: ["Remix", "Astro", "TanStack Start", "Nuxt"],
  },
  {
    id: "astro",
    name: "Astro",
    area: "frontend",
    status: "adopt",
    purpose: "Content-focused framework with islands architecture",
    advantages: ["JS mínimo por padrão", "Excelente para conteúdo", "UI frameworks opcionais por ilha"],
    disadvantages: ["Menos ideal para apps altamente interativos full-SPA"],
    complexity: "low",
    performance: "excellent",
    maturity: "stable",
    bestFor: ["docs", "blogs", "marketing", "portfólios"],
    avoidWhen: ["dashboard denso com muito estado cliente"],
    alternatives: ["Next.js estático", "Eleventy", "Hugo"],
  },
  {
    id: "vue",
    name: "Vue",
    area: "frontend",
    status: "adopt",
    purpose: "Progressive UI framework",
    advantages: ["DX amigável", "SFC", "Boa documentação", "Nuxt para full-stack"],
    disadvantages: ["Mercado menor que React em alguns países"],
    complexity: "low",
    performance: "good",
    maturity: "mature",
    bestFor: ["apps progressivos", "times que preferem template syntax"],
    avoidWhen: ["ecossistema React já dominante no time"],
    alternatives: ["React", "Svelte"],
  },
  {
    id: "svelte",
    name: "Svelte / SvelteKit",
    area: "frontend",
    status: "trial",
    purpose: "Compile-time UI framework with low runtime overhead",
    advantages: ["Pouco boilerplate", "Performance", "SvelteKit completo"],
    disadvantages: ["Ecossistema menor", "Menos talentos no mercado"],
    complexity: "low",
    performance: "excellent",
    maturity: "stable",
    bestFor: ["apps interativas enxutas", "produtos que valorizam DX e bundle"],
    avoidWhen: ["necessidade forte de ecossistema React/Vue"],
    alternatives: ["React", "Solid", "Vue"],
  },
  // Styling
  {
    id: "tailwind",
    name: "Tailwind CSS",
    area: "styling",
    status: "adopt",
    purpose: "Utility-first CSS",
    advantages: ["Velocidade de UI", "Design system via config", "Purge/content scanning"],
    disadvantages: ["HTML verboso", "Disciplina necessária para não virar bagunça"],
    complexity: "low",
    performance: "excellent",
    maturity: "mature",
    bestFor: ["produtos custom", "design systems", "React/Vue/Svelte"],
    avoidWhen: ["time prefere CSS semântico clássico ou Bootstrap já estabelecido"],
    alternatives: ["CSS Modules", "Vanilla CSS + tokens", "UnoCSS"],
  },
  {
    id: "bootstrap",
    name: "Bootstrap",
    area: "styling",
    status: "adopt",
    purpose: "Component-oriented CSS framework",
    advantages: ["Componentes prontos", "Familiar em admin/CRUD", "Rápido para protótipos"],
    disadvantages: ["Look reconhecível", "Customização profunda pode ser trabalhosa"],
    complexity: "low",
    performance: "good",
    maturity: "mature",
    bestFor: ["CRUDs", "admin", "times acostumados ao Bootstrap"],
    avoidWhen: ["marca que precisa de identidade visual muito distinta"],
    alternatives: ["Tailwind", "Bulma", "Pico.css"],
  },
  // UI kits
  {
    id: "shadcn",
    name: "shadcn/ui + Radix",
    area: "ui-framework",
    status: "adopt",
    purpose: "Copy-paste accessible components built on Radix + Tailwind",
    advantages: ["Acessibilidade Radix", "Código no seu repo", "Customizável", "Não é caixa-preta npm de componentes"],
    disadvantages: ["Você mantém o código", "Requer Tailwind"],
    complexity: "medium",
    performance: "good",
    maturity: "stable",
    bestFor: ["produtos React com design system próprio"],
    avoidWhen: ["projeto sem Tailwind ou sem React"],
    alternatives: ["Headless UI", "Mantine", "Chakra", "MUI"],
  },
  // Backend
  {
    id: "node-express",
    name: "Node.js + Express / Fastify",
    area: "backend",
    status: "adopt",
    purpose: "HTTP APIs em JavaScript/TypeScript",
    advantages: ["Mesma linguagem do frontend", "Ecossistema npm", "Fastify mais performático e schema-aware"],
    disadvantages: ["CPU-bound fraco", "Precisa disciplina de estrutura"],
    complexity: "low",
    performance: "good",
    maturity: "mature",
    bestFor: ["APIs BFF", "SaaS Node", "integrações"],
    avoidWhen: ["workload pesado de CPU/ML sem workers"],
    alternatives: ["NestJS", "Hono", "FastAPI", "Go"],
  },
  {
    id: "fastapi",
    name: "Python + FastAPI",
    area: "backend",
    status: "adopt",
    purpose: "APIs Python tipadas e rápidas de desenvolver",
    advantages: ["Tipagem com Pydantic", "OpenAPI automático", "Ótimo para dados/ML adjacente"],
    disadvantages: ["Deploy e packaging Python", "Concorrência precisa de cuidado (async)"],
    complexity: "low",
    performance: "good",
    maturity: "stable",
    bestFor: ["APIs de dados", "ML services", "backends Python"],
    avoidWhen: ["time só TypeScript e zero Python"],
    alternatives: ["Django", "Flask", "Node", "Go"],
  },
  {
    id: "nestjs",
    name: "NestJS",
    area: "backend",
    status: "trial",
    purpose: "Opinionated Node framework (modules, DI)",
    advantages: ["Estrutura clara para times grandes", "Integrações", "TypeScript first"],
    disadvantages: ["Mais boilerplate", "Overkill para APIs pequenas"],
    complexity: "high",
    performance: "good",
    maturity: "stable",
    bestFor: ["backends enterprise Node", "times que gostam de Angular-like structure"],
    avoidWhen: ["MVP/API mínima"],
    alternatives: ["Fastify modular", "Express", "Hono"],
  },
  // Databases
  {
    id: "postgres",
    name: "PostgreSQL",
    area: "database",
    status: "adopt",
    purpose: "Relational database general-purpose",
    advantages: ["SQL poderoso", "JSON/JSONB", "Extensões", "Maturidade"],
    disadvantages: ["Operação e tuning em escala"],
    complexity: "medium",
    performance: "excellent",
    maturity: "mature",
    bestFor: ["maioria dos produtos com dados relacionais"],
    avoidWhen: ["cache puro ou documentos totalmente sem schema (avaliar caso a caso)"],
    alternatives: ["MySQL", "SQLite", "MongoDB"],
  },
  {
    id: "sqlite",
    name: "SQLite",
    area: "database",
    status: "adopt",
    purpose: "Embedded relational DB",
    advantages: ["Zero ops", "Perfeito para edge/local/MVP", "Simples"],
    disadvantages: ["Escrita concorrente limitada", "Não é servidor multi-writer clássico"],
    complexity: "low",
    performance: "excellent",
    maturity: "mature",
    bestFor: ["MVP", "apps locais", "edge", "testes"],
    avoidWhen: ["muitos writers concorrentes em um único arquivo"],
    alternatives: ["PostgreSQL", "libSQL"],
  },
  {
    id: "redis",
    name: "Redis",
    area: "database",
    status: "adopt",
    purpose: "In-memory store / cache / queues leves",
    advantages: ["Latência baixa", "Estruturas de dados", "Pub/sub"],
    disadvantages: ["Memória", "Não substituir DB primário sem estratégia de persistência"],
    complexity: "medium",
    performance: "excellent",
    maturity: "mature",
    bestFor: ["cache", "rate limit", "sessões", "filas simples"],
    avoidWhen: ["fonte da verdade relacional"],
    alternatives: ["KeyDB", "Dragonfly", "Memcached"],
  },
  // Infra
  {
    id: "docker",
    name: "Docker",
    area: "infrastructure",
    status: "adopt",
    purpose: "Containerization",
    advantages: ["Reprodutibilidade", "Paridade dev/prod", "Base para orquestração"],
    disadvantages: ["Complexidade de imagens", "Overhead se mal usado"],
    complexity: "medium",
    performance: "good",
    maturity: "mature",
    bestFor: ["quase qualquer backend moderno"],
    avoidWhen: ["script único sem dependências e sem deploy containerizado"],
    alternatives: ["Podman", "buildpacks"],
  },
  {
    id: "github-actions",
    name: "GitHub Actions",
    area: "infrastructure",
    status: "adopt",
    purpose: "CI/CD no GitHub",
    advantages: ["Integração nativa", "Marketplace", "Suficiente para a maioria dos repos"],
    disadvantages: ["Minutos e custos em orgs grandes", "YAML pode ficar complexo"],
    complexity: "low",
    performance: "adequate",
    maturity: "mature",
    bestFor: ["CI de lint/test/build/deploy"],
    avoidWhen: ["já existe plataforma CI corporativa obrigatória"],
    alternatives: ["GitLab CI", "CircleCI", "Buildkite"],
  },
];

const normalize = (s: string) =>
  (s ?? "")
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function findTechnologies(query: string, limit = 6): TechEntry[] {
  const q = normalize(query);
  const tokens = q.split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];

  const scored = TECHNOLOGY_RADAR.map((t) => {
    let score = 0;
    const hay = normalize(
      [t.name, t.purpose, t.area, ...t.bestFor, ...t.advantages, ...t.alternatives].join(" "),
    );
    for (const tok of tokens) {
      if (hay.includes(tok)) score += 2;
      if (normalize(t.name).includes(tok)) score += 5;
      if (t.alternatives.some((a) => normalize(a).includes(tok))) score += 2;
    }
    return { t, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.t);
}

export function compareTechnologies(idsOrNames: string[]): TechEntry[] {
  const wanted = idsOrNames.map(normalize);
  return TECHNOLOGY_RADAR.filter(
    (t) => wanted.includes(normalize(t.id)) || wanted.includes(normalize(t.name)),
  );
}

export function recommendStack(brief: {
  productType?: string;
  complexity?: string;
  teamSkills?: string[];
  priorities?: string[];
}): { recommendations: TechEntry[]; rationale: string } {
  const blob = normalize(
    [brief.productType, brief.complexity, ...(brief.teamSkills ?? []), ...(brief.priorities ?? [])].join(" "),
  );
  const picks: string[] = [];

  if (/conteudo|blog|docs|marketing|landing estatic/.test(blob)) picks.push("astro", "tailwind");
  else if (/dashboard|saas|admin|crm/.test(blob)) picks.push("react", "nextjs", "tailwind", "shadcn", "postgres");
  else if (/api|backend|dados|ml/.test(blob) && /python/.test(blob)) picks.push("fastapi", "postgres");
  else if (/api|backend/.test(blob)) picks.push("node-express", "postgres");
  else picks.push("react", "tailwind", "shadcn", "postgres");

  if (/ci|deploy|docker/.test(blob)) picks.push("docker", "github-actions");

  const recommendations = compareTechnologies(picks);
  const rationale =
    "Seleção baseada em tipo de produto, complexidade e sinais de prioridade. " +
    "Prefira tecnologias 'adopt' salvo requisito explícito em contrário. " +
    "Não adicione microserviços ou stacks pesadas sem necessidade comprovada.";

  return { recommendations, rationale };
}

export function formatTechnologyRadarContext(entries: TechEntry[]): string {
  if (!entries.length) return "";
  const lines = [
    `## WLC.IA Technology Radar v${WLC_TECHNOLOGY_RADAR_VERSION}`,
    "Compare opções pelo caso de uso. Não escolha só pelo hype.",
  ];
  for (const t of entries) {
    lines.push(
      `### ${t.name} [${t.status}] (${t.area})`,
      t.purpose,
      `Vantagens: ${t.advantages.slice(0, 3).join("; ")}`,
      `Desvantagens: ${t.disadvantages.slice(0, 2).join("; ")}`,
      `Melhor para: ${t.bestFor.join(", ")}`,
      `Evitar quando: ${t.avoidWhen.join(", ")}`,
      `Alternativas: ${t.alternatives.join(", ")}`,
      `Complexidade: ${t.complexity} | Maturidade: ${t.maturity} | Performance: ${t.performance}`,
    );
  }
  return lines.join("\n");
}
