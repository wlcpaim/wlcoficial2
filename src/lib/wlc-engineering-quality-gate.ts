/**
 * WLC.IA Engineering Quality Gate — evidence-based review protocol.
 * Deterministic policy/rubric helpers; not a substitute for executing tools or tests.
 */
export type QualityDimension =
  | "requirements" | "architecture" | "implementation" | "security"
  | "data-integrity" | "accessibility" | "testing" | "operations" | "documentation";

export type EvidenceStatus = "verified" | "partial" | "missing" | "not-applicable";
export type QualityEvidence = {
  dimension: QualityDimension;
  status: EvidenceStatus;
  summary: string;
  artifact?: string;
  critical?: boolean;
};

export type QualityAssessment = {
  score: number;
  verdict: "approved" | "needs-review" | "blocked";
  blockers: string[];
  gaps: QualityDimension[];
  evidenceCount: number;
};

export const WLC_QUALITY_GATE_VERSION = "1.0.0";

export const WLC_QUALITY_DIMENSIONS: QualityDimension[] = [
  "requirements", "architecture", "implementation", "security",
  "data-integrity", "accessibility", "testing", "operations", "documentation"
];

const WEIGHTS: Record<QualityDimension, number> = {
  requirements: 10, architecture: 12, implementation: 16, security: 16,
  "data-integrity": 12, accessibility: 8, testing: 14, operations: 7, documentation: 5
};

export function assessEngineeringEvidence(evidence: QualityEvidence[]): QualityAssessment {
  const latest = new Map<QualityDimension, QualityEvidence>();
  for (const item of evidence) latest.set(item.dimension, item);

  let earned = 0;
  let possible = 0;
  const blockers: string[] = [];
  const gaps: QualityDimension[] = [];

  for (const dimension of WLC_QUALITY_DIMENSIONS) {
    const weight = WEIGHTS[dimension];
    const item = latest.get(dimension);
    if (item?.status === "not-applicable") continue;
    possible += weight;
    if (!item || item.status === "missing") {
      gaps.push(dimension);
      continue;
    }
    if (item.status === "verified") earned += weight;
    if (item.status === "partial") earned += weight * 0.5;
    if (item.critical && item.status !== "verified") {
      blockers.push(`${dimension}: evidência crítica não verificada`);
    }
  }

  // Missing dimensions are not silently treated as passing.
  const score = possible === 0 ? 0 : Math.round((earned / possible) * 100);
  const verdict = blockers.length > 0 ? "blocked"
    : score >= 90 && gaps.length === 0 ? "approved"
    : "needs-review";

  return { score, verdict, blockers, gaps, evidenceCount: evidence.length };
}

export function buildEngineeringQualityContext(): string {
  return [
    "## WLC.IA — protocolo de qualidade de engenharia baseado em evidências",
    "Atue como uma agência técnica multidisciplinar: arquitetura, produto/UX, design visual, frontend, backend, dados, banco, segurança, QA e SRE.",
    "Antes de implementar, converta o pedido em requisitos verificáveis, critérios de aceite, riscos, dependências e plano incremental.",
    "Durante a implementação, respeite contratos existentes, padrões do repositório, compatibilidade, acessibilidade, segurança e migrations reversíveis.",
    "Após implementar, execute primeiro testes direcionados e depois as verificações disponíveis: typecheck, lint, suíte, build, migrations e testes E2E quando configurados.",
    "Registre evidência por dimensão: requisitos, arquitetura, implementação, segurança, integridade dos dados, acessibilidade, testes, operação e documentação.",
    "Nunca marque uma dimensão como verificada sem saída real de ferramenta, teste ou inspeção reproduzível. Ausência de evidência significa pendente, não aprovado.",
    "Se uma verificação não puder ser executada, declare bloqueio ou pendência, explique o motivo e forneça o comando reproduzível.",
    "Para depuração: reproduzir, reduzir o caso, formular hipótese, corrigir minimamente, criar teste de regressão e repetir a reprodução.",
    "Não invente resultados, credenciais, benchmarks, certificações, deploys ou integração que não foram efetivamente realizados.",
    "Não publique, apague dados, altere produção, gaste recursos ou exponha segredos sem autorização explícita."
  ].join("\\n");
}

/**
 * Produces a reviewable learning proposal. It intentionally does not mutate
 * the academy: a human must approve and curate any persistent knowledge update.
 */
export type LearningProposal = {
  topic: string;
  lesson: string;
  evidence: string[];
  approvalRequired: true;
};

export function proposeLearningFromOutcome(input: {
  topic: string;
  lesson: string;
  evidence: string[];
}): LearningProposal | null {
  const topic = input.topic.trim().slice(0, 160);
  const lesson = input.lesson.trim().slice(0, 2000);
  const evidence = input.evidence.map((item) => item.trim()).filter(Boolean).slice(0, 8);
  if (!topic || !lesson || evidence.length === 0) return null;
  return { topic, lesson, evidence, approvalRequired: true };
}
