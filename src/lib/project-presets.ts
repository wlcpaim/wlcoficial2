// Project presets. Empty seeds nothing; the other four seed a real, multi-page
// static site (public pages + admin panel) when a new repository is created,
// and add matching guidance to the agent context. Changing a preset later
// only changes the guidance; chats, memory and repository history stay intact.
import type { SiteKind } from "./site-presets";

export type ProjectPresetId = "empty" | SiteKind;

export type ProjectPreset = {
  id: ProjectPresetId;
  label: string;
  summary: string;
  /** Pages the preset creates in a new repository (empty = none). */
  pages: string[];
  /** Guidance appended to the agent context. Empty preset adds nothing. */
  guidance: string[];
};

export const PROJECT_PRESETS: readonly ProjectPreset[] = [
  { id: "empty", label: "Empty", summary: "Repositório limpo. Você define tudo na conversa.", pages: [], guidance: [] },
  {
    id: "store", label: "Loja Virtual", summary: "Vitrine, produto, carrinho, checkout e admin de produtos e pedidos.",
    pages: ["Início", "Produto", "Carrinho", "Admin"],
    guidance: ["Projeto de loja virtual (vitrine, produto, carrinho, checkout e painel admin).", "Preserve o padrão de páginas e o painel admin existentes; dados ficam em js/config.js e js/store.js.", "Ao adicionar pagamentos ou pedidos reais, faça isso no servidor e nunca exponha chaves no site."],
  },
  {
    id: "blog", label: "Blog", summary: "Artigos, categorias, comentários moderados, newsletter e admin.",
    pages: ["Início", "Artigo", "Admin"],
    guidance: ["Projeto de blog (artigos, categorias, comentários moderados, newsletter e painel admin).", "Priorize legibilidade, tipografia e SEO de cada artigo."],
  },
  {
    id: "forum", label: "Fórum", summary: "Tópicos, respostas, fixar/fechar, moderação e admin.",
    pages: ["Discussões", "Tópico", "Admin"],
    guidance: ["Projeto de fórum (categorias, tópicos fixados/fechados, respostas e moderação no painel admin).", "Mantenha as regras de moderação e a contagem de respostas consistentes."],
  },
  {
    id: "news", label: "Notícia", summary: "Portal com editorias, manchete, matérias, comentários e admin.",
    pages: ["Capa", "Matéria", "Admin"],
    guidance: ["Projeto de portal de notícias (editorias, manchete, matérias, comentários moderados e painel admin).", "Mantenha datas, autoria e editorias em todas as matérias."],
  },
] as const;

export const DEFAULT_PRESET: ProjectPresetId = "empty";

export function getPreset(id: string | null | undefined): ProjectPreset {
  return PROJECT_PRESETS.find((p) => p.id === id) ?? PROJECT_PRESETS[0]!;
}

/** Site kind to seed into a new repository, or null for Empty. */
export function presetSiteKind(id: string | null | undefined): SiteKind | null {
  const p = getPreset(id);
  return p.id === "empty" ? null : p.id;
}

/** Context lines for the agent prompt. Returns [] for the Empty preset. */
export function presetContextLines(id: string | null | undefined): string[] {
  const p = getPreset(id);
  if (!p.guidance.length) return [];
  return [`\n## Preset do projeto: ${p.label}`, ...p.guidance.map((g) => `- ${g}`)];
}
