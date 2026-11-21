/**
 * Example safe-by-default executor contract.
 * It validates the approved plan and checkpoints progress, but performs no
 * repository mutations. Replace with a reviewed domain executor that maps
 * approved step IDs to explicit allowlisted operations.
 */
export async function executeApprovedJob({ plan, checkpoint, saveCheckpoint, assertLease }) {
  if (plan.plan.kind !== "wlc_engineering_plan" || plan.plan.schemaVersion !== 1) {
    throw new Error("Unsupported plan schema");
  }
  const steps = plan.plan.steps;
  const lastSequence = Number(checkpoint?.sequence ?? 0);
  for (let index = lastSequence; index < steps.length; index += 1) {
    assertLease();
    const step = steps[index];
    if (!step?.id || !step?.title || !Array.isArray(step.acceptanceCriteria)) {
      throw new Error(`Invalid approved step at index ${index}`);
    }
    await saveCheckpoint({
      sequence: index + 1,
      stepId: step.id,
      state: { completedValidationOnly: true, title: step.title },
    });
  }
  return { mode: "validation-only", stepsInspected: steps.length, mutationsPerformed: 0 };
}
