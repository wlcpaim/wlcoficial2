/**
 * WLC.IA Progress Intelligence v1
 * Progress = acceptance criteria / verified evidence — not file or tool counts.
 */

export const WLC_PROGRESS_INTELLIGENCE_VERSION = "1.0.0";

export type ProgressEvent = {
  at: string;
  kind: "requirement_done" | "bug_fixed" | "test_passed" | "feature_integrated" | "error_reduced" | "tool_call" | "file_write" | "plan_only";
  label: string;
  measurable: boolean;
};

export type ProgressAssessment = {
  score: number; // 0..1 over recent window
  falseProgress: boolean;
  message: string;
};

export class ProgressTracker {
  private events: ProgressEvent[] = [];

  track(event: Omit<ProgressEvent, "at">): void {
    this.events.push({ ...event, at: new Date().toISOString() });
    if (this.events.length > 100) this.events = this.events.slice(-80);
  }

  assess(window = 8): ProgressAssessment {
    const recent = this.events.slice(-window);
    if (recent.length < 3) {
      return { score: 0, falseProgress: false, message: "Histórico insuficiente para julgar progresso." };
    }
    const measurable = recent.filter((e) => e.measurable).length;
    const vanity = recent.filter((e) => e.kind === "tool_call" || e.kind === "file_write" || e.kind === "plan_only").length;
    const score = measurable / recent.length;
    const falseProgress = measurable === 0 && vanity >= 3;
    return {
      score,
      falseProgress,
      message: falseProgress
        ? "Falso progresso: várias ações sem requisito/teste/bug mensurável. Interromper e replanejar."
        : score >= 0.5
          ? "Progresso mensurável detectado."
          : "Progresso fraco — priorizar critérios de aceite e verificação.",
    };
  }

  formatContext(): string {
    const a = this.assess();
    return [
      `## Progress Intelligence v${WLC_PROGRESS_INTELLIGENCE_VERSION}`,
      `- recent_score: ${(a.score * 100).toFixed(0)}%`,
      `- false_progress: ${a.falseProgress ? "YES" : "no"}`,
      `- note: ${a.message}`,
      "- Métricas válidas: requisitos, bugs, testes, integração — não contagem de arquivos/ferramentas.",
    ].join("\n");
  }
}
