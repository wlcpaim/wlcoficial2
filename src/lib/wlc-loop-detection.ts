/**
 * WLC.IA Loop Detection Engine v1
 * Fingerprint-based protection against repeated tool calls, identical failures,
 * and no-progress rewrite cycles. Complements OperationLedger in execution-engine.
 */

export const WLC_LOOP_DETECTION_VERSION = "1.0.0";

export type ActionFingerprint = {
  key: string;
  tool: string;
  target?: string;
  taskId?: string;
  argsHash: string;
};

export type ActionRecord = {
  fingerprint: string;
  at: string;
  ok: boolean;
  errorSignature?: string;
  progressScore: number; // 0 = no progress signal
};

export type LoopVerdict =
  | { kind: "ok" }
  | { kind: "soft_warn"; message: string; count: number }
  | { kind: "hard_block"; message: string; count: number; suggestion: string };

function stableHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function fingerprintAction(
  tool: string,
  args: Record<string, unknown> = {},
  meta: { taskId?: string; target?: string } = {},
): ActionFingerprint {
  const normalized: Record<string, unknown> = {};
  for (const k of Object.keys(args).sort()) {
    const v = args[k];
    if (v === undefined || typeof v === "function") continue;
    normalized[k] = typeof v === "string" && v.length > 200 ? v.slice(0, 200) : v;
  }
  const argsHash = stableHash(JSON.stringify(normalized));
  const target = meta.target ?? (typeof args.path === "string" ? args.path : undefined);
  const key = [tool, meta.taskId ?? "", target ?? "", argsHash].join("|");
  return { key, tool, target, taskId: meta.taskId, argsHash };
}

export class LoopDetector {
  private records: ActionRecord[] = [];
  private readonly maxSameCalls: number;
  private readonly maxSameFailures: number;

  constructor(opts?: { maxSameCalls?: number; maxSameFailures?: number }) {
    this.maxSameCalls = opts?.maxSameCalls ?? 3;
    this.maxSameFailures = opts?.maxSameFailures ?? 2;
  }

  record(fp: ActionFingerprint, result: { ok: boolean; error?: string; progressScore?: number }): LoopVerdict {
    const errorSignature = result.error ? stableHash(result.error.slice(0, 240)) : undefined;
    this.records.push({
      fingerprint: fp.key,
      at: new Date().toISOString(),
      ok: result.ok,
      errorSignature,
      progressScore: result.progressScore ?? (result.ok ? 1 : 0),
    });
    // keep memory bounded
    if (this.records.length > 200) this.records = this.records.slice(-150);

    const same = this.records.filter((r) => r.fingerprint === fp.key);
    const sameFails = same.filter((r) => !r.ok);
    const consecutiveFails = this.trailingFailures(fp.key);

    if (consecutiveFails >= this.maxSameFailures && errorSignature) {
      const sameError = sameFails.filter((r) => r.errorSignature === errorSignature).length;
      if (sameError >= this.maxSameFailures) {
        return {
          kind: "hard_block",
          message: `Ação idêntica falhou ${sameError}x com o mesmo erro (${fp.tool}${fp.target ? ` → ${fp.target}` : ""}).`,
          count: sameError,
          suggestion: "Mudar estratégia: ler evidência do erro, alterar argumentos, inspecionar dependências ou escolher outra ferramenta. Não repetir a mesma chamada.",
        };
      }
    }

    if (same.length >= this.maxSameCalls) {
      const progress = same.reduce((a, r) => a + r.progressScore, 0);
      if (progress < 1) {
        return {
          kind: "hard_block",
          message: `Ação idêntica repetida ${same.length}x sem progresso mensurável (${fp.tool}).`,
          count: same.length,
          suggestion: "Detectado falso progresso. Replanejar, mudar alvo ou validar estado real do repositório.",
        };
      }
      return {
        kind: "soft_warn",
        message: `Ação similar já executada ${same.length}x (${fp.tool}).`,
        count: same.length,
      };
    }

    // Rewrite loop: same target path written many times with low progress
    if (fp.tool.includes("write") && fp.target) {
      const writes = this.records.filter((r) => r.fingerprint.includes(fp.target!));
      if (writes.length >= 4) {
        const prog = writes.reduce((a, r) => a + r.progressScore, 0);
        if (prog <= 1) {
          return {
            kind: "hard_block",
            message: `Reescritas repetidas em ${fp.target} sem progresso.`,
            count: writes.length,
            suggestion: "Parar de reescrever o mesmo entrypoint. Diff mínimo ou mudar de módulo.",
          };
        }
      }
    }

    return { kind: "ok" };
  }

  private trailingFailures(fingerprint: string): number {
    let n = 0;
    for (let i = this.records.length - 1; i >= 0; i--) {
      const r = this.records[i]!;
      if (r.fingerprint !== fingerprint) break;
      if (r.ok) break;
      n++;
    }
    return n;
  }

  /** No measurable progress across last N actions */
  detectStagnation(window = 6): boolean {
    const recent = this.records.slice(-window);
    if (recent.length < window) return false;
    return recent.every((r) => r.progressScore <= 0);
  }

  snapshot(): { total: number; unique: number; stagnation: boolean } {
    const unique = new Set(this.records.map((r) => r.fingerprint)).size;
    return { total: this.records.length, unique, stagnation: this.detectStagnation() };
  }
}

export function formatLoopDetectionContext(detector: LoopDetector): string {
  const s = detector.snapshot();
  return [
    `## Loop Detection Engine v${WLC_LOOP_DETECTION_VERSION}`,
    `- actions_recorded: ${s.total}`,
    `- unique_fingerprints: ${s.unique}`,
    `- stagnation: ${s.stagnation ? "YES — replanejar obrigatório" : "no"}`,
    "- Política: não repetir a mesma ferramenta+args após falhas consecutivas idênticas; mudar estratégia.",
  ].join("\n");
}
