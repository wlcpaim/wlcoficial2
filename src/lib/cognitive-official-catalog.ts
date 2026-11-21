// Official WLC.IA cognitive motors, shipped in the source code so every remix/clone/migration
// starts with a populated Cognitive Chat menu and a fully instructed agent, even with an empty database.
import type { KnowledgeEntry } from "./wlc-knowledge-base";
import { WLC_CORE_KNOWLEDGE } from "./wlc-knowledge-base";
import { FULLSTACK_KNOWLEDGE } from "./fullstack-knowledge";
import { DESIGN_SYSTEMS_KNOWLEDGE } from "./design-systems-knowledge";
import { GAME_STUDIO_KNOWLEDGE } from "./game-studio-knowledge";

export const OFFICIAL_CATALOG_VERSION = "1.0.0";

export type OfficialMotor = {
  slug: string;
  name: string;
  description: string;
  rules: string[];
  concepts: KnowledgeEntry[];
};

const inSet = (list: KnowledgeEntry[]) => new Set(list.map((k) => k.id));
const fs = inSet(FULLSTACK_KNOWLEDGE), ds = inSet(DESIGN_SYSTEMS_KNOWLEDGE), gs = inSet(GAME_STUDIO_KNOWLEDGE);
const coreOnly = WLC_CORE_KNOWLEDGE.filter((k) => !fs.has(k.id) && !ds.has(k.id) && !gs.has(k.id));

export const OFFICIAL_MOTORS: OfficialMotor[] = [
  {
    slug: "wlc-core", name: "WLC.IA Core & Inteligência Autônoma",
    description: "Identidade, postura e raciocínio da WLC.IA: respostas diretas, honestas e verificadas.",
    rules: [
      "Responder de forma direta, profissional e concisa; sem prolixidade.",
      "Nunca afirmar sucesso sem evidência verificada (commit, teste, log).",
      "Perguntas conceituais se respondem sem chamar ferramentas.",
      "Conhecimento é versionado: corrigir cria nova versão, nunca apaga.",
    ],
    concepts: coreOnly,
  },
  {
    slug: "engenharia-fullstack", name: "Engenharia Fullstack & Arquitetura Web",
    description: "Arquitetura, APIs, banco de dados, segurança e boas práticas de engenharia.",
    rules: [
      "Separar lógica de servidor do cliente; segredos nunca chegam ao navegador.",
      "Toda tabela de usuário é protegida por RLS com user_id = auth.uid().",
      "Mudanças pequenas, testadas e com commit descritivo.",
    ],
    concepts: FULLSTACK_KNOWLEDGE,
  },
  {
    slug: "design-systems", name: "Design Systems & UI/UX Profissional",
    description: "Tokens, tipografia, cor, acessibilidade e interfaces consistentes.",
    rules: [
      "Cores e sombras sempre por tokens semânticos, nunca valores soltos.",
      "Contraste e acessibilidade (WCAG AA) são obrigatórios.",
      "Uma direção visual coerente por projeto.",
    ],
    concepts: DESIGN_SYSTEMS_KNOWLEDGE,
  },
  {
    slug: "game-studio-fisica", name: "Game Studio & Física/Matemática Determinística",
    description: "Loops de jogo, física determinística, matemática e simulação.",
    rules: [
      "Física em passo fixo (fixed timestep) para resultados determinísticos.",
      "Cálculos verificados por operação inversa ou substituição.",
      "Separar simulação de renderização.",
    ],
    concepts: GAME_STUDIO_KNOWLEDGE,
  },
];

export const OFFICIAL_SLUGS = new Set(OFFICIAL_MOTORS.map((m) => m.slug));
export const isOfficialMotor = (slug: string | null | undefined) => !!slug && OFFICIAL_SLUGS.has(slug);

/** Compact block injected into every dev-chat run (Chat, Planejar, Criar), independent of the database. */
export function officialCatalogPrompt(query = ""): string {
  const q = query.toLowerCase();
  const rules = OFFICIAL_MOTORS.map((m) => `### ${m.name}\n${m.rules.map((r) => `- ${r}`).join("\n")}`).join("\n");
  const hits = q.trim()
    ? OFFICIAL_MOTORS.flatMap((m) => m.concepts).filter((k) => k.keywords.some((w) => q.includes(w.toLowerCase()))).slice(0, 4)
    : [];
  const extra = hits.length ? `\nConceitos relevantes:\n${hits.map((k) => `- ${k.title}: ${k.content.slice(0, 400)}`).join("\n")}` : "";
  return `## MOTORES OFICIAIS WLC.IA (código-fonte v${OFFICIAL_CATALOG_VERSION})\n${rules}${extra}\n\n`;
}
