# WLC.IA Evolution — Engineering Stage 1

## Scope delivered

This increment hardens the existing agent event/telemetry lifecycle without changing the existing agent execution model, database schema, tool permissions, or user approval flow.

### Problem addressed

`src/lib/agent.server.ts` persisted tool events with `void persistAgentEvent(...)`. The request could finish before those writes settled, so events could be missing from the durable timeline during normal completion or error/paused exits.

### Changes

- Added `src/lib/async-drain-queue.ts`, a small dependency-free queue that tracks asynchronous work and exposes `drain()`.
- Integrated the queue into `src/lib/agent.server.ts` for tool-event persistence.
- The request now drains outstanding tool-event writes before its normal return and also in `finally`, covering normal, paused, and exceptional exits.
- Telemetry failures remain non-fatal to engineering operations and continue to be logged; this preserves the existing availability policy.
- Added focused unit tests in `src/test/async-drain-queue.test.ts` for waiting, failure containment, and work enqueued while draining.

## Compatibility and security

- Additive TypeScript module; no database migration required.
- No changes to Supabase RLS, service-role boundaries, GitHub permissions, file-write authorization, or plan approvals.
- Existing event payloads and event table are unchanged.
- Tool execution does not wait on each telemetry write individually; the queue is drained at request boundaries.

## Validation performed

- TypeScript strict check of the new dependency-free module: passed.
- Node smoke test exercising nested enqueue and drain: passed.
- Full Vitest suite, application build, and ESLint were not run because dependencies were not present in the supplied archive and `npm install --ignore-scripts --no-package-lock --no-audit --no-fund` exceeded the available execution window.

## Remaining limitations

- A process crash or forced termination can still interrupt in-flight HTTP/database writes. Durable delivery across process death requires an outbox or database-native event transaction, not only an in-memory drain queue.
- The durable `agent_jobs` tables and RPCs are not a running worker by themselves. A separately deployed worker process and operational deployment configuration are still required for unattended background execution.
- This increment does not claim that the complete autonomous runtime, sandbox, or adaptive learning loop is implemented.

## Next recommended increment

Implement a server-only worker service that claims approved jobs, renews leases, loads the approved plan/checkpoint, executes only registered safe handlers, records progress, and finishes/retries with worker fencing. Deploy it separately from the web request lifecycle and test crash recovery against a real Supabase test project.
