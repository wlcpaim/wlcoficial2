/**
 * WLC.IA Engineering Memory v1 — layered session memory with provenance.
 * Working / Project / Technical / Failure / Decision / Preference.
 * Does not claim persistent model weight learning.
 */

export const WLC_ENGINEERING_MEMORY_VERSION = "1.0.0";

export type MemoryLayer =
  | "working"
  | "project"
  | "technical"
  | "failure"
  | "decision"
  | "preference";

export type MemoryEntry = {
  id: string;
  layer: MemoryLayer;
  key: string;
  value: string;
  source: string;
  confidence: "low" | "medium" | "high";
  evidence?: string;
  projectId?: string;
  valid: boolean;
  createdAt: string;
  updatedAt: string;
};

const nid = () => `mem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export class EngineeringMemory {
  private entries: MemoryEntry[] = [];

  upsert(input: Omit<MemoryEntry, "id" | "createdAt" | "updatedAt" | "valid"> & { valid?: boolean }): MemoryEntry {
    const existing = this.entries.find((e) => e.layer === input.layer && e.key === input.key && e.valid);
    const now = new Date().toISOString();
    if (existing) {
      existing.value = input.value;
      existing.source = input.source;
      existing.confidence = input.confidence;
      existing.evidence = input.evidence;
      existing.updatedAt = now;
      return existing;
    }
    const entry: MemoryEntry = {
      id: nid(),
      layer: input.layer,
      key: input.key,
      value: input.value,
      source: input.source,
      confidence: input.confidence,
      evidence: input.evidence,
      projectId: input.projectId,
      valid: input.valid ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.entries.push(entry);
    return entry;
  }

  invalidate(layer: MemoryLayer, key: string, reason: string): void {
    for (const e of this.entries) {
      if (e.layer === layer && e.key === key && e.valid) {
        e.valid = false;
        e.updatedAt = new Date().toISOString();
        e.value = `${e.value} [invalidated: ${reason}]`;
      }
    }
  }

  query(layer?: MemoryLayer, projectId?: string): MemoryEntry[] {
    return this.entries.filter(
      (e) => e.valid && (!layer || e.layer === layer) && (!projectId || e.projectId === projectId),
    );
  }

  /** Compact context for the connected model */
  formatContext(limit = 12): string {
    const valid = this.entries.filter((e) => e.valid).slice(-limit);
    if (!valid.length) {
      return `## Engineering Memory v${WLC_ENGINEERING_MEMORY_VERSION}\n- Memória de sessão vazia.`;
    }
    return [
      `## Engineering Memory v${WLC_ENGINEERING_MEMORY_VERSION}`,
      "- Camadas: working · project · technical · failure · decision · preference",
      "- Entradas válidas recentes:",
      ...valid.map(
        (e) =>
          `  - [${e.layer}/${e.confidence}] ${e.key}: ${e.value.slice(0, 160)}${e.evidence ? ` (ev: ${e.evidence.slice(0, 60)})` : ""}`,
      ),
      "- Não tratar preferências/inferências de baixa confiança como fatos.",
    ].join("\n");
  }
}
