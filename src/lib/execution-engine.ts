// WLC.IA execution engine: operation ledger, anti-loop guard, error recovery
// classification, repo path normalization and evidence-based verdicts.
// Pure functions so every rule is testable without GitHub or a model.

export type OpState = "pending" | "running" | "success" | "failed" | "retrying" | "verified";
export type Operation = {
  id: string; tool: string; args_key: string; state: OpState; path?: string;
  result?: string; error?: string; error_kind?: ErrorKind; commit_sha?: string; evidence?: string; ts: string;
};

export type ErrorKind =
  | "not_found" | "permission" | "sha_conflict" | "rate_limit" | "timeout" | "network"
  | "invalid_json" | "invalid_schema" | "missing_dependency" | "compile" | "runtime" | "github" | "unknown";

export function classifyError(message: string): ErrorKind {
  const m = message.toLowerCase();
  if (/sha wasn'?t supplied|does not match|\b409\b|sha.*(missing|ausente|incorret)/.test(m)) return "sha_conflict";
  if (/não existe|inexistente|not found|\b404\b|no such file/.test(m)) return "not_found";
  if (/rate limit|\b429\b|quota|cota/.test(m)) return "rate_limit";
  if (/timeout|timed out|tempo esgotado/.test(m)) return "timeout";
  if (/\b40[13]\b|permiss|forbidden|unauthorized|bloquead/.test(m)) return "permission";
  if (/econn|network|fetch failed|conex/.test(m)) return "network";
  if (/json/.test(m)) return "invalid_json";
  if (/obrigatório|required|schema|argumento/.test(m)) return "invalid_schema";
  if (/cannot find module|module not found|dependên/.test(m)) return "missing_dependency";
  if (/syntaxerror|ts\d{4}|compil/.test(m)) return "compile";
  if (/github|\b422\b|\b5\d\d\b/.test(m)) return "github";
  return "unknown";
}

/** Concrete next strategy per error kind, fed back to the model instead of a blind retry. */
export function recoveryHint(kind: ErrorKind, tool: string, path?: string): string {
  switch (kind) {
    case "not_found": return `O caminho${path ? ` "${path}"` : ""} não existe na branch. Use list_files (ou search_codebase) para achar o caminho correto; se for arquivo novo, crie com write_file. Não repita ${tool} com o mesmo caminho.`;
    case "sha_conflict": return "Conflito de SHA: leia o arquivo com read_file para obter o SHA atual e repita a gravação com o conteúdo revisado.";
    case "rate_limit": return "Limite de requisições: aguarde ou siga com outra etapa; não repita imediatamente.";
    case "timeout": case "network": return "Falha transitória: tente uma única vez mais; se falhar de novo, registre o bloqueio.";
    case "permission": return "Sem permissão: não insista. Explique ao usuário qual permissão falta.";
    case "invalid_json": case "invalid_schema": return "Argumentos inválidos: corrija os parâmetros conforme o schema da ferramenta.";
    default: return "Analise o erro e mude de estratégia (outro argumento, outra ferramenta ou declare o bloqueio). Não repita a mesma chamada.";
  }
}

/** Normalizes a repository-relative path: slashes, ./, leading /, duplicate separators. */
export function normalizeRepoPath(input: string): string {
  let p = String(input ?? "").trim().replace(/\\/g, "/").replace(/\/{2,}/g, "/");
  while (p.startsWith("./")) p = p.slice(2);
  p = p.replace(/^\/+/, "").replace(/\/+$/, "");
  const out: string[] = [];
  for (const seg of p.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") { out.pop(); continue; }
    out.push(seg);
  }
  return out.join("/");
}

/** Suggest real paths when the model asks for one that does not exist. */
export function suggestPaths(wanted: string, existing: string[], max = 5): string[] {
  const base = normalizeRepoPath(wanted).split("/").pop()?.toLowerCase() ?? "";
  if (!base) return [];
  const stem = base.replace(/\.[^.]+$/, "");
  const exact = existing.filter((p) => p.toLowerCase().endsWith("/" + base) || p.toLowerCase() === base);
  const fuzzy = existing.filter((p) => !exact.includes(p) && stem.length > 2 && p.toLowerCase().includes(stem));
  return [...exact, ...fuzzy].slice(0, max);
}

const stable = (v: unknown): string => {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v as object).sort().map((k) => `${k}:${stable((v as Record<string, unknown>)[k])}`).join(",")}}`;
  return JSON.stringify(v);
};
export function argsKey(tool: string, args: Record<string, unknown>): string {
  const a = { ...args };
  if (typeof a.path === "string") a.path = normalizeRepoPath(a.path);
  delete a.commit_message;
  return `${tool}:${stable(a)}`;
}

export const MAX_SAME_FAILURES = 2;
export const MAX_SAME_CALLS = 3;
const READ_ONLY = new Set(["read_file", "list_files", "search_codebase", "analyze_repository", "list_commits", "check_ci", "compare_versions"]);

/** Central ledger of every tool operation in a run. */
export class OperationLedger {
  ops: Operation[] = [];
  private seq = 0;
  /** Number of state changes (successful writes); read-only repeats are only allowed when this moved. */
  private writeEpoch = 0;
  private epochAt = new Map<string, number>();

  constructor(seed: Operation[] = []) { this.ops = [...seed]; this.seq = seed.length; }

  /** Returns a block reason when the call would be a loop, or null to proceed. */
  guard(tool: string, args: Record<string, unknown>): string | null {
    const key = argsKey(tool, args);
    const same = this.ops.filter((o) => o.args_key === key);
    const failed = same.filter((o) => o.state === "failed");
    const sinceEpoch = this.epochAt.get(key);
    if (failed.length >= MAX_SAME_FAILURES && sinceEpoch === this.writeEpoch) {
      const last = failed[failed.length - 1]!;
      return `Bloqueado pelo anti-loop: ${tool} já falhou ${failed.length}x com os mesmos argumentos (${last.error_kind}). ${recoveryHint(last.error_kind ?? "unknown", tool, last.path)}`;
    }
    if (READ_ONLY.has(tool) && same.length >= MAX_SAME_CALLS && sinceEpoch === this.writeEpoch) {
      return `Bloqueado pelo anti-loop: ${tool} com os mesmos argumentos já rodou ${same.length}x sem nenhuma alteração no repositório. Use o resultado anterior e avance para a próxima etapa.`;
    }
    return null;
  }

  start(tool: string, args: Record<string, unknown>): Operation {
    const key = argsKey(tool, args);
    const prev = this.ops.filter((o) => o.args_key === key && o.state === "failed").length;
    const op: Operation = { id: `op_${++this.seq}`, tool, args_key: key, state: prev ? "retrying" : "running", ts: new Date().toISOString(), ...(typeof args.path === "string" ? { path: normalizeRepoPath(args.path) } : {}) };
    this.ops.push(op);
    this.epochAt.set(key, this.writeEpoch);
    return op;
  }

  finish(op: Operation, output: string, opts: { verified?: boolean; commit_sha?: string; write?: boolean } = {}) {
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(output); } catch { /* plain text output */ }
    const err = typeof parsed.error === "string" ? parsed.error : null;
    if (err || parsed.ok === false) {
      op.state = "failed"; op.error = err ?? "operação retornou ok=false"; op.error_kind = classifyError(op.error);
    } else {
      op.state = opts.verified ? "verified" : "success";
      if (opts.write && !parsed.unchanged) this.writeEpoch++;
    }
    if (opts.commit_sha) op.commit_sha = opts.commit_sha;
    if (opts.verified) op.evidence = "conteúdo relido do commit confere";
    op.result = output.slice(0, 300);
    return op;
  }

  stats() {
    const c = (s: OpState) => this.ops.filter((o) => o.state === s).length;
    return { total: this.ops.length, verified: c("verified"), success: c("success"), failed: c("failed") };
  }
}

/** Feedback sent back to the model after a failure: error kind + concrete strategy (+ real path suggestions). */
export function enrichFailure(output: string, tool: string, path: string | undefined, treePaths: string[]): string {
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(output); } catch { return output; }
  if (typeof parsed.error !== "string") return output;
  const kind = classifyError(parsed.error);
  const suggestions = kind === "not_found" && path ? suggestPaths(path, treePaths) : [];
  return JSON.stringify({ ...parsed, error_kind: kind, recovery: recoveryHint(kind, tool, path), ...(suggestions.length ? { did_you_mean: suggestions } : {}) });
}

export type HonestStatus = "CONCLUÍDO E VALIDADO" | "IMPLEMENTADO, NÃO TESTADO" | "PARCIALMENTE IMPLEMENTADO" | "BLOQUEADO" | "FALHOU" | "RESPONDIDO";
export type Confidence = "EXECUTADO" | "CONFIRMADO" | "TESTADO" | "VALIDADO";

/** Status derived only from evidence: writes verified + a real test passing. */
export function honestStatus(e: { writes: number; verifiedWrites: number; failures: number; testsRun: number; testsPassed: number; blocked: boolean; error: boolean }): { status: HonestStatus; confidence: Confidence | null } {
  if (e.error) return { status: "FALHOU", confidence: null };
  if (e.blocked) return { status: "BLOQUEADO", confidence: e.verifiedWrites ? "CONFIRMADO" : null };
  if (!e.writes) return { status: e.failures ? "FALHOU" : "RESPONDIDO", confidence: null };
  if (e.failures || e.verifiedWrites < e.writes) return { status: "PARCIALMENTE IMPLEMENTADO", confidence: e.verifiedWrites ? "CONFIRMADO" : "EXECUTADO" };
  if (e.testsRun && e.testsPassed === e.testsRun) return { status: "CONCLUÍDO E VALIDADO", confidence: "VALIDADO" };
  return { status: "IMPLEMENTADO, NÃO TESTADO", confidence: "CONFIRMADO" };
}

/** Rewrites unproven success claims in the model's final text. */
export function guardClaims(text: string, status: HonestStatus): string {
  if (status === "CONCLUÍDO E VALIDADO") return text;
  return text
    .replace(/\b(100% )?funcional(mente)?\b/gi, "implementado (não testado)")
    .replace(/conclu[ií]d[oa] com sucesso/gi, "executado (ver status verificado)")
    .replace(/testad[oa] e validad[oa]/gi, "não testado");
}

/** Resume: which files from a saved checkpoint already exist so they are not recreated. */
export function reconcileCheckpoint(saved: { path: string; blob_sha: string }[], current: Map<string, string>) {
  const confirmed: string[] = []; const diverged: string[] = []; const missing: string[] = [];
  for (const f of saved) {
    const sha = current.get(normalizeRepoPath(f.path));
    if (!sha) missing.push(f.path); else if (sha === f.blob_sha) confirmed.push(f.path); else diverged.push(f.path);
  }
  return { confirmed, diverged, missing };
}
