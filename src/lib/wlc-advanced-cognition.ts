import { assessWlcRequest, type WlcCognitiveDecision } from "./wlc-cognitive-engine.ts";
import { WLC_CORE_KNOWLEDGE, type KnowledgeEntry } from "./wlc-knowledge-base.ts";

export type CognitiveEvidence = { id: string; source: string; text: string; reliability: number; observedAt?: string };
export type CognitiveAssessment = {
  decision: WlcCognitiveDecision;
  confidence: number;
  confidenceBand: "low" | "medium" | "high";
  evidence: CognitiveEvidence[];
  knowledge: Array<KnowledgeEntry & { relevance: number }>;
  warnings: string[];
  requiresHumanReview: boolean;
  strategy: "direct" | "tool-assisted" | "research-first" | "approval-gated";
};

const STOP = new Set("a ao aos as o os de da das do dos e em no na nos nas um uma uns umas por para com sem sobre entre que se sua seu suas seu como mais menos muito eu voce voces isso aqui onde quando qual quem porque pode fazer ser estar ter nao sim mas ou ja ainda tambem".split(" "));
const normalize = (s: string) => s.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const tokenize = (s: string) => normalize(s).split(" ").filter((x) => x.length > 2 && !STOP.has(x));

// Build the static lexical index once. Requests only score the already-tokenized corpus.
const INDEXED_KNOWLEDGE = WLC_CORE_KNOWLEDGE.map((entry) => {
  const terms = tokenize([entry.domain, entry.title, ...entry.keywords, entry.content].join(" "));
  const frequencies = new Map<string, number>();
  for (const term of terms) frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
  return { entry, terms, frequencies, titleTerms: new Set(tokenize(entry.title)), keywordTerms: new Set(entry.keywords.flatMap(tokenize)) };
});
const AVERAGE_DOCUMENT_LENGTH = INDEXED_KNOWLEDGE.reduce((total, doc) => total + doc.terms.length, 0) / Math.max(1, INDEXED_KNOWLEDGE.length);
const DOCUMENT_FREQUENCY = (() => {
  const frequency = new Map<string, number>();
  for (const doc of INDEXED_KNOWLEDGE) for (const term of doc.frequencies.keys()) frequency.set(term, (frequency.get(term) ?? 0) + 1);
  return frequency;
})();

/** BM25-like retrieval over curated knowledge. Deterministic, explainable, and dependency-free. */
export function retrieveSemanticKnowledge(query: string, limit = 5): Array<KnowledgeEntry & { relevance: number }> {
  const q = [...new Set(tokenize(query))];
  if (!q.length || !Number.isFinite(limit) || limit <= 0) return [];
  const safeLimit = Math.floor(limit);
  if (safeLimit < 1) return [];
  const documentCount = INDEXED_KNOWLEDGE.length;
  const scored = INDEXED_KNOWLEDGE.map((doc) => {
    let score = 0;
    for (const term of q) {
      const tf = doc.frequencies.get(term) ?? 0;
      if (!tf) continue;
      const df = DOCUMENT_FREQUENCY.get(term) ?? 0;
      const idf = Math.log(1 + (documentCount - df + 0.5) / (df + 0.5));
      score += idf * ((tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * doc.terms.length / Math.max(1, AVERAGE_DOCUMENT_LENGTH))));
      if (doc.titleTerms.has(term)) score += 1.25;
      if (doc.keywordTerms.has(term)) score += 0.65;
    }
    return { ...doc.entry, relevance: Number(score.toFixed(4)) };
  });
  return scored.filter((entry) => entry.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance || a.id.localeCompare(b.id))
    .slice(0, safeLimit);
}

/**
 * A transparent routing heuristic, not a calibrated probability. Evidence quality matters
 * more than evidence volume: duplicated or low-reliability records must not inflate confidence.
 */
function confidenceFor(
  decision: WlcCognitiveDecision,
  knowledge: Array<KnowledgeEntry & { relevance: number }>,
  evidence: CognitiveEvidence[],
): number {
  let score = 0.4;
  if (decision.intent !== "unknown") score += 0.08;
  if (!decision.needsClarification) score += 0.05;
  if (decision.complexity === "low") score += 0.04;

  const strongestKnowledgeMatch = knowledge[0]?.relevance ?? 0;
  if (strongestKnowledgeMatch > 0) score += 0.16 * (strongestKnowledgeMatch / (strongestKnowledgeMatch + 4));

  if (evidence.length > 0) {
    const meanReliability = evidence.reduce((total, item) => total + item.reliability, 0) / evidence.length;
    score += 0.15 * meanReliability;
  }
  if (decision.risk === "high") score -= 0.1;
  if (decision.complexity === "high") score -= 0.04;
  return Math.max(0.05, Math.min(0.9, Number(score.toFixed(2))));
}

