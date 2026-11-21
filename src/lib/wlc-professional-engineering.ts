/**
 * WLC.IA Professional Engineering Intelligence v1.0.
 * Curated, versioned engineering guidance plus an evidence-based readiness gate.
 * This module enriches the connected model's context; it does not train model weights.
 */
export const WLC_PROFESSIONAL_ENGINEERING_VERSION = "1.0.0";

export type EngineeringDimension =
  | "architecture" | "type-safety" | "runtime-validation" | "responsive-ux"
  | "interaction-quality" | "accessibility" | "security" | "testing"
  | "performance" | "maintainability";
export type EngineeringEvidenceStatus = "verified" | "partial" | "missing" | "failed" | "not-applicable";
export type EngineeringEvidence = { dimension: EngineeringDimension; status: EngineeringEvidenceStatus; evidence: string; artifact?: string };
export type EngineeringAssessment = {
  score: number;
  verdict: "approved" | "needs-review" | "blocked";
  missing: EngineeringDimension[];
  partial: EngineeringDimension[];
  failed: EngineeringDimension[];
  blockers: string[];
};

const DIMENSIONS: readonly EngineeringDimension[] = [
  "architecture", "type-safety", "runtime-validation", "responsive-ux", "interaction-quality",
  "accessibility", "security", "testing", "performance", "maintainability",
];
const WEIGHTS: Record<EngineeringDimension, number> = {
  architecture: 12, "type-safety": 10, "runtime-validation": 10, "responsive-ux": 10,
  "interaction-quality": 10, accessibility: 10, security: 14, testing: 10, performance: 6, maintainability: 8,
};
const CRITICAL = new Set<EngineeringDimension>(["security", "runtime-validation"]);

/** Scores only explicit evidence. Missing or failed critical controls block approval. */
export function assessEngineeringReadiness(evidence: EngineeringEvidence[]): EngineeringAssessment {
  const latest = new Map<EngineeringDimension, EngineeringEvidence>();
  for (const item of evidence) latest.set(item.dimension, item);
  let earned = 0;
  let possible = 0;
  const missing: EngineeringDimension[] = [];
  const partial: EngineeringDimension[] = [];
  const failed: EngineeringDimension[] = [];
  const blockers: string[] = [];

  for (const dimension of DIMENSIONS) {
    const item = latest.get(dimension);
    if (item?.status === "not-applicable") continue;
    possible += WEIGHTS[dimension];
    if (!item || item.status === "missing") {
      missing.push(dimension);
      if (CRITICAL.has(dimension)) blockers.push(`${dimension}: evidência crítica ausente`);
      continue;
    }
    if (item.status === "failed") {
      failed.push(dimension);
      if (CRITICAL.has(dimension)) blockers.push(`${dimension}: verificação crítica falhou`);
      continue;
    }
    if (item.status === "verified") {
      if (!item.evidence.trim()) {
        missing.push(dimension);
        if (CRITICAL.has(dimension)) blockers.push(`${dimension}: verificação sem evidência`);
      } else earned += WEIGHTS[dimension];
      continue;
    }
    if (item.status === "partial") {
      partial.push(dimension);
      earned += WEIGHTS[dimension] / 2;
    }
  }
  const score = possible === 0 ? 0 : Math.round((earned / possible) * 100);
  const verdict = blockers.length > 0 ? "blocked" : score >= 90 && missing.length === 0 && partial.length === 0 && failed.length === 0 ? "approved" : "needs-review";
  return { score, verdict, missing, partial, failed, blockers };
}

const DEVELOPMENT_PATTERN = /\b(c[oó]digo|programa[cç][aã]o|desenvolv|aplica[cç][aã]o|site|website|frontend|front-end|backend|back-end|full.?stack|react|typescript|javascript|python|api|banco de dados|interface|design|modal|di[aá]logo|alerta|toast|responsiv|arquitetura|refator|debug|depur|teste|build|deploy|reposit[oó]rio|componente|script|lovable|vercel|replit)\b/i;
export function isWlcDevelopmentRequest(query: string): boolean { return DEVELOPMENT_PATTERN.test(query); }

