/**
 * WLC.IA Autonomous Development Core v0.7
 * Deterministic control layer for multi-file tasks, checkpoints, validation,
 * bounded repair attempts and session-scoped learning. Execution is adapter-based:
 * no unsafe shell execution is enabled by this module.
 */
export type TaskStatus = "queued" | "running" | "blocked" | "completed" | "failed";
export type DevTask = {
  id: string; title: string; description: string; dependsOn: string[];
  acceptanceCriteria: string[]; status: TaskStatus; attempts: number;
};
export type ProjectFile = { path: string; content: string; operation: "create" | "update" | "delete" };
export type Checkpoint<T> = { id: string; createdAt: string; reason: string; state: T };
export type ValidationKind = "test" | "typecheck" | "lint" | "build" | "security" | "manual";
export type ValidationResult = { kind: ValidationKind; command?: string; passed: boolean; summary: string; details?: string };
export type Lesson = { signature: string; lesson: string; createdAt: string; occurrences: number };

const now = () => new Date().toISOString();
const id = () => `wlc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function createTaskPlan(goal: string, steps: Array<{ title: string; description?: string; criteria?: string[] }> = []): DevTask[] {
  const normalized = steps.length ? steps : [
    { title: "Inspect and define acceptance criteria", description: "Review project context, stack and requirements." },
    { title: "Design implementation", description: "Choose a compatible approach and define affected files." },
    { title: "Implement incrementally", description: "Create or edit files in coordinated, reviewable changes." },
    { title: "Validate and repair", description: "Run applicable checks and fix failures within retry limits." },
    { title: "Final review and delivery", description: "Review quality, report evidence and limitations." },
  ];
  return normalized.map((s, i) => ({
    id: `task-${i + 1}`, title: s.title, description: s.description ?? goal,
    dependsOn: i ? [`task-${i}`] : [], acceptanceCriteria: s.criteria ?? [],
    status: "queued", attempts: 0,
  }));
}

export function validateTaskGraph(tasks: DevTask[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const ids = new Set(tasks.map(t => t.id));
  if (ids.size !== tasks.length) errors.push("Task IDs must be unique.");
  for (const task of tasks) for (const dep of task.dependsOn) {
    if (!ids.has(dep)) errors.push(`${task.id} references missing dependency ${dep}.`);
    if (dep === task.id) errors.push(`${task.id} cannot depend on itself.`);
  }
  // Cycle check via DFS
  const visiting = new Set<string>(), visited = new Set<string>();
  const byId = new Map(tasks.map(t => [t.id, t]));
  const visit = (tid: string) => {
    if (visiting.has(tid)) { errors.push(`Dependency cycle involving ${tid}.`); return; }
    if (visited.has(tid)) return;
    visiting.add(tid);
    for (const d of byId.get(tid)?.dependsOn ?? []) if (byId.has(d)) visit(d);
    visiting.delete(tid); visited.add(tid);
  };
  tasks.forEach(t => visit(t.id));
  return { valid: !errors.length, errors };
}

export function readyTasks(tasks: DevTask[]): DevTask[] {
  const completed = new Set(tasks.filter(t => t.status === "completed").map(t => t.id));
  return tasks.filter(t => t.status === "queued" && t.dependsOn.every(d => completed.has(d)));
}

export function validateFilePath(path: string): string | null {
  const p = path.replace(/\\/g, "/").trim();
  if (!p || p.startsWith("/") || /^[a-zA-Z]:/.test(p)) return "Path must be relative to project root.";
  if (p.split("/").some(part => part === ".." || part === "." || part === "")) return "Path traversal or malformed path is not allowed.";
  if (p.includes("\0")) return "Null byte is not allowed.";
  return null;
}

export function validateFileBatch(files: ProjectFile[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    const err = validateFilePath(file.path);
    if (err) errors.push(`${file.path}: ${err}`);
    const normalized = file.path.replace(/\\/g, "/");
    if (seen.has(normalized)) errors.push(`Duplicate file operation: ${normalized}`);
    seen.add(normalized);
    if (file.operation === "delete" && file.content) errors.push(`${file.path}: delete operation must not carry content.`);
  }
  return { valid: !errors.length, errors };
}

export function createCheckpoint<T>(state: T, reason: string): Checkpoint<T> {
  // structuredClone prevents later mutation from corrupting the saved checkpoint.
  return { id: id(), createdAt: now(), reason, state: structuredClone(state) };
}

export type DevelopmentSession = {
  sessionId: string; goal: string; tasks: DevTask[]; checkpoints: Checkpoint<unknown>[];
  lessons: Lesson[]; filesChanged: string[]; repairAttempts: number; maxRepairAttempts: number;
  validation: ValidationResult[]; status: "planning" | "implementing" | "validating" | "repairing" | "completed" | "failed";
};
export function createSession(goal: string, tasks = createTaskPlan(goal), maxRepairAttempts = 3): DevelopmentSession {
  const graph = validateTaskGraph(tasks);
  if (!graph.valid) throw new Error(graph.errors.join(" "));
  return { sessionId: id(), goal, tasks, checkpoints: [], lessons: [], filesChanged: [],
    repairAttempts: 0, maxRepairAttempts: Math.max(0, Math.min(5, maxRepairAttempts)),
    validation: [], status: "planning" };
}
export function checkpointSession(session: DevelopmentSession, reason: string): Checkpoint<DevelopmentSession> {
  const cp = createCheckpoint(session, reason);
  session.checkpoints.push(cp);
  return cp;
}
export function addSessionLesson(session: DevelopmentSession, signature: string, lesson: string): void {
  const existing = session.lessons.find(l => l.signature === signature);
  if (existing) { existing.occurrences++; existing.lesson = lesson; }
  else session.lessons.push({ signature, lesson, createdAt: now(), occurrences: 1 });
}
export function getSessionLessons(session: DevelopmentSession): string {
  return session.lessons.map(l => `- [${l.occurrences}x] ${l.signature}: ${l.lesson}`).join("\n");
}
export function shouldRepair(session: DevelopmentSession, results: ValidationResult[]): boolean {
  return results.some(r => !r.passed) && session.repairAttempts < session.maxRepairAttempts;
}
export function recordValidation(session: DevelopmentSession, results: ValidationResult[]): void {
  session.validation.push(...results);
  if (results.some(r => !r.passed)) session.status = shouldRepair(session, results) ? "repairing" : "failed";
  else session.status = "validating"; // Legacy summaries alone cannot satisfy the evidence gate.
}
export function beginRepairAttempt(session: DevelopmentSession): boolean {
  if (session.repairAttempts >= session.maxRepairAttempts) return false;
  session.repairAttempts++;
  session.status = "repairing";
  checkpointSession(session, `Before repair attempt ${session.repairAttempts}`);
  return true;
}

/** Evidence-based completion gate. A task cannot be marked complete from model claims alone. */
export type GateCheckStatus = "not_run" | "passed" | "failed";
export type GateCheckResult = {
  name: string;
  status: GateCheckStatus;
  exitCode?: number;
  evidence?: string;
  details?: string;
};
export type ValidationGateInput = { requiredChecks: string[]; results: GateCheckResult[] };
export type ValidationGateReport = {
  passed: boolean;
  required: string[];
  missing: string[];
  failed: string[];
  reasons: string[];
};

/** Requires at least one check and proof for every required check. Extra checks do not satisfy missing ones. */
export function evaluateValidationGate(input: ValidationGateInput): ValidationGateReport {
  const required = [...new Set(input.requiredChecks.map((name) => name.trim()).filter(Boolean))];
  const missing: string[] = [];
  const failed: string[] = [];
  const reasons: string[] = [];
  if (required.length === 0) reasons.push("At least one required validation check must be specified.");

  for (const name of required) {
    const matches = input.results.filter((result) => result.name === name);
    if (matches.length === 0) {
      missing.push(name);
      reasons.push(`Required check '${name}' has no result.`);
      continue;
    }
    if (matches.length > 1) {
      failed.push(name);
      reasons.push(`Required check '${name}' has ambiguous duplicate results.`);
      continue;
    }
    const result = matches[0]!;
    if (result.status !== "passed") {
      failed.push(name);
      reasons.push(`Required check '${name}' did not pass (status: ${result.status}).`);
      continue;
    }
    if (result.exitCode !== 0) {
      failed.push(name);
      reasons.push(`Required check '${name}' must have exit code 0.`);
      continue;
    }
    if (!result.evidence?.trim()) {
      failed.push(name);
      reasons.push(`Required check '${name}' has no evidence.`);
    }
  }

  return { passed: required.length > 0 && missing.length === 0 && failed.length === 0 && reasons.length === 0, required, missing, failed, reasons };
}

/** Records gate results into the session; completion is allowed only when the gate passes. */
export function recordValidationGate(
  session: DevelopmentSession,
  gate: ValidationGateReport,
  results: ValidationResult[],
): void {
  session.validation.push(...results);
  if (gate.passed) {
    session.status = "completed";
    return;
  }
  session.status = session.repairAttempts < session.maxRepairAttempts ? "repairing" : "failed";
}

export function formatAutonomousDevelopmentContext(goal: string, session?: DevelopmentSession): string {
  const lines = [
    "## WLC.IA Autonomous Development Core v0.7",
    "Operate as a controlled engineering agent. Break complex requests into dependent tasks; inspect before editing; coordinate file changes; create checkpoints before risky edits; validate with real tools; repair failures only within bounded attempts; review the final diff.",
    "Do not claim command execution, sandboxing, test success, or file changes unless tool results provide evidence. Never mark a task completed unless every required validation check has a unique passed result, exit code 0, and non-empty evidence; missing, failed, ambiguous, or unrun checks block completion.",
    "Use project-specific scripts and available tools. If execution isolation is unavailable, do not execute untrusted project code; report validation as unavailable.",
    "For multi-file changes, validate the complete batch for duplicate paths and path traversal before applying. Keep changes incremental and reversible.",
    `Current goal: ${goal}`,
  ];
  if (session) {
    lines.push(`Session: ${session.sessionId}; status: ${session.status}; repair attempts: ${session.repairAttempts}/${session.maxRepairAttempts}`);
    if (session.lessons.length) lines.push("Session lessons (temporary, not permanent model training):\n" + getSessionLessons(session));
    if (session.filesChanged.length) lines.push("Changed files:\n" + session.filesChanged.map(p => `- ${p}`).join("\n"));
  }
  return lines.join("\n");
}

/** Safe execution policy: caller must provide an isolated runner; commands are never spawned here. */
export const SAFE_VALIDATION_COMMANDS = ["test", "typecheck", "lint", "build"] as const;
export type ValidationCommand = typeof SAFE_VALIDATION_COMMANDS[number];
export function isAllowedValidationCommand(command: string): command is ValidationCommand {
  return (SAFE_VALIDATION_COMMANDS as readonly string[]).includes(command);
}
export type IsolatedRunner = (command: ValidationCommand) => Promise<ValidationResult>;
export async function runValidationSuite(commands: ValidationCommand[], runner: IsolatedRunner): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  for (const command of [...new Set(commands)]) {
    try { results.push(await runner(command)); }
    catch (e) { results.push({ kind: command, command, passed: false, summary: "Runner failed", details: String(e) }); }
  }
  return results;
}
