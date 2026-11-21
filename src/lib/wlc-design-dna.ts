/**
 * WLC.IA Design DNA Generator v1.0
 * Generates a coherent visual identity (Design DNA) per project context.
 * Produces reusable tokens and guidelines. Does not invent external assets or fonts
 * that are not commonly available (Google Fonts / system stacks).
 */

import { wlcLogger } from "./wlc-logger";

export const WLC_DESIGN_DNA_VERSION = "1.0.0";

export type VisualPersonality =
  | "minimalista"
  | "futurista"
  | "editorial"
  | "enterprise"
  | "criativo"
  | "tecnico"
  | "organico"
  | "luxo"
  | "startup"
  | "custom";

export type ColorRole =
  | "primary"
  | "secondary"
  | "accent"
  | "background"
  | "surface"
  | "text"
  | "muted"
  | "success"
  | "warning"
  | "danger"
  | "border";

export type DesignDNA = {
  version: string;
  conceptName: string;
  personality: VisualPersonality;
  rationale: string;
  palette: Record<ColorRole, string>;
  darkPalette?: Partial<Record<ColorRole, string>>;
  typography: {
    sans: string;
    display?: string;
    mono: string;
    scale: { xs: string; sm: string; base: string; lg: string; xl: string; "2xl": string; "3xl": string };
    weights: { regular: number; medium: number; semibold: number; bold: number };
  };
  spacing: number[]; // base scale in px
  radius: { sm: string; md: string; lg: string; xl: string; full: string };
  shadows: { sm: string; md: string; lg: string };
  motion: {
    durationFast: string;
    durationNormal: string;
    durationSlow: string;
    easing: string;
  };
  grid: {
    columns: number;
    gutter: string;
    maxWidth: string;
  };
  iconFamily: "lucide" | "phosphor" | "heroicons" | "tabler" | "remix";
  guidelines: string[];
  accessibilityNotes: string[];
  cssVariables: string;
};

export type DesignDNAInput = {
  projectName?: string;
  objective?: string;
  audience?: string;
  segment?: string;
  productType?: string;
  desiredIdentity?: string;
  complexity?: "low" | "medium" | "high";
  preferDark?: boolean;
  constraints?: string[];
};

const normalize = (s: string) =>
  (s ?? "")
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** Curated font stacks (Google Fonts / system) — only commonly available. */
const FONT_STACKS = {
  inter: '"Inter", system-ui, -apple-system, sans-serif',
  geist: '"Geist", "Inter", system-ui, sans-serif',
  manrope: '"Manrope", "Inter", system-ui, sans-serif',
  dmSans: '"DM Sans", "Inter", system-ui, sans-serif',
  spaceGrotesk: '"Space Grotesk", "Inter", system-ui, sans-serif',
  sora: '"Sora", "Inter", system-ui, sans-serif',
  outfit: '"Outfit", "Inter", system-ui, sans-serif',
  plusJakarta: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif',
  ibmPlex: '"IBM Plex Sans", "Inter", system-ui, sans-serif',
  playfair: '"Playfair Display", Georgia, serif',
  jetbrains: '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
  systemSans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};

function pickPersonality(input: DesignDNAInput): VisualPersonality {
  const blob = normalize(
    [input.desiredIdentity, input.segment, input.productType, input.objective, input.audience].filter(Boolean).join(" "),
  );
  if (/minimal|limpo|clean|simples|essencial/.test(blob)) return "minimalista";
  if (/futur|cyber|neon|sci-?fi|tech dark|espacial/.test(blob)) return "futurista";
  if (/editorial|revista|jornal|tipograf|leitura|conteudo/.test(blob)) return "editorial";
  if (/enterprise|corporat|b2b|saas enterprise|dashboard admin|erp/.test(blob)) return "enterprise";
  if (/criativ|artist|agencia|portfolio|estudio|design studio/.test(blob)) return "criativo";
  if (/tecnico|devtool|developer|docs|api|cli|infra/.test(blob)) return "tecnico";
  if (/organico|natura|sustent|verde|wellness|saude/.test(blob)) return "organico";
  if (/luxo|premium|high.?end|joia|moda|fintech premium/.test(blob)) return "luxo";
  if (/startup|mvp|lancamento|growth|saas/.test(blob)) return "startup";
  return "custom";
}