export function buildWlcProfessionalEngineeringContext(query: string): string {
  if (!isWlcDevelopmentRequest(query)) return "";
  const base = [
    `## WLC.IA Professional Engineering Intelligence v${WLC_PROFESSIONAL_ENGINEERING_VERSION}`,
    "Atue como principal engineer pragmático. Inspecione repositório, manifests, convenções, dependências e limites antes de escolher a solução. Prefira o caminho mais simples que atenda requisitos com qualidade profissional.",
    "### Stack e arquitetura",
    "- Preserve a stack e a arquitetura existentes quando forem adequadas. Só proponha migração com ganho claro, custo e risco explicitados.",
    "- Separe domínio, aplicação, infraestrutura e UI. Regras de negócio não ficam presas a componentes visuais.",
    "- Para operações financeiras/estoque/PDV: modelar transação atômica (tudo grava ou nada grava) com auditoria.",
    "### Implementação",
    "- Mudanças pequenas, revisáveis e integradas. Evite reescrever App/entrypoints sem necessidade demonstrável.",
    "- Nomes claros, tipagem correta, erros tratados, estados de loading/empty/error. Sem catches vazios.",
    "- Acessibilidade: HTML semântico, labels, foco, teclado, contraste WCAG AA, prefers-reduced-motion.",
    "### Testes e honestidade",
    "- Reproduza o defeito, corrija, adicione regressão quando possível.",
    "- Execute typecheck/lint/test/build disponíveis. Não declare aprovado sem rodar o comando.",
    "- Relatório final: arquivos alterados, evidências, limitações e próximo passo único.",
    "### Aprendizado",
    "- Não afirme que a WLC.IA treinou pesos do modelo. Evolução local = conhecimento curado, retrieval, tools e código do agente.",
  ].join("\n");
  return [base, buildAntiLoopEngineeringPolicy(query)].filter(Boolean).join("\n\n");
}

/**
 * Anti-loop and commercial integrity policy injected into long autonomous runs.
 * Prevents the failure mode: rewrite App → pause → rewrite App again.
 */
export function buildAntiLoopEngineeringPolicy(message: string): string {
  const q = message.toLocaleLowerCase("pt-BR");
  const isContinue = /continu|checkpoint|de onde parou|nao repita|não repita|prossiga/.test(q);
  const isPdv = /pdv|estoque|caixa|venda|financeiro|dashboard/.test(q);
  const lines = [
    "## Política anti-loop e integridade comercial (WLC.IA Pro)",
    "- Nunca reinicie o projeto nem reescreva App/entrypoints só para 'continuar'.",
    "- Antes de gravar, liste o que já existe e altere apenas o necessário.",
    "- Uma venda (ou operação de negócio equivalente) deve atualizar estoque, registro e caixa de forma consistente — ou falhar de forma explícita.",
    "- Indicadores e gráficos: somente dados persistidos; caso contrário empty state. Proibido inventar percentuais de crescimento.",
    "- Não declare teste/build aprovado sem executar o comando e reportar o resultado real.",
    "- Prefira checkpoint + próximo passo único a planos longos que recomeçam do zero.",
    "- Se detectar o mesmo arquivo de entrada reescrito em ciclos sucessivos, pare, reporte estado e peça (ou escolha) um único módulo alvo.",
  ];
  if (isContinue) {
    lines.push("- Sinal de CONTINUAÇÃO: modo incremental obrigatório; proibido reset de dados ou scaffold completo.");
  }
  if (isPdv) {
    lines.push("- Contexto PDV/ERP: priorize saleService atômico, caixa e dashboard real antes de novos módulos cosméticos.");
  }
  return lines.join("\n");
}
