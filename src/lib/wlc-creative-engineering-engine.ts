/**
 * WLC.IA Creative Engineering Engine v1.0
 * Generates multiple development strategies/concepts before implementation.
 * Creativity is knowledge- and context-based, not random. Avoids repetitive
 * templates and the same visual/architectural defaults on every project.
 */

import { generateDesignDNA, proposeVisualConcepts, type DesignDNAInput, type VisualPersonality } from "./wlc-design-dna";
import { wlcLogger } from "./wlc-logger";

export const WLC_CREATIVE_ENGINEERING_VERSION = "1.0.0";

export type ConceptAxis =
  | "originalidade"
  | "usabilidade"
  | "coerencia"
  | "viabilidade"
  | "performance"
  | "complexidade"
  | "adequacao_publico"
  | "qualidade_visual";

export type EngineeringConcept = {
  id: string;
  name: string;
  personality: VisualPersonality | "custom";
  summary: string;
  stackSuggestion: string[];
  architectureNotes: string;
  uxNotes: string;
  differentiators: string[];
  risks: string[];
  scores: Partial<Record<ConceptAxis, number>>; // 1-5
  overall: number;
};

export type CreativeBrief = {
  objective: string;
  audience?: string;
  segment?: string;
  productType?: string;
  complexity?: "low" | "medium" | "high";
  requirements?: string[];
  constraints?: string[];
  desiredIdentity?: string;
};

export type CreativePlan = {
  version: string;
  brief: CreativeBrief;
  concepts: EngineeringConcept[];
  selected: EngineeringConcept;
  selectionRationale: string;
  designDNASummary: string;
};

const normalize = (s: string) =>
  (s ?? "")
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

function detectProductSignals(brief: CreativeBrief) {
  const blob = normalize(
    [brief.objective, brief.productType, brief.segment, brief.audience, ...(brief.requirements ?? [])].join(" "),
  );
  return {
    isDashboard: /dashboard|admin|painel|backoffice|crm|erp/.test(blob),
    isLanding: /landing|lp|captura|venda|marketing page/.test(blob),
    isSaaS: /saas|assinatura|multi.?tenant|workspace/.test(blob),
    isDocs: /docs|documentacao|knowledge base|wiki/.test(blob),
    isGame: /jogo|game|street.?race|arcade/.test(blob),
    isEcommerce: /loja|ecommerce|carrinho|checkout|catalogo/.test(blob),
    isMobileFirst: /mobile|app mobile|pwa/.test(blob),
    isEnterprise: /enterprise|corporat|b2b|compliance/.test(blob),
    isCreativeAgency: /agencia|portfolio|estudio|criativo/.test(blob),
  };
}

function stackFor(personality: VisualPersonality, signals: ReturnType<typeof detectProductSignals>): string[] {
  const base = ["TypeScript", "Vite"];
  if (signals.isGame) return ["TypeScript", "Canvas/WebGL ou framework de jogos web", "Vite"];
  if (signals.isDocs) return ["Astro ou Next.js", "MDX", "TypeScript"];
  if (signals.isDashboard || signals.isEnterprise || signals.isSaaS) {
    return ["React", "TypeScript", "TanStack Router/Query", "Tailwind CSS", "Radix / shadcn-style"];
  }
  if (signals.isLanding) {
    if (personality === "editorial") return ["Astro ou HTML estático", "CSS moderno", "TypeScript opcional"];
    return ["React ou Astro", "Tailwind CSS", "TypeScript"];
  }
  if (personality === "futurista") return ["React", "TypeScript", "Tailwind", "Motion / CSS animations"];
  if (personality === "minimalista") return ["HTML semântico / Astro", "CSS (ou Pico/Tailwind enxuto)", "TypeScript mínimo"];
  return ["React", "TypeScript", "Tailwind CSS", "Vite"];
}