function paletteFor(personality: VisualPersonality): { light: Record<ColorRole, string>; dark?: Partial<Record<ColorRole, string>> } {
  switch (personality) {
    case "minimalista":
      return {
        light: {
          primary: "#18181b",
          secondary: "#52525b",
          accent: "#3b82f6",
          background: "#fafafa",
          surface: "#ffffff",
          text: "#09090b",
          muted: "#71717a",
          success: "#16a34a",
          warning: "#ca8a04",
          danger: "#dc2626",
          border: "#e4e4e7",
        },
        dark: {
          primary: "#fafafa",
          secondary: "#a1a1aa",
          accent: "#60a5fa",
          background: "#09090b",
          surface: "#18181b",
          text: "#fafafa",
          muted: "#a1a1aa",
          border: "#27272a",
        },
      };
    case "futurista":
      return {
        light: {
          primary: "#7c3aed",
          secondary: "#06b6d4",
          accent: "#22d3ee",
          background: "#0f172a",
          surface: "#1e293b",
          text: "#f1f5f9",
          muted: "#94a3b8",
          success: "#34d399",
          warning: "#fbbf24",
          danger: "#f87171",
          border: "#334155",
        },
      };
    case "editorial":
      return {
        light: {
          primary: "#1c1917",
          secondary: "#78716c",
          accent: "#b45309",
          background: "#faf7f2",
          surface: "#ffffff",
          text: "#1c1917",
          muted: "#78716c",
          success: "#15803d",
          warning: "#a16207",
          danger: "#b91c1c",
          border: "#e7e5e4",
        },
      };
    case "enterprise":
      return {
        light: {
          primary: "#1d4ed8",
          secondary: "#475569",
          accent: "#0ea5e9",
          background: "#f8fafc",
          surface: "#ffffff",
          text: "#0f172a",
          muted: "#64748b",
          success: "#059669",
          warning: "#d97706",
          danger: "#dc2626",
          border: "#e2e8f0",
        },
        dark: {
          primary: "#3b82f6",
          background: "#0f172a",
          surface: "#1e293b",
          text: "#f8fafc",
          muted: "#94a3b8",
          border: "#334155",
        },
      };
    case "criativo":
      return {
        light: {
          primary: "#db2777",
          secondary: "#7c3aed",
          accent: "#f59e0b",
          background: "#fffbeb",
          surface: "#ffffff",
          text: "#1c1917",
          muted: "#78716c",
          success: "#16a34a",
          warning: "#ea580c",
          danger: "#e11d48",
          border: "#fde68a",
        },
      };
    case "tecnico":
      return {
        light: {
          primary: "#0f766e",
          secondary: "#334155",
          accent: "#14b8a6",
          background: "#f8fafc",
          surface: "#ffffff",
          text: "#0f172a",
          muted: "#64748b",
          success: "#059669",
          warning: "#d97706",
          danger: "#dc2626",
          border: "#e2e8f0",
        },
        dark: {
          primary: "#2dd4bf",
          background: "#020617",
          surface: "#0f172a",
          text: "#e2e8f0",
          muted: "#94a3b8",
          border: "#1e293b",
        },
      };
    case "organico":
      return {
        light: {
          primary: "#166534",
          secondary: "#3f6212",
          accent: "#65a30d",
          background: "#f7fee7",
          surface: "#ffffff",
          text: "#14532d",
          muted: "#4d7c0f",
          success: "#15803d",
          warning: "#ca8a04",
          danger: "#b91c1c",
          border: "#d9f99d",
        },
      };
    case "luxo":
      return {
        light: {
          primary: "#1c1917",
          secondary: "#a8a29e",
          accent: "#a16207",
          background: "#fafaf9",
          surface: "#ffffff",
          text: "#0c0a09",
          muted: "#78716c",
          success: "#166534",
          warning: "#a16207",
          danger: "#991b1b",
          border: "#e7e5e4",
        },
      };
    case "startup":
      return {
        light: {
          primary: "#4f46e5",
          secondary: "#6366f1",
          accent: "#f97316",
          background: "#fafafe",
          surface: "#ffffff",
          text: "#1e1b4b",
          muted: "#64748b",
          success: "#16a34a",
          warning: "#ea580c",
          danger: "#dc2626",
          border: "#e0e7ff",
        },
      };
    default:
      return {
        light: {
          primary: "#2563eb",
          secondary: "#64748b",
          accent: "#8b5cf6",
          background: "#ffffff",
          surface: "#f8fafc",
          text: "#0f172a",
          muted: "#64748b",
          success: "#16a34a",
          warning: "#ca8a04",
          danger: "#dc2626",
          border: "#e2e8f0",
        },
      };
  }
}

