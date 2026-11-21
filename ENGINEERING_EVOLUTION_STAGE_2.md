# WLC.IA Evolution — Engineering Stage 2

## Delivered: approved-plan production pipeline

This increment closes a prerequisite gap discovered during inspection: the database already had `agent_plans`, hash-bound approval, and atomic job creation on approval, but the application had no producer that created a valid plan from an authenticated chat request.

### Changes

- Added `src/lib/agent-plan.ts` with a versioned plan contract (`schemaVersion: 1`), bounded goal validation, deterministic canonical JSON, and SHA-256 plan hashing.
- Added the authenticated `createAgentPlan` server function. It resolves the chat through the caller's RLS-scoped client, derives `project_id` from that trusted row, and only then uses the server-only service-role client to insert a pending plan.
- Added a plan-creation interface to `src/routes/_authenticated/tasks.tsx`. Users select one of their visible chats, describe a goal, and create a plan for review. Creating a plan does not execute it.
- Added `src/test/agent-plan.test.ts` with four tests for contract shape, goal bounds, canonical serialization, and deterministic SHA-256 hashing.

### Security and compatibility

- No service-role key is sent to the browser.
- The client cannot choose `user_id` or `project_id`; these are derived server-side from the authenticated identity and RLS-visible chat.
- Plans remain `pending` until the existing hash-bound `approve_agent_plan` RPC is called by the authenticated user.
- The existing approval RPC remains responsible for atomically approving the plan and enqueueing its job.
- Existing chat execution behavior is unchanged.
- The plan contract explicitly marks `requiresApproval: true` and `mode: interactive_agent`.

### Important limitation / next dependency

This increment creates and approves durable jobs, but it does **not** activate a background worker. The existing plan approval migration explicitly states that worker execution is a separate deployment step. A worker must not blindly translate an arbitrary approved JSON plan into unrestricted tool execution. Before unattended execution, the runtime needs a strict, versioned execution contract, plan-to-tool authorization binding, checkpoint semantics, lease fencing, cancellation, and an isolated executor. The current plan producer is therefore a safe prerequisite, not a claim of autonomous background execution.

### Validation performed

- Direct Node 22 smoke test of `agent-plan.ts`: passed (plan shape, approval flag, goal validation, canonical JSON stability, SHA-256 determinism).
- Added four Vitest cases; the Vitest suite was **not run** because dependencies are not installed in the supplied archive.
- Full TypeScript check, ESLint, application build, and Supabase integration tests were **not run** for the same reason.
- No database migration was added in this increment. The existing `agent_plans` migration must already be applied in the target Supabase project.

### Operational note

Plan version is selected from the latest version for the chat before insertion. The database unique constraint on `(chat_id, version)` protects integrity; concurrent plan creation can result in one request receiving a uniqueness error and should be retried by the user. A future RPC can serialize version allocation under a row/advisory lock.
