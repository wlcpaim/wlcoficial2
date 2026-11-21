/** Canonical, hash-bound agent plan contract. Pure module shared by server code and tests. */
export type AgentPlanStep = {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
};

export type AgentPlanV1 = {
  schemaVersion: 1;
  kind: "wlc_engineering_plan";
  goal: string;
  constraints: string[];
  steps: AgentPlanStep[];
  execution: { mode: "interactive_agent"; requiresApproval: true };
};

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(",")}}`;
}

export function canonicalAgentPlanJson(plan: AgentPlanV1): string {
  return canonicalize(plan);
}

export async function hashAgentPlan(plan: AgentPlanV1): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalAgentPlanJson(plan));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function buildAgentPlan(goalInput: string, customSteps: string[] = []): AgentPlanV1 {
  const goal = goalInput.trim();
  if (goal.length < 8 || goal.length > 12000) throw new Error("Goal must contain between 8 and 12000 characters.");
  return {
    schemaVersion: 1,
    kind: "wlc_engineering_plan",
    goal,
    constraints: [
      "Preserve existing architecture and public behavior unless a change is explicitly approved.",
      "Inspect affected code before modifying it.",
      "Do not expose secrets or bypass authorization controls.",
      "Validate changes with available automated checks and report checks that could not run.",
      "Stop and request approval when scope or risk materially changes.",
    ],
    steps: customSteps.length ? customSteps.map((title, i) => ({ id: `step-${i + 1}`, title: title.slice(0, 240), description: title.slice(0, 1000), acceptanceCriteria: [] })) : [
      { id: "inspect", title: "Inspect project context", description: "Inspect relevant files, architecture, dependencies and existing behavior.", acceptanceCriteria: ["Affected components and risks are identified."] },
      { id: "design", title: "Design a compatible change", description: "Define a minimal implementation plan and affected files before editing.", acceptanceCriteria: ["The proposed change preserves existing contracts or documents required migrations."] },
      { id: "implement", title: "Implement incrementally", description: "Apply small, reviewable changes within the approved scope.", acceptanceCriteria: ["Changes remain within the approved goal and constraints."] },
      { id: "validate", title: "Validate and review", description: "Run relevant tests, type checks, lint and build where available; inspect the final diff.", acceptanceCriteria: ["Validation evidence and remaining limitations are reported."] },
    ],
    execution: { mode: "interactive_agent", requiresApproval: true },
  };
}

/** Message sent when the user clicks "Criar": the agent treats it as approval of this plan. */
export function approvalMessage(goal: string, steps: string[]): string {
  const list = steps.length ? `\nEtapas:\n${steps.map((t, i) => `${i + 1}. ${t}`).join("\n")}` : "";
  return `✅ Aprovado — pode criar. Execute agora o plano aprovado por completo.\nObjetivo: ${goal}${list}`;
}
