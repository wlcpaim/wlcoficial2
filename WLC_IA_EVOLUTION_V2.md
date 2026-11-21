# WLC.IA Evolution V2 — Operational observability

## Scope delivered in this package

- Chat UI queries persisted `agent_events` for the current chat.
- Chat UI subscribes to Supabase Realtime INSERT events and invalidates the event query when a new event arrives.
- Polling every five seconds remains active while an execution is busy or realtime is disconnected; a slower refresh remains active as a recovery fallback while the chat is open.
- The timeline displays event title, time, tool name, file path and commit SHA when those fields exist. It does not render arbitrary event JSON.
- Agent event writes now use the server-only service-role client. The authenticated request client cannot insert into `agent_events` because the table intentionally has read-only user RLS policies. The user and ownership fields are sourced from the authenticated execution and verified chat record.
- A new migration adds `agent_events` to the `supabase_realtime` publication when that publication exists and the table is not already present.

## Security boundary

The service-role client is imported dynamically only from `agent.server.ts`, which is server-side code. It must never be imported by browser routes or client components. Browser reads remain protected by the existing `user_id = auth.uid()` SELECT policy. No authenticated INSERT, UPDATE or DELETE policy is added.

## Deployment

1. Back up the Supabase database.
2. Apply migrations in order, including `20261119000300_agent_events_realtime.sql`.
3. Deploy the application bundle from this package.
4. Confirm that a chat execution creates rows in `agent_events`.
5. Confirm that the signed-in user can read only their own events.
6. Confirm that the chat timeline updates with Realtime enabled.
7. Temporarily disable Realtime and confirm polling still refreshes the timeline.

## Explicitly not included

- No durable queue worker is started by this package.
- The 48-step per-invocation guard remains unchanged.
- Plan creation and approval are not yet enforced before every mutating GitHub tool.
- This package does not provide isolated code execution, build/test sandboxing, or automatic deployment.

## Validation status

Static source checks and archive integrity checks are performed during packaging. Runtime tests, TypeScript compilation, lint and production build require installing the repository dependencies and connecting a development Supabase project; they must be run before production deployment.