function typographyFor(personality: VisualPersonality) {
  const scale = {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
  };
  const weights = { regular: 400, medium: 500, semibold: 600, bold: 700 };
  switch (personality) {
    case "editorial":
      return { sans: FONT_STACKS.ibmPlex, display: FONT_STACKS.playfair, mono: FONT_STACKS.jetbrains, scale, weights };
    case "futurista":
      return { sans: FONT_STACKS.spaceGrotesk, display: FONT_STACKS.spaceGrotesk, mono: FONT_STACKS.jetbrains, scale, weights };
    case "tecnico":
      return { sans: FONT_STACKS.ibmPlex, mono: FONT_STACKS.jetbrains, scale, weights };
    case "criativo":
      return { sans: FONT_STACKS.outfit, display: FONT_STACKS.sora, mono: FONT_STACKS.jetbrains, scale, weights };
    case "luxo":
      return { sans: FONT_STACKS.manrope, display: FONT_STACKS.playfair, mono: FONT_STACKS.jetbrains, scale, weights };
    case "startup":
      return { sans: FONT_STACKS.plusJakarta, mono: FONT_STACKS.jetbrains, scale, weights };
    case "organico":
      return { sans: FONT_STACKS.dmSans, mono: FONT_STACKS.jetbrains, scale, weights };
    case "enterprise":
      return { sans: FONT_STACKS.inter, mono: FONT_STACKS.jetbrains, scale, weights };
    case "minimalista":
    default:
      return { sans: FONT_STACKS.inter, mono: FONT_STACKS.jetbrains, scale, weights };
  }
}

function iconFor(personality: VisualPersonality): DesignDNA["iconFamily"] {
  switch (personality) {
    case "futurista":
    case "tecnico":
      return "lucide";
    case "criativo":
      return "phosphor";
    case "enterprise":
      return "heroicons";
    case "minimalista":
      return "lucide";
    default:
      return "lucide";
  }
}

function buildCssVariables(palette: Record<ColorRole, string>, dark?: Partial<Record<ColorRole, string>>, radius?: DesignDNA["radius"], spacing?: number[]): string {
  const lines = [":root {"];
  for (const [role, value] of Object.entries(palette)) {
    lines.push(`  --color-${role}: ${value};`);
  }
  if (radius) {
    lines.push(`  --radius-sm: ${radius.sm};`, `  --radius-md: ${radius.md};`, `  --radius-lg: ${radius.lg};`, `  --radius-xl: ${radius.xl};`);
  }
  if (spacing) {
    spacing.forEach((px, i) => lines.push(`  --space-${i + 1}: ${px}px;`));
  }
  lines.push("}");
  if (dark && Object.keys(dark).length) {
    lines.push("", "@media (prefers-color-scheme: dark) {", "  :root {");
    for (const [role, value] of Object.entries(dark)) {
      if (value) lines.push(`    --color-${role}: ${value};`);
    }
    lines.push("  }", "}");
  }
  return lines.join("\n");
}

/**
 * Generate a Design DNA from project context.
 * Deterministic given the same input (no randomness).
 */
