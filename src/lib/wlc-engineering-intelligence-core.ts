/**
 * WLC.IA Autonomous Engineering Intelligence Core v1
 * Facade that composes task state machine, loop detection, failure intelligence,
 * engineering memory, evidence gate, checkpoint + progress into one session object
 * and prompt context for the connected model.
 *
 * Deterministic control plane — does not replace the LLM; constrains and informs it.
 */

import {
  createTaskRuntime,
  formatTaskStateMachineContext,
  transitionTask,
  type TaskRuntime,
  type TaskLifecycleState,
} from "./wlc-task-state-machine";
import { LoopDetector, fingerprintAction, formatLoopDetectionContext, type LoopVerdict } from "./wlc-loop-detection";
import { FailureMemory, analyzeFailure, type FailureRecord } from "./wlc-failure-intelligence";
import { EngineeringMemory } from "./wlc-engineering-memory";
import { EvidenceLedger, type CompletionGate } from "./wlc-evidence-system";
import { createCheckpoint, formatCheckpointResume, validateCheckpoint, type CheckpointPayload } from "./wlc-checkpoint-intelligence";
import { ProgressTracker } from "./wlc-progress-intelligence";
import { assessProRequest, formatProCognitiveContext, type ProCognitiveDecision } from "./wlc-cognitive-orchestrator-pro";

export const WLC_ENGINEERING_INTELLIGENCE_CORE_VERSION = "1.0.0";

export type EngineeringSession = {
  task: TaskRuntime;
  loops: LoopDetector;
  failures: FailureMemory;
  memory: EngineeringMemory;
  evidence: EvidenceLedger;
  progress: ProgressTracker;
  lastCheckpoint?: CheckpointPayload;
  proDecision?: ProCognitiveDecision;
};

export function createEngineeringSession(objective: string, projectId?: string): EngineeringSession {
  return {
    task: createTaskRuntime(objective, projectId),
    loops: new LoopDetector(),
    failures: new FailureMemory(),
    memory: new EngineeringMemory(),
    evidence: new EvidenceLedger(),
    progress: new ProgressTracker(),
  };
}

export function sessionTransition(
  session: EngineeringSession,
  to: TaskLifecycleState,
  reason: string,
): { ok: true } | { ok: false; error: string } {
  const result = transitionTask(session.task, to, reason);
  if (!result.ok) return result;
  session.task = result.runtime;
  return { ok: true };
}

export function recordToolOutcome(
  session: EngineeringSession,
  input: {
    tool: string;
    args?: Record<string, unknown>;
    ok: boolean;
    error?: string;
    target?: string;
    progressScore?: number;
  },
): { verdict: LoopVerdict; failure?: FailureRecord } {
  const fp = fingerprintAction(input.tool, input.args ?? {}, {
    taskId: session.task.taskId,
    target: input.target,
  });
  const verdict = session.loops.record(fp, {
    ok: input.ok,
    error: input.error,
    progressScore: input.progressScore,
  });

  session.progress.track({
    kind: input.ok ? (input.tool.includes("write") ? "file_write" : "tool_call") : "tool_call",
    label: `${input.tool}${input.target ? `:${input.target}` : ""}`,
    measurable: (input.progressScore ?? 0) > 0 && input.ok,
  });

  let failure: FailureRecord | undefined;
  if (!input.ok && input.error) {
    failure = analyzeFailure({
      message: input.error,
      tool: input.tool,
      step: session.task.currentStep,
      priorSameCount: verdict.kind === "hard_block" ? verdict.count : 0,
    });
    session.failures.remember(failure);
    session.memory.upsert({
      layer: "failure",
      key: `${failure.category}:${input.tool}`,
      value: failure.suggestedStrategy,
      source: "failure-intelligence",
      confidence: "medium",
      evidence: failure.message.slice(0, 120),
      projectId: session.task.projectId,
    });
    session.task.failedSteps = [...session.task.failedSteps, input.tool];
  }

  return { verdict, failure };
}

export function buildSessionCheckpoint(session: EngineeringSession, nextAction: string): CheckpointPayload {
  const gate = session.evidence.evaluateCompletion({ writesClaimed: 0 });
  const cp = createCheckpoint({
    projectId: session.task.projectId,
    objective: session.task.objective,
    planSummary: session.task.completedSteps.slice(-5),
    completedTasks: session.task.completedSteps,
    pendingTasks: session.task.currentStep ? [session.task.currentStep] : [],
    failures: session.task.failedSteps.slice(-5),
    decisions: session.memory.query("decision").map((m) => m.value).slice(-5),
    evidenceSummary: gate.evidence.slice(-5).map((e) => `${e.status}:${e.label}`),
    nextAction,
    blockers: gate.blockers,
  });
  session.lastCheckpoint = cp;
  session.memory.upsert({
    layer: "working",
    key: "last_checkpoint",
    value: cp.id,
    source: "checkpoint-intelligence",
    confidence: "high",
    projectId: session.task.projectId,
  });
  return cp;
}

export function evaluateSessionCompletion(session: EngineeringSession, writesClaimed: number): CompletionGate {
  return session.evidence.evaluateCompletion({
    requiresTests: /test|pdv|financeiro|auth/i.test(session.task.objective),
    requiresBuild: /implement|criar|desenvolv|build/i.test(session.task.objective),
    writesClaimed,
  });
}

/**
 * Full deterministic context block for system prompt injection.
 */
export function formatEngineeringIntelligenceContext(
  objective: string,
  history: Array<{ role: string; content: string }> = [],
  session?: EngineeringSession,
): string {
  const pro = assessProRequest(objective, history);
  const parts: string[] = [
    `## Autonomous Engineering Intelligence Core v${WLC_ENGINEERING_INTELLIGENCE_CORE_VERSION}`,
    "Camada de controle determinística: estado, loops, falhas, evidências, progresso e checkpoint.",
    "O modelo conectado interpreta semanticamente; este núcleo valida, bloqueia loops e exige evidência.",
    formatProCognitiveContext(pro),
  ];

  if (session) {
    session.proDecision = pro;
    parts.push(formatTaskStateMachineContext(session.task));
    parts.push(formatLoopDetectionContext(session.loops));
    parts.push(session.failures.formatContext());
    parts.push(session.memory.formatContext());
    parts.push(session.evidence.formatContext());
    parts.push(session.progress.formatContext());
    if (session.lastCheckpoint) {
      parts.push(formatCheckpointResume(session.lastCheckpoint));
    }
  } else {
    parts.push(
      "### Política de sessão (sem runtime still attached)",
      "- Criar plano mínimo com dependências antes de EXECUTING.",
      "- Não repetir ferramenta+args após falha idêntica.",
      "- Não declarar build/teste sem evidência VERIFIED.",
      "- Medir progresso por requisitos/testes, não por volume de arquivos.",
      "- Preferir checkpoint + next_action a reinício do projeto.",
    );
  }

  return parts.filter(Boolean).join("\n\n");
}

/** Lightweight adaptive planner for complex goals (not a giant static plan). */
export function buildAdaptivePlan(objective: string): string[] {
  const q = objective.toLowerCase();
  const steps = [
    "UNDERSTANDING: esclarecer objetivo, restrições e critérios de aceite.",
    "ANALYZING: inspecionar repositório/stack e estado real (não assumir).",
  ];
  if (/pdv|estoque|venda|caixa|financeiro/.test(q)) {
    steps.push("PLANNING: priorizar saleService atômico, estoque, caixa e dashboard real.");
    steps.push("EXECUTING: implementar módulo a módulo sem reescrever App por ciclo.");
    steps.push("VERIFYING: typecheck + testes de cálculo/venda/estoque.");
  } else if (/bug|erro|corrigir|debug/.test(q)) {
    steps.push("PLANNING: reproduzir falha e isolar causa raiz.");
    steps.push("EXECUTING: correção mínima + regressão.");
    steps.push("VERIFYING: reexecutar cenário que falhou.");
  } else if (/criar|implement|desenvolv|feature/.test(q)) {
    steps.push("PLANNING: subtarefas por dependência; escopo mínimo entregável.");
    steps.push("EXECUTING: mudanças incrementais revisáveis.");
    steps.push("VERIFYING: build/typecheck e testes direcionados ao impacto.");
  } else {
    steps.push("PLANNING: escolher menor caminho útil.");
    steps.push("EXECUTING: ação autorizada de baixo risco.");
    steps.push("VERIFYING: validar resultado contra o pedido.");
  }
  steps.push("REVIEWING: revisão independente de correção/segurança/regressão.");
  steps.push("CHECKPOINT: gravar evidências, pending e next_action única.");
  return steps;
}
