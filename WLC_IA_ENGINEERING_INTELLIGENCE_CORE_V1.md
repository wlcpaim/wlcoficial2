# Autonomous Engineering Intelligence Core v1

## Problem
Long autonomous runs were restarting entrypoints, inventing metrics, repeating failed tool calls, and declaring success without verification.

## Solution
A **deterministic control plane** next to the LLM:

1. **Task State Machine** — valid transitions only; no COMPLETED from EXECUTING.
2. **Loop Detection** — fingerprint(tool+args+target); hard-block identical failures.
3. **Failure Intelligence** — classify error; force strategy change after repeats.
4. **Engineering Memory** — working/project/technical/failure/decision/preference with invalidation.
5. **Evidence System** — VERIFIED artifacts required for completion claims.
6. **Checkpoint Intelligence** — next_action + file signal validation on resume.
7. **Progress Intelligence** — requirements/tests > file/tool counts.

## Integration
`formatEngineeringIntelligenceContext()` is injected in `agent.server.ts` alongside Cognitive Orchestrator Pro.

## API (session)
```ts
const session = createEngineeringSession(objective, projectId);
sessionTransition(session, "UNDERSTANDING", "start");
recordToolOutcome(session, { tool, args, ok, error, target });
buildSessionCheckpoint(session, "next exact step");
evaluateSessionCompletion(session, writesClaimed);
```

## Limits
- Session objects are in-process; durable persistence remains via existing chat checkpoints / DB.
- Intelligence is policy + structure for the connected model, not offline AGI.