export function generateDesignDNA(input: DesignDNAInput = {}): DesignDNA {
  const personality = pickPersonality(input);
  const { light, dark } = paletteFor(personality);
  const typography = typographyFor(personality);
  const iconFamily = iconFor(personality);
  const spacing = [4, 8, 12, 16, 24, 32, 40, 48, 64];
  const radius = {
    sm: "0.25rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
    full: "9999px",
  };
  const shadows = {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  };
  const motion = {
    durationFast: "150ms",
    durationNormal: "250ms",
    durationSlow: "400ms",
    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
  };
  const grid = {
    columns: 12,
    gutter: "1.5rem",
    maxWidth: personality === "editorial" ? "72rem" : "80rem",
  };

  const conceptName =
    input.projectName
      ? `${input.projectName} — ${personality}`
      : `WLC Design DNA (${personality})`;

  const rationale = [
    `Personalidade visual selecionada: ${personality}.`,
    input.segment ? `Segmento: ${input.segment}.` : null,
    input.audience ? `Público: ${input.audience}.` : null,
    input.productType ? `Tipo de produto: ${input.productType}.` : null,
    "Paleta e tipografia escolhidas para coerência, contraste e legibilidade; tokens semânticos evitam hardcode de cores.",
  ]
    .filter(Boolean)
    .join(" ");

  const guidelines = [
    "Use apenas tokens semânticos (primary, surface, muted…) — não cores brutas nos componentes.",
    "Uma família de ícones por produto (não misture Lucide + Font Awesome sem justificativa).",
    "Escala de espaçamento fixa; prefira gap a margins avulsas.",
    "Hierarquia tipográfica limitada (ideal: 3 tamanhos dominantes por view).",
    "Estados de interação (hover, focus-visible, disabled, loading) em todos os controles.",
    "Mobile-first; teste ~375px e ~1280px.",
    "Contraste AA mínimo para texto e ícones informativos.",
  ];

  const accessibilityNotes = [
    "Foco visível em todos os elementos interativos (focus-visible).",
    "Labels associados a todos os campos de formulário.",
    "Não transmitir informação apenas por cor.",
    "Área de toque mínima ~44×44px em mobile.",
    "Respeitar prefers-reduced-motion para animações não essenciais.",
  ];

  const dna: DesignDNA = {
    version: WLC_DESIGN_DNA_VERSION,
    conceptName,
    personality,
    rationale,
    palette: light,
    darkPalette: dark,
    typography,
    spacing,
    radius,
    shadows,
    motion,
    grid,
    iconFamily,
    guidelines,
    accessibilityNotes,
    cssVariables: buildCssVariables(light, dark, radius, spacing),
  };

  wlcLogger.info("design-dna", "generated", {
    personality,
    conceptName: dna.conceptName,
    iconFamily,
  });

  return dna;
}

export function formatDesignDNAContext(dna: DesignDNA): string {
  return [
    `## WLC.IA Design DNA v${dna.version}`,
    `Conceito: ${dna.conceptName}`,
    `Personalidade: ${dna.personality}`,
    dna.rationale,
    "### Paleta (light)",
    Object.entries(dna.palette)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join("\n"),
    dna.darkPalette
      ? `### Paleta (dark overrides)\n${Object.entries(dna.darkPalette)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join("\n")}`
      : "",
    "### Tipografia",
    `- Sans: ${dna.typography.sans}`,
    dna.typography.display ? `- Display: ${dna.typography.display}` : "",
    `- Mono: ${dna.typography.mono}`,
    `### Ícones: ${dna.iconFamily}`,
    "### Diretrizes",
    ...dna.guidelines.map((g) => `- ${g}`),
    "### Acessibilidade",
    ...dna.accessibilityNotes.map((g) => `- ${g}`),
    "### Tokens CSS (referência)",
    "```css",
    dna.cssVariables,
    "```",
    "Aplique este DNA de forma consistente. Não misture outra identidade visual sem decisão explícita.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Suggest multiple visual concepts for comparison (Creative Engineering support). */
export function proposeVisualConcepts(input: DesignDNAInput): { name: string; personality: VisualPersonality; summary: string }[] {
  const base = pickPersonality(input);
  const candidates: VisualPersonality[] = Array.from(
    new Set<VisualPersonality>([base, "minimalista", "futurista", "editorial", "enterprise", "startup"]),
  ).slice(0, 5);
  return candidates.map((p) => {
    const dna = generateDesignDNA({ ...input, desiredIdentity: p });
    return {
      name: dna.conceptName,
      personality: p,
      summary: `Paleta primary ${dna.palette.primary}, tipografia ${(dna.typography.sans.split(",")[0] ?? "").replace(/"/g, "")}, ícones ${dna.iconFamily}.`,
    };
  });
}