function scoreConcept(
  personality: VisualPersonality,
  signals: ReturnType<typeof detectProductSignals>,
  complexity: CreativeBrief["complexity"],
): Partial<Record<ConceptAxis, number>> {
  const c = complexity === "high" ? 3 : complexity === "low" ? 1 : 2;
  const scores: Partial<Record<ConceptAxis, number>> = {
    originalidade: 3,
    usabilidade: 4,
    coerencia: 4,
    viabilidade: 4,
    performance: 4,
    complexidade: 5 - c,
    adequacao_publico: 3,
    qualidade_visual: 3,
  };

  if (personality === "minimalista") {
    scores.performance = 5;
    scores.complexidade = 5;
    scores.qualidade_visual = signals.isCreativeAgency ? 2 : 4;
    scores.originalidade = 3;
  }
  if (personality === "futurista") {
    scores.originalidade = 5;
    scores.qualidade_visual = 5;
    scores.performance = 3;
    scores.complexidade = 2;
    scores.viabilidade = signals.isEnterprise ? 2 : 4;
  }
  if (personality === "enterprise") {
    scores.usabilidade = 5;
    scores.coerencia = 5;
    scores.viabilidade = 5;
    scores.originalidade = 2;
    scores.adequacao_publico = signals.isEnterprise || signals.isDashboard ? 5 : 3;
  }
  if (personality === "editorial") {
    scores.qualidade_visual = 5;
    scores.originalidade = 4;
    scores.performance = 4;
    scores.adequacao_publico = signals.isDocs || signals.isLanding ? 5 : 3;
  }
  if (personality === "startup") {
    scores.viabilidade = 5;
    scores.usabilidade = 4;
    scores.originalidade = 3;
    scores.complexidade = 4;
  }
  if (personality === "criativo") {
    scores.originalidade = 5;
    scores.qualidade_visual = 5;
    scores.viabilidade = 3;
    scores.complexidade = 2;
  }
  if (personality === "tecnico") {
    scores.performance = 5;
    scores.viabilidade = 5;
    scores.qualidade_visual = 3;
    scores.originalidade = 2;
  }

  // Audience fit boosts
  if (signals.isEnterprise && personality === "enterprise") scores.adequacao_publico = 5;
  if (signals.isCreativeAgency && (personality === "criativo" || personality === "editorial")) scores.adequacao_publico = 5;
  if (signals.isDashboard && (personality === "enterprise" || personality === "tecnico" || personality === "minimalista")) {
    scores.adequacao_publico = 5;
  }

  return scores;
}

