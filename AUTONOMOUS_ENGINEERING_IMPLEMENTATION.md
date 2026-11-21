# WLC.IA — Autonomous Engineering foundation

## Included in this change

- Adds durable tables for versioned plans, approval state, queued jobs and append-only execution events.
- Adds indexes for job claiming and chronological event retrieval.
- Enables RLS and exposes read-only access to a user's own plan/job/event records.
- Adds `claim_agent_job`, a `SECURITY DEFINER` RPC restricted to `service_role`; it claims approved-plan jobs with `FOR UPDATE SKIP LOCKED` and can reclaim stale workers.
- Emits persisted lifecycle, tool-operation and checkpoint events from the existing agent runtime. Event telemetry failures are logged and do not silently claim successful persistence.

## Reliability hardening follow-up

The additive migration `20261119000200_autonomous_reliability.sql` strengthens job ownership consistency, stale-worker recovery (including NULL heartbeats), exhausted-attempt handling, and worker lease fencing through `heartbeat_agent_job` and `finish_agent_job`. The agent runtime also validates write/delete paths, blocks direct changes to sensitive configuration/dependency/migration paths, validates branch names, caps individual file writes, and reports failed post-write verification honestly. Log scrubbing now redacts secrets in free-text values and Error stacks.

See `WLC_IA_HARDENING_V1.md` for exact scope, deployment order, and remaining work.

## Important implementation boundary

This is an infrastructure foundation, not a claim that all five phases are production-complete. The existing synchronous `runAgent` still has its 48-step per-invocation guard and still returns a paused checkpoint at that boundary. The new SQL lease functions are worker primitives, not a worker process. A deployed worker/queue consumer must still be implemented and operated to drain `agent_jobs`; merely creating the queue and claim/heartbeat/finalize RPCs does not run background work.

Likewise, the current chat UI has not yet been wired to subscribe to `agent_events`, and the plan/approval lifecycle has not yet been connected to the chat composer and GitHub write-tool authorization. Until that integration is completed, do not describe approval-before-write, automatic background continuation, or live UI streaming as enabled. The database structures are deliberately additive so existing chats and agent flows remain intact while the remaining pieces are integrated.

## Deployment order

1. Back up the Supabase database.
2. Apply `supabase/migrations/20261119000100_autonomous_engineering.sql` and then `supabase/migrations/20261119000200_autonomous_reliability.sql`.
3. Deploy the application build containing the event writer and runtime hardening.
4. Before enabling the queue, deploy a trusted server-side worker that calls `claim_agent_job` using the service role, validates the approved plan and ownership, heartbeats, and marks jobs completed/retry_wait/failed transactionally.
5. Wire plan creation/approval UI and enforce approval inside every mutating tool on the server.
6. Subscribe the chat UI to `agent_events` filtered by the authenticated user's chat, with polling fallback and reconnect handling.
7. Run authorization, stale-worker, duplicate-claim, crash-recovery, and end-to-end tests.

The service-role key must never be exposed to the browser. Do not grant `claim_agent_job` to `authenticated` or `anon`.
