/**
 * WLC.IA Evidence-Based Completion v1
 * Prevents claiming success without verification artifacts.
 */

export const WLC_EVIDENCE_SYSTEM_VERSION = "1.0.0";

export type EvidenceKind =
  | "file_change"
  | "diff"
  | "build"
  | "typecheck"
  | "lint"
  | "test"
  | "screenshot"
  | "log"
  | "endpoint"
  | "database"
  | "manual";

export type EvidenceStatus = "NOT_VERIFIED" | "PARTIALLY_VERIFIED" | "VERIFIED" | "FAILED";

export type EvidenceItem = {
  id: string;
  kind: EvidenceKind;
  label: string;
  status: EvidenceStatus;
  detail?: string;
  command?: string;
  at: string;
};

export type CompletionGate = {
  allowed: boolean;
  status: EvidenceStatus;
  blockers: string[];
  evidence: EvidenceItem[];
};

const nid = () => `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export class EvidenceLedger {
  private items: EvidenceItem[] = [];

  add(partial: Omit<EvidenceItem, "id" | "at"> & { at?: string }): EvidenceItem {
    const item: EvidenceItem = {
      id: nid(),
      at: partial.at ?? new Date().toISOString(),
      kind: partial.kind,
      label: partial.label,
      status: partial.status,
      detail: partial.detail,
      command: partial.command,
    };
    this.items.push(item);
    return item;
  }

  /** Gate for declaring a development task complete */
  evaluateCompletion(opts: { requiresTests?: boolean; requiresBuild?: boolean; writesClaimed: number }): CompletionGate {
    const blockers: string[] = [];
    const tests = this.items.filter((i) => i.kind === "test");
    const builds = this.items.filter((i) => i.kind === "build" || i.kind === "typecheck");
    const failed = this.items.filter((i) => i.status === "FAILED");
    const verifiedWrites = this.items.filter((i) => i.kind === "file_change" && i.status === "VERIFIED");

    if (failed.length) blockers.push(`${failed.length} evidência(s) FAILED`);
    if (opts.writesClaimed > 0 && verifiedWrites.length === 0) {
      blockers.push("Alterações de arquivo declaradas sem evidência VERIFIED");
    }
    if (opts.requiresTests && !tests.some((t) => t.status === "VERIFIED")) {
      blockers.push("Testes exigidos mas não há evidência VERIFIED de teste");
    }
    if (opts.requiresBuild && !builds.some((b) => b.status === "VERIFIED")) {
      blockers.push("Build/typecheck exigido sem evidência VERIFIED");
    }

    let status: EvidenceStatus = "NOT_VERIFIED";
    if (this.items.some((i) => i.status === "VERIFIED") && blockers.length) status = "PARTIALLY_VERIFIED";
    else if (!blockers.length && this.items.some((i) => i.status === "VERIFIED")) status = "VERIFIED";
    else if (failed.length) status = "FAILED";

    return {
      allowed: blockers.length === 0 && status === "VERIFIED",
      status: blockers.length ? (failed.length ? "FAILED" : "PARTIALLY_VERIFIED") : status,
      blockers,
      evidence: [...this.items],
    };
  }

  /**
   * Strip or rewrite premature success claims in agent prose.
   */
  guardCompletionClaims(text: string, gate: CompletionGate): string {
    if (gate.allowed) return text;
    const banned =
      /(testes?\s+aprovados?|build\s+ok|tudo\s+funcionando|sistema\s+conclu[ií]do|100%\s+pronto|fully\s+working)/gi;
    if (!banned.test(text)) return text;
    return `${text}\n\n⚠️ [Evidence Gate] Conclusão plena bloqueada: ${gate.blockers.join("; ") || gate.status}.`;
  }

  formatContext(): string {
    if (!this.items.length) {
      return `## Evidence System v${WLC_EVIDENCE_SYSTEM_VERSION}\n- Sem evidências registradas. Não declare sucesso de build/teste sem executar.`;
    }
    return [
      `## Evidence System v${WLC_EVIDENCE_SYSTEM_VERSION}`,
      ...this.items.slice(-10).map((i) => `- [${i.status}] ${i.kind}: ${i.label}${i.command ? ` ⟨${i.command}⟩` : ""}`),
    ].join("\n");
  }
}
