/**
 * WLC.IA — Design Systems & CSS Frameworks Professional Knowledge
 * Tailwind CSS, Bootstrap, Bulma, Pico CSS + princípios de harmonia visual.
 * Objetivo: sites modernos, coerentes e profissionais em qualquer stack CSS.
 */
import type { KnowledgeEntry } from "./wlc-knowledge-base";

export const DESIGN_SYSTEMS_KNOWLEDGE_VERSION = "1.0.0";

export const DESIGN_SYSTEMS_KNOWLEDGE: KnowledgeEntry[] = [
  // ─── Design professionalism ───────────────────────────────────────
  {
    id: "ds-core-01",
    domain: "Design Profissional",
    title: "Harmonia visual e hierarquia em interfaces web",
    keywords: [
      "design", "harmonia", "hierarquia", "visual", "profissional", "layout",
      "espaçamento", "tipografia", "contraste", "ritmo", "whitespace",
    ],
    content:
      "Sites profissionais seguem ritmo, não “achismo”: (1) escala tipográfica coerente (ex. 1.25 major third ou 1.333 perfect fourth); (2) espaçamento em grade (4/8px) — margens e gaps consistentes; (3) hierarquia clara (um H1, seções com H2, corpo legível 16–18px); (4) contraste WCAG AA no mínimo para texto; (5) alinhamento a uma coluna/grid estável; (6) poucos pesos de fonte (2–3); (7) cor: primária + neutros + uma acentuação, saturação controlada. Whitespace é recurso, não desperdício. Evite centralizar tudo, bordas e sombras competindo, e rainbow de cores. Cada tela precisa de foco visual único (CTA principal). Loading, empty e error states fazem parte do design, não são afterthought.",
  },
  {
    id: "ds-core-02",
    domain: "Design Profissional",
    title: "Sistemas de tokens, temas e consistência multi-página",
    keywords: [
      "design tokens", "tema", "css variables", "dark mode", "brand", "consistência",
      "design system", "componentes",
    ],
    content:
      "Defina tokens semânticos antes dos componentes: --color-bg, --color-surface, --color-text, --color-muted, --color-primary, --color-danger, --radius-sm/md/lg, --shadow-sm/md, --font-sans, --space-1…N. Prefira tokens semânticos a nomes de cor (“primary” não “blue-500”) para trocar tema sem reescrever UI. Dark mode: inverta superfícies e texto, preserve contraste de status (sucesso/erro). Reutilize os mesmos botões, inputs, cards e headers em todas as páginas. Documente variantes (size, intent, outline). Nunca invente um estilo novo por página se o sistema já cobre o caso.",
  },
  {
    id: "ds-core-03",
    domain: "Design Profissional",
    title: "Layout moderno, responsivo e microinterações",
    keywords: [
      "responsivo", "mobile first", "grid", "flexbox", "hero", "card", "nav",
      "animação", "microinteração", "moderno", "landing",
    ],
    content:
      "Mobile-first: empilhe, depois expanda em md/lg. Use CSS Grid para páginas e áreas; Flexbox para alinhamento de componentes. Landings modernas: hero com headline forte + subcopy + CTA, prova social, seções em ritmo vertical constante, footer completo. Cards com padding generoso, imagem/ratio estável e ações claras. Nav: logo, links, CTA; em mobile, padrão acessível (button + panel). Microinterações sutis (150–250ms, ease-out): hover de botão, focus ring visível, transition de elevação — nunca atrase a interação principal. Evite carrosséis autoplay agressivos e parallax que quebra acessibilidade.",
  },
  {
    id: "ds-core-04",
    domain: "Design Profissional",
    title: "Escolha de framework CSS conforme o produto",
    keywords: [
      "escolher framework", "tailwind vs bootstrap", "bulma", "pico css",
      "utility-first", "quando usar",
    ],
    content:
      "Tailwind: máximo controle e design systems sob medida; ideal para produtos únicos e React/Vue. Bootstrap: velocidade com componentes prontos e padrões admin/dashboard familiares; bom para CRUDs e times que seguem o look Bootstrap. Bulma: componentes modernos só com classes, sem JS obrigatório; ótimo para sites de conteúdo e protótipos elegantes. Pico.css: mínimo, semântica HTML pura, quase zero classes; perfeito para docs, MVPs enxutos e páginas de conteúdo legível. Regra WLC.IA: não misture dois frameworks utilitários no mesmo app; se o projeto já usa um, estenda-o com tokens — não empilhe Bootstrap+Tailwind sem estratégia. Sempre priorize harmonia e acessibilidade sobre “usar a lib da moda”.",
  },

  // ─── Tailwind CSS ─────────────────────────────────────────────────
  {
    id: "ds-tw-01",
    domain: "Tailwind CSS",
    title: "Fundamentos Tailwind: utility-first e configuração",
    keywords: [
      "tailwind", "tailwindcss", "utility", "tailwind config", "content paths",
      "jit", "v3", "v4", "@tailwind", "@import tailwindcss",
    ],
    content:
      "Tailwind é utility-first: estilos compostos por classes pequenas (flex, gap-4, text-sm, bg-zinc-950). Configure content/paths para o JIT gerar só o CSS usado. Tailwind v3: tailwind.config.js + @tailwind base/components/utilities. Tailwind v4: frequentemente @import \"tailwindcss\" e tema via CSS (@theme). Evite @apply em massa (perde o benefício das utilities); use @apply só para padrões repetidos raros ou componentes de design system. Prefira gap-* a space-x em flex/grid modernos. Use container com mx-auto e padding horizontal consistente. Arbitrary values (w-[137px]) são escape hatch — não o padrão.",
  },
  {
    id: "ds-tw-02",
    domain: "Tailwind CSS",
    title: "Layout, tipografia e cores profissionais com Tailwind",
    keywords: [
      "tailwind grid", "flex", "prose", "font", "zinc", "slate", "primary",
      "spacing", "max-w", "typography plugin",
    ],
    content:
      "Layout: min-h-screen, flex flex-col; áreas com grid grid-cols-1 md:grid-cols-12 e col-span-*. Largura de leitura: max-w-prose ou max-w-3xl para texto; max-w-6xl/7xl para shells. Tipografia: text-4xl/5xl font-semibold tracking-tight para títulos; text-base/lg text-muted para corpo; leading-relaxed em parágrafos longos. Cores: paleta neutra (zinc/slate/neutral) + uma primary; evite misturar slate e zinc no mesmo produto. dark: com class strategy ou media. Sombras: shadow-sm/md sutis; ring para focus. Bordas: border border-zinc-200 dark:border-zinc-800. Plugin typography (@tailwindcss/typography) + prose para artigos.",
  },
  {
    id: "ds-tw-03",
    domain: "Tailwind CSS",
    title: "Componentes e padrões UI em Tailwind (shadcn-style)",
    keywords: [
      "shadcn", "button", "card", "input", "modal", "dialog", "tailwind component",
      "cva", "variants",
    ],
    content:
      "Padrão profissional: componentes React/Vue com variants (CVA ou clsx + maps) — button: default, secondary, outline, ghost, destructive; sizes sm/md/lg. Card: rounded-xl border bg-card p-6 shadow-sm. Input: h-10 w-full rounded-md border bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2. Dialog/Sheet com focus trap e ESC. Badge, Alert, Tabs, Dropdown com os mesmos tokens. cn()/clsx para merge de classes. Acessibilidade: focus-visible, aria-*, labels associados. Não dependa só de hover para informação crítica.",
  },
  {
    id: "ds-tw-04",
    domain: "Tailwind CSS",
    title: "Tailwind responsivo, estados e performance",
    keywords: [
      "sm:", "md:", "lg:", "hover:", "focus-visible:", "group", "peer",
      "purge", "bundle css",
    ],
    content:
      "Breakpoints mobile-first: sem prefixo = base; sm/md/lg/xl sobrescrevem. Agrupe estados: hover:bg-*, focus-visible:ring-2, disabled:opacity-50 disabled:pointer-events-none. group/group-hover e peer/peer-checked para padrões compostos. Evite !important e estilos inline conflitantes. Performance: content correto no config evita CSS inchado; não construa strings de classe dinâmicas opacas que o scanner não detecta (use maps completos). Prefira animações CSS (transition-colors, duration-200) a JS pesado.",
  },

  // ─── Bootstrap ────────────────────────────────────────────────────
  {
    id: "ds-bs-01",
    domain: "Bootstrap",
    title: "Fundamentos Bootstrap 5: grid e utilitários",
    keywords: [
      "bootstrap", "bootstrap 5", "container", "row", "col", "gutter",
      "breakpoint", "utilities",
    ],
    content:
      "Bootstrap 5 (sem jQuery): container / container-fluid, row, col-*, g-* para gutters. Breakpoints: col-sm/md/lg/xl/xxl. Utility API: d-flex, justify-content-*, align-items-*, gap-*, m-*, p-*, text-*, bg-*, border, rounded-*, shadow-*. Reboot normaliza base. Use gutters em vez de gambiarra com margin negativa manual. Ordens e offsets (order-*, offset-*) com moderação. Não misture grid Bootstrap com grid CSS cru na mesma região sem necessidade.",
  },
  {
    id: "ds-bs-02",
    domain: "Bootstrap",
    title: "Componentes Bootstrap profissionais e customização",
    keywords: [
      "navbar", "card", "modal", "form-control", "btn", "bootstrap theme",
      "sass variables", "data-bs",
    ],
    content:
      "Componentes centrais: navbar responsiva, card, btn (btn-primary/outline-*), forms (form-control, form-label, form-text, is-invalid), modal, offcanvas, toast, alert, badge, pagination, table table-hover. JS via data-bs-* ou instâncias bootstrap.Modal. Customização profissional: sobrescreva variáveis Sass ($primary, $border-radius, $font-family-sans-serif) antes de importar Bootstrap; ou layer de CSS variables no :root. Evite o look “tema padrão azul” em produtos de marca — recorra a primary da marca e neutros. Acessibilidade: labels, aria em modais, não remova focus outlines sem substituto.",
  },
  {
    id: "ds-bs-03",
    domain: "Bootstrap",
    title: "Bootstrap para dashboards e admin",
    keywords: [
      "dashboard", "admin", "sidebar", "bootstrap admin", "tabela", "crud ui",
    ],
    content:
      "Padrão admin: shell com sidebar + topbar + content; tabelas responsivas (table-responsive); filtros em row de forms; empty states em cards; botões de ação em btn-group. Use spacing utilitário consistente (p-3, mb-4). Gráficos em cards com título e actions alinhados. Evite excesso de btn-primary na mesma view — um primary por zona de decisão. Dark mode: data-bs-theme=\"dark\" no html quando aplicável.",
  },

  // ─── Bulma ────────────────────────────────────────────────────────
  {
    id: "ds-bu-01",
    domain: "Bulma",
    title: "Fundamentos Bulma: colunas e helpers",
    keywords: [
      "bulma", "columns", "column", "section", "container", "is-size",
      "has-text", "is-flex",
    ],
    content:
      "Bulma é CSS-only (sem JS obrigatório). Layout: section > container; columns / column com is-half, is-one-third, is-4, etc.; is-multiline, is-centered, is-vcentered. Helpers: has-text-centered, has-text-weight-semibold, is-size-1…7, m-*, p-*, is-flex, is-justify-content-*, is-align-items-*. Cores: is-primary, is-link, is-info, is-success, is-warning, is-danger + is-light. Prefira section + container para ritmo vertical profissional em vez de empilhar divs soltas.",
  },
  {
    id: "ds-bu-02",
    domain: "Bulma",
    title: "Componentes Bulma e customização Sass",
    keywords: [
      "bulma button", "navbar", "card", "hero", "modal bulma", "sass bulma",
      "variables",
    ],
    content:
      "Componentes: button is-primary is-medium; notification; tag; hero is-medium is-primary; navbar; card (card-image, card-content, card-footer); modal (precisa de JS leve para toggle is-active); form controls (input, label, help is-danger); table; menu; tabs; paginação; dropdown. Customize via variáveis Sass ($primary, $family-sans-serif, $radius) antes dos imports. Visual moderno: hero com título forte, features em columns is-multiline, CTAs button is-medium, footer com colunas de links. Mantenha is-size e espaçamentos coerentes em todas as seções.",
  },

  // ─── Pico CSS ─────────────────────────────────────────────────────
  {
    id: "ds-pi-01",
    domain: "Pico CSS",
    title: "Pico.css: HTML semântico e estilo mínimo elegante",
    keywords: [
      "pico", "pico.css", "pico css", "semantic html", "classless", "minimal",
      "docs site",
    ],
    content:
      "Pico.css estiliza HTML semântico com quase zero classes: header, main, section, article, nav, form, button, table, dialog. Ideal para documentação, blogs, landings simples e MVPs legíveis. Use class=\"container\" (ou container-fluid) para largura; role=\"group\" e grid nativo quando precisar de colunas. Atributos data-theme=\"light|dark\" no root. Formulários bonitos “de fábrica” com label + input. Não lute contra o Pico adicionando dezenas de classes utilitárias — se precisar de UI densa tipo app, prefira Tailwind ou Bootstrap. Profissionalismo no Pico = tipografia clara, hierarquia de headings, seções bem espaçadas e CTAs com button primary nativo.",
  },
  {
    id: "ds-pi-02",
    domain: "Pico CSS",
    title: "Padrões de página com Pico e acessibilidade",
    keywords: [
      "pico layout", "pico dark", "pico form", "pico nav", "acessibilidade pico",
    ],
    content:
      "Estrutura típica: header com nav + brand; main com article/section; footer. Use <dialog> para modais nativos. Tabelas simples e legíveis. Dark mode via data-theme. Mantenha contraste e foque em conteúdo: títulos descritivos, parágrafos curtos, listas. Evite div soup. Quando crescer a complexidade visual, introduza um único layer de custom properties em vez de misturar outro framework completo.",
  },

  // ─── Cross-cutting modern practice ────────────────────────────────
  {
    id: "ds-mod-01",
    domain: "Design Profissional",
    title: "Checklist de entrega visual profissional (WLC.IA)",
    keywords: [
      "checklist design", "qa visual", "polish", "entrega", "ui review",
      "harmonioso", "versátil",
    ],
    content:
      "Antes de considerar UI pronta: (1) um primary CTA por view principal; (2) espaçamento em escala única; (3) tipografia com no máximo 3 tamanhos dominantes na página; (4) contraste AA; (5) focus visível; (6) estados loading/empty/error; (7) imagens com dimensions/ratio estáveis; (8) formulários com labels e erros por campo; (9) responsivo testado em largura ~375 e ~1280; (10) nenhum framework CSS duplicado; (11) tokens/tema alinhados à marca; (12) microinterações discretas. A WLC.IA, ao gerar sites, aplica este checklist por padrão e escolhe Tailwind, Bootstrap, Bulma ou Pico conforme o contexto do projeto — sempre priorizando harmonia, legibilidade e modernidade.",
  },
  {
    id: "ds-mod-02",
    domain: "Design Profissional",
    title: "Composição de landing e site institucional moderno",
    keywords: [
      "landing page", "site institucional", "hero", "pricing", "footer",
      "social proof", "cta",
    ],
    content:
      "Estrutura moderna eficaz: Hero (headline + subcopy + CTA + visual) → Logos/prova social → Benefícios em grid 3 colunas → Como funciona → Depoimentos → Pricing (se houver) → FAQ → CTA final → Footer (mapa de links, legal, contato). Mantenha ritmo vertical (padding de seção igual). Preços: destaque o plano recomendado. FAQ com accordion acessível. Evite walls of text; prefira blocos escaneáveis. Identidade: foto/ilustração consistente, não stock genérico em excesso. Performance: otimize LCP do hero (imagem dimensionada, font-display).",
  },
  {
    id: "ds-mod-03",
    domain: "Design Profissional",
    title: "Formulários, tabelas e dados com visual profissional",
    keywords: [
      "formulário", "tabela", "data table", "ux formulário", "validação visual",
    ],
    content:
      "Formulários: label visível, placeholder só como dica (não substitui label), agrupamento lógico, primary button no fim, secondary para cancelar. Erros inline junto ao campo. Tabelas: cabeçalho claro, alinhamento numérico à direita, ações à direita, empty state, paginação ou virtualização se longa. Prefira densidade confortável a “tudo na tela”. Filtros acima da tabela, não escondidos. Em mobile, cards empilhados podem substituir tabelas largas.",
  },
];

export function getDesignSystemsKnowledge(): KnowledgeEntry[] {
  return DESIGN_SYSTEMS_KNOWLEDGE;
}
