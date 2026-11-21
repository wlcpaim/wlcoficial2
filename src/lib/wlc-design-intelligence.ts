/**
 * WLC.IA Design Intelligence v1.0 — deterministic design-system standards.
 * This module supplies reusable criteria and auditable checks; it does not
 * claim to visually inspect a rendered page without screenshot/browser evidence.
 */
export const WLC_DESIGN_INTELLIGENCE_VERSION = "1.0.0";

export type DesignDimension =
  | "design-tokens" | "spacing" | "typography" | "visual-hierarchy"
  | "responsive-layout" | "accessibility" | "interaction-states" | "consistency";
export type DesignEvidenceStatus = "verified" | "partial" | "missing" | "not-applicable";
export type DesignEvidence = {
  dimension: DesignDimension;
  status: DesignEvidenceStatus;
  evidence: string;
  artifact?: string;
};
export type DesignAssessment = {
  score: number;
  verdict: "approved" | "needs-review" | "blocked";
  missing: DesignDimension[];
  partial: DesignDimension[];
  blockers: string[];
};

export const WLC_DESIGN_DIMENSIONS: readonly DesignDimension[] = [
  "design-tokens", "spacing", "typography", "visual-hierarchy",
  "responsive-layout", "accessibility", "interaction-states", "consistency",
] as const;

export const WLC_SPACING_SCALE_PX = [4, 8, 12, 16, 24, 32, 40, 48, 64] as const;
export const WLC_DESIGN_BREAKPOINTS_PX = [320, 375, 768, 1024, 1440] as const;

const WEIGHTS: Record<DesignDimension, number> = {
  "design-tokens": 14, spacing: 12, typography: 10, "visual-hierarchy": 14,
  "responsive-layout": 14, accessibility: 16, "interaction-states": 10, consistency: 10,
};

/** Score only supplied evidence. Missing proof never counts as a pass. */
export function assessDesignQuality(evidence: DesignEvidence[]): DesignAssessment {
  const latest = new Map<DesignDimension, DesignEvidence>();
  for (const item of evidence) latest.set(item.dimension, item);
  let earned = 0;
  let possible = 0;
  const missing: DesignDimension[] = [];
  const partial: DesignDimension[] = [];
  const blockers: string[] = [];

  for (const dimension of WLC_DESIGN_DIMENSIONS) {
    const item = latest.get(dimension);
    if (item?.status === "not-applicable") continue;
    possible += WEIGHTS[dimension];
    if (!item || item.status === "missing") {
      missing.push(dimension);
      if (dimension === "accessibility" || dimension === "responsive-layout") blockers.push(`${dimension}: evidência obrigatória ausente`);
      continue;
    }
    if (item.status === "verified") {
      if (!item.evidence.trim()) {
        missing.push(dimension);
        if (dimension === "accessibility" || dimension === "responsive-layout") blockers.push(`${dimension}: verificação sem evidência`);
      } else earned += WEIGHTS[dimension];
    }
    if (item.status === "partial") {
      partial.push(dimension);
      earned += WEIGHTS[dimension] * 0.5;
    }
  }

  const score = possible === 0 ? 0 : Math.round((earned / possible) * 100);
  const verdict = blockers.length ? "blocked" : score >= 90 && missing.length === 0 && partial.length === 0 ? "approved" : "needs-review";
  return { score, verdict, missing, partial, blockers };
}

export function buildWlcDesignContext(): string {
  return [
    `## WLC.IA Design Intelligence v${WLC_DESIGN_INTELLIGENCE_VERSION}`,
    "Atue como product designer e frontend engineer. Primeiro entenda o usuário, a tarefa principal, o conteúdo e o contexto de uso; depois defina estrutura e estilo.",
    `Use a escala de espaçamento ${WLC_SPACING_SCALE_PX.join(", ")} px como base, ajustando apenas quando o sistema existente justificar. Prefira tokens semânticos e gap a valores avulsos.`,
    `Valide responsividade nos marcos ${WLC_DESIGN_BREAKPOINTS_PX.join(", ")} px, além de larguras intermediárias relevantes.`,
    "Priorize hierarquia clara, tipografia legível, largura de leitura adequada, alinhamentos consistentes, densidade coerente e uma ação primária por região.",
    "Use cores para significado e estado; não dependa somente de cor. Verifique contraste WCAG AA, foco visível, teclado, labels, semântica e alvos de toque.",
    "Implemente estados loading, empty, error, success, disabled e retry quando aplicáveis. Toda ação visual precisa corresponder a comportamento real.",
    "Evite decoração sem propósito, excesso de cards, sombras, gradientes, bordas e animações. Prefira clareza e consistência a tendências visuais.",
    "Não declare auditoria visual aprovada sem evidência de screenshot, navegador ou inspeção reproduzível. Registre achados, impacto e correção.",
    "Ao herdar um projeto, preserve a identidade e os padrões válidos existentes; evolua por melhorias incrementais e evite redesign não solicitado.",
  ].join("\n");
}