/** Creates an auditable decision summary; it never claims model training or certainty. */
export function assessAdvancedCognition(input: string, evidence: CognitiveEvidence[] = []): CognitiveAssessment {
  const decision = assessWlcRequest(input);
  const knowledge = retrieveSemanticKnowledge(input, 5);
  const validEvidence = evidence.filter((e) => e.id.trim() && e.source.trim() && e.text.trim() && Number.isFinite(e.reliability) && e.reliability >= 0 && e.reliability <= 1);
  const confidence = confidenceFor(decision, knowledge, validEvidence);
  const warnings: string[] = [];
  if (decision.needsClarification) warnings.push("A solicitação precisa de esclarecimento antes de uma decisão confiável.");
  if (!knowledge.length) warnings.push("Nenhum conhecimento curado relevante foi recuperado; não invente suporte técnico.");
  if (decision.risk === "high") warnings.push("Ação de alto risco: exigir autorização explícita e validação server-side.");
  if (validEvidence.length !== evidence.length) warnings.push("Algumas evidências foram descartadas por metadados inválidos.");
  if (confidence < 0.62) warnings.push("Confiança estimada baixa: buscar evidências adicionais ou solicitar revisão humana.");
  const strategy = decision.risk === "high" ? "approval-gated" : decision.intent === "research" ? "research-first" : decision.needsTools ? "tool-assisted" : "direct";
  return { decision, confidence, confidenceBand: confidence >= 0.78 ? "high" : confidence >= 0.62 ? "medium" : "low", evidence: validEvidence, knowledge, warnings, requiresHumanReview: decision.risk === "high" || confidence < 0.62 || decision.needsClarification, strategy };
}

export type OutcomeRecord = { strategy: string; success: boolean; quality: number; cost?: number; latencyMs?: number };
/** Suggests strategy from explicit outcome history; no autonomous weight mutation or model training. */
export function recommendStrategy(history: OutcomeRecord[], fallback: CognitiveAssessment["strategy"]): { strategy: CognitiveAssessment["strategy"]; sampleSize: number; rationale: string } {
  const valid = history.filter((x) => Number.isFinite(x.quality) && x.quality >= 0 && x.quality <= 1 && Number.isFinite(x.cost ?? 0) && (x.cost ?? 0) >= 0 && Number.isFinite(x.latencyMs ?? 0) && (x.latencyMs ?? 0) >= 0);
  if (valid.length < 5) return { strategy: fallback, sampleSize: valid.length, rationale: "Histórico insuficiente; manter estratégia padrão até obter pelo menos cinco resultados válidos." };
  const groups = new Map<string, OutcomeRecord[]>();
  for (const row of valid) groups.set(row.strategy, [...(groups.get(row.strategy) ?? []), row]);
  const ranked = [...groups.entries()].filter(([, rows]) => rows.length >= 3).map(([strategy, rows]) => ({ strategy, score: rows.reduce((s, r) => s + (r.quality * 0.7 + (r.success ? 0.3 : 0)), 0) / rows.length }));
  ranked.sort((a, b) => b.score - a.score || a.strategy.localeCompare(b.strategy));
  const best = ranked[0];
  const allowed = new Set<CognitiveAssessment["strategy"]>(["direct", "tool-assisted", "research-first", "approval-gated"]);
  if (!best || !allowed.has(best.strategy as CognitiveAssessment["strategy"])) return { strategy: fallback, sampleSize: valid.length, rationale: "Não há amostra comparável suficiente por estratégia; manter padrão." };
  return { strategy: best.strategy as CognitiveAssessment["strategy"], sampleSize: valid.length, rationale: `Estratégia sugerida com base em ${valid.length} resultados registrados; valide no contexto atual antes de executar.` };
}

export function formatAdvancedCognitiveContext(result: CognitiveAssessment): string {
  return ["## WLC.IA — avaliação cognitiva auditável", `- Intenção: ${result.decision.intent}`, `- Confiança estimada: ${result.confidence} (${result.confidenceBand})`, `- Estratégia: ${result.strategy}`, `- Revisão humana: ${result.requiresHumanReview ? "necessária" : "não indicada pela política atual"}`, `- Conhecimento recuperado: ${result.knowledge.map((k) => `${k.id} (${k.relevance})`).join(", ") || "nenhum"}`, `- Alertas: ${result.warnings.join(" | ") || "nenhum"}`, "Use evidências verificáveis; confiança é uma heurística de roteamento, não probabilidade calibrada nem garantia de correção."].join("\n");
}