function overallScore(scores: Partial<Record<ConceptAxis, number>>): number {
  const vals = Object.values(scores).filter((n): n is number => typeof n === "number");
  if (!vals.length) return 0;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

/**
 * Generate multiple engineering concepts and select the best fit.
 */
export function generateCreativePlan(brief: CreativeBrief): CreativePlan {
  const signals = detectProductSignals(brief);
  const dnaInput: DesignDNAInput = {
    objective: brief.objective,
    audience: brief.audience,
    segment: brief.segment,
    productType: brief.productType,
    desiredIdentity: brief.desiredIdentity,
    complexity: brief.complexity,
    constraints: brief.constraints,
  };

  const visualConcepts = proposeVisualConcepts(dnaInput);
  const concepts: EngineeringConcept[] = visualConcepts.map((vc, i) => {
    const scores = scoreConcept(vc.personality, signals, brief.complexity);
    const overall = overallScore(scores);
    const stack = stackFor(vc.personality, signals);
    return {
      id: `concept-${i + 1}-${vc.personality}`,
      name: vc.name,
      personality: vc.personality,
      summary: vc.summary,
      stackSuggestion: stack,
      architectureNotes:
        signals.isSaaS || signals.isDashboard
          ? "Arquitetura modular (features/components/services). Estado de servidor com cache. Auth e RBAC desde o início se houver multi-usuário."
          : signals.isLanding
            ? "Páginas enxutas, SEO e performance prioritários. Poucos JS client-side."
            : "Arquitetura proporcional: comece simples, modularize por necessidade real.",
      uxNotes:
        signals.isDashboard
          ? "Densidade de informação controlada, tabelas e filtros acessíveis, estados loading/empty/error."
          : "Hierarquia clara, um CTA principal por view, formulários com feedback imediato.",
      differentiators: [
        `Identidade ${vc.personality} coerente (não template genérico).`,
        "Tokens de design e escala de espaçamento únicos ao conceito.",
        stack.includes("Astro") ? "Conteúdo estático/híbrido para performance." : "Stack moderna alinhada ao caso de uso.",
      ],
      risks: [
        vc.personality === "futurista" || vc.personality === "criativo"
          ? "Risco de over-design e impacto em performance/acessibilidade se animações forem excessivas."
          : "Risco de parecer genérico se tokens e tipografia não forem aplicados com rigor.",
      ],
      scores,
      overall,
    };
  });

  concepts.sort((a, b) => b.overall - a.overall);
  const selected = concepts[0];
  if (!selected) throw new Error("No creative concept generated");

  const dna = generateDesignDNA({ ...dnaInput, desiredIdentity: selected.personality });
  const selectionRationale = [
    `Selecionado "${selected.name}" (score ${selected.overall}/5) por melhor equilíbrio entre`,
    "adequação ao público, viabilidade, coerência e qualidade visual.",
    selected.risks[0] ? `Atenção: ${selected.risks[0]}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const plan: CreativePlan = {
    version: WLC_CREATIVE_ENGINEERING_VERSION,
    brief,
    concepts,
    selected,
    selectionRationale,
    designDNASummary: `${dna.conceptName} | primary ${dna.palette.primary} | ${dna.typography.sans.split(",")[0]} | icons ${dna.iconFamily}`,
  };

  wlcLogger.info("creative-engineering", "plan-generated", {
    selected: selected.id,
    overall: selected.overall,
    concepts: concepts.length,
  });

  return plan;
}

export function formatCreativePlanContext(plan: CreativePlan): string {
  const lines = [
    `## WLC.IA Creative Engineering Engine v${plan.version}`,
    "Antes de implementar, conceitos alternativos foram avaliados. Não repita sempre o mesmo layout/sidebar/cards/gradiente roxo.",
    `### Brief`,
    `- Objetivo: ${plan.brief.objective}`,
    plan.brief.audience ? `- Público: ${plan.brief.audience}` : "",
    plan.brief.segment ? `- Segmento: ${plan.brief.segment}` : "",
    plan.brief.productType ? `- Tipo: ${plan.brief.productType}` : "",
    `### Conceito selecionado: ${plan.selected.name}`,
    plan.selectionRationale,
    `- Stack sugerida: ${plan.selected.stackSuggestion.join(", ")}`,
    `- Arquitetura: ${plan.selected.architectureNotes}`,
    `- UX: ${plan.selected.uxNotes}`,
    `- Design DNA: ${plan.designDNASummary}`,
    "### Alternativas consideradas",
    ...plan.concepts.slice(0, 4).map(
      (c) =>
        `- ${c.name} (score ${c.overall}): ${c.summary} | stack: ${c.stackSuggestion.slice(0, 3).join(", ")}`,
    ),
    "Implemente de forma original, coerente com o conceito selecionado, e justifique desvios relevantes.",
  ];
  return lines.filter(Boolean).join("\n");
}

/** Lightweight check: should we run creative planning for this request? */
export function shouldRunCreativePlanning(message: string): boolean {
  const q = normalize(message);
  return (
    /criar|desenvolver|implementar|gerar|construir|montar|fazer (um|uma|o|a)|novo (site|app|projeto|dashboard|landing|jogo)/.test(q) &&
    !/apenas explique|so explique|o que e|como funciona|bug|erro|corrigir|refatorar so/.test(q)
  );
}
