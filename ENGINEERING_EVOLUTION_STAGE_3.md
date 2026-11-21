# WLC.IA Evolution Stage 3 — Autonomous Runtime V1

## Delivered in this increment

- Additive Supabase migration `20261119000500_autonomous_runtime_v1.sql`.
- Separate Node worker process at `runtime/worker.mjs`.
- Generation-fenced claim, heartbeat, checkpoint and completion RPCs.
- Durable `agent_job_checkpoints` table with per-job sequence and state hash.
- Retry with bounded exponential backoff, maximum-attempt terminalization inherited from the queue schema, graceful process stop, per-job cooperative deadline and persistent event records.
- Docker-backed sandbox helper at `runtime/docker-sandbox.mjs`: no network, read-only container root, non-root UID, dropped capabilities, no-new-privileges, PID/memory/CPU limits, bounded output and timeout.
- Validation-only executor example. It demonstrates the plugin contract and checkpoints approved plan steps without performing repository mutations.
- `runtime:start` and `runtime:test` package scripts.

## Critical operational boundaries

1. This ZIP contains the worker and sandbox adapter, not a deployed worker service. It must be deployed as a separate long-running process with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
2. No production engineering executor is enabled by default. Set `WLC_EXECUTOR_MODULE` only to a reviewed executor. Without it, the worker fails closed and jobs are retried then terminalized; it does not invent actions from free-form plan text.
3. The included example executor is validation-only. It does not modify repositories or run commands.
4. Docker must be installed and the trusted image pre-pulled. The Docker helper is a building block; an executor must explicitly call it. The workspace mount is writable, so pass only a disposable, isolated workspace.
5. Apply the new Supabase migration before starting workers. Existing legacy claim now delegates to generation-incrementing claim; legacy unfenced heartbeat/finish RPCs fail closed. All workers must use the v2 APIs.
6. This worker processes one job at a time per process. Horizontal scaling is supported by atomic `FOR UPDATE SKIP LOCKED` claims and generation fencing, subject to the database migration being applied.

## Security properties

- Only approved plans are claimable.
- Worker re-fetches plan by matching user/project/chat ownership and checks SHA-256 against stored plan JSON before execution.
- Lease generation is incremented at every claim. Heartbeat, checkpoint and finish require matching worker ID and generation.
- Checkpoints are persisted transactionally only while the lease is current and cancellation has not been requested.
- Service-role credentials are read only from process environment and must never be exposed to browser code.
- Docker command arguments are passed without a shell. Network access and Linux capabilities are disabled in the container.

## Validation performed

- `node --check runtime/worker.mjs`: syntax validation.
- `node --check runtime/docker-sandbox.mjs`: syntax validation.
- `node --check runtime/example-validation-only-executor.mjs`: syntax validation.
- `npm run runtime:test`: Node built-in tests (6 total): fail-closed image validation, absolute command enforcement, argument validation, validation-only executor checkpoints, checkpoint resume, and unsupported plan rejection.
- ZIP integrity test.
- SQL migration reviewed statically. No live Supabase credentials/project were provided, so migration execution, RPC integration, RLS verification and concurrent-worker tests were not performed. `psql` and Docker are not installed in this environment; the container sandbox was not launched.
- Full app build, Vitest and ESLint were not run unless dependencies are installed in the environment; report actual results separately.

## Remaining work before production

- Deploy migration to Supabase and run integration/concurrency tests.
- Implement and security-review a domain executor that maps plan step IDs to explicit capabilities and enforces the approved scope at every mutation.
- Run the Docker sandbox against a disposable workspace in the deployment environment.
- Configure process supervision (systemd/container orchestrator), secret management, alerting and log retention.
- Add cancellation UI and operational dashboards.
\nExecutor contract note: the worker uses a cooperative deadline rather than detaching a timed-out promise. A production executor must inspect `signal.aborted` / call `assertLease()` before every external side effect. Untrusted or non-cooperative execution must be isolated in a separately supervised process/container and terminated by the deployment orchestrator.\n