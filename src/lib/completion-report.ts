// Builds the end-of-run feedback strictly from what actually happened (tool log,
// pause/error state). Success is only reported when every operation succeeded
// and every write was verified.
export type ReportToolEntry = {
  tool: string;
  ok: boolean;
  summary: string;
  path?: string;
  commit_sha?: string;
  commit_url?: string;
  verified?: boolean;
};

export type CompletionStatus = "success" | "partial" | "paused" | "error" | "answered";

export type CompletionReport = {
  status: CompletionStatus;
  done: string[];
  files: string[];
  commits: { sha: string; url?: string }[];
  tests: string[];
  issues: string[];
  pending: string[];
  duration_ms: number;
};

const TEST_TOOLS = new Set(["check_ci"]);

export function buildCompletionReport(
  toolLog: ReportToolEntry[],
  opts: { paused?: boolean; pauseReason?: string | null; error?: string | null; durationMs: number },
): CompletionReport {
  const done = toolLog.filter((t) => t.ok).map((t) => t.summary);
  // A file counts as modified only when a real commit exists for it.
  const files = Array.from(new Set(toolLog.filter((t) => t.tool === "write_file" && t.path && t.commit_sha).map((t) => t.path!)));
  const pending = toolLog.filter((t) => t.ok && t.tool === "delete_file" && t.path).map((t) => `Aprovar remoção de ${t.path} em Tarefas`);
  const seen = new Set<string>();
  const commits: { sha: string; url?: string }[] = [];
  for (const t of toolLog) {
    if (t.ok && t.commit_sha && !seen.has(t.commit_sha)) {
      seen.add(t.commit_sha);
      commits.push(t.commit_url ? { sha: t.commit_sha, url: t.commit_url } : { sha: t.commit_sha });
    }
  }
  const tests = toolLog.filter((t) => TEST_TOOLS.has(t.tool)).map((t) => `${t.ok ? "✓" : "✗"} ${t.summary}`);
  const issues = [
    ...toolLog.filter((t) => !t.ok).map((t) => `${t.tool}: ${t.summary}`),
    ...toolLog.filter((t) => t.ok && t.verified === false).map((t) => `Não verificado: ${t.summary}`),
  ];
  if (opts.error) issues.push(opts.error);
  else if (opts.paused && opts.pauseReason) issues.push(`Pausado: ${opts.pauseReason}`);

  let status: CompletionStatus;
  if (opts.error) status = "error";
  else if (opts.paused) status = "paused";
  else if (!toolLog.length) status = "answered";
  else if (issues.length) status = "partial";
  else status = "success";
  return { status, done, files, commits, tests, issues, pending, duration_ms: Math.max(0, Math.round(opts.durationMs)) };
}
