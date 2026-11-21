<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules (WLC.IA)
- Browser reads go through the RLS-scoped supabase client; anything touching secrets, GitHub or the agent goes through `src/lib/*.functions.ts` server functions with requireSupabaseAuth, so keys never reach the client.
- `api_connections.secret_ciphertext` has no column grant for `authenticated`; only server code with the admin client writes connection rows or reads the secret, so stored keys can't leak through the browser client.
- Agent runs use the caller's `context.supabase` (not admin) because the `acquire_agent_lock`/`release_agent_lock` RPCs rely on auth.uid().
- tsconfig has noPropertyAccessFromIndexSignature, exactOptionalPropertyTypes and noImplicitReturns off — they blocked the existing server code without adding safety here.
- Live preview renders repo HTML only inside a sandboxed iframe (srcdoc, no allow-same-origin); the server only fetches files from GitHub and never executes user code.
- Deploy pipeline verifies commit + GitHub CI and health-checks the user's own hosting URL; hosting stays with the user's provider, so rollback only switches which recorded deployment is live.
- Publishing (`/r/$slug`) serves only static releases inlined into one immutable HTML artifact, read through the anon-callable `get_published_site` security-definer RPC; projects needing a build fail honestly.
- `devstudio_schema_status()` lists the app tables by name; add any new public table to that list so Settings and the system tests keep checking its RLS.
- Every user-owned table is scoped by `user_id = auth.uid()`, and inserts that reference a project also require `owns_project(project_id)`.
- Agent runs refresh the lock heartbeat on a timer (`src/lib/agent-lock.ts`); a run without heartbeat for the stale window is treated as abandoned by both the RPC and the chat UI, so crashed workers never block a chat while live runs still do.
- Every agent run stores `metadata.completion` built only from the real tool log (`src/lib/completion-report.ts`), including failures, so no run ends silently or claims unverified success.
- Project presets (`projects.preset`, `src/lib/project-presets.ts`): non-empty presets seed a static multi-page site with admin panel (`src/lib/site-presets`, engine files imported `?raw`) only when a new repo is created; afterwards they only add agent guidance, so changing one never touches history. Output stays plain HTML/CSS/JS because publishing serves static releases only.
- The base schema was rebuilt in Lovable Cloud from the old generated types and RPC call sites because the archive held no migrations (the remix carried the tables but not the base migration file); keep new schema changes additive on top of the live schema.
- Per-repository environments live in `src/lib/environment/`: pure analyzer + state machine, and execution only through the `SandboxAdapter` interface, because the Workers server cannot run user code and providers must stay swappable.
- Without provider credentials the sandbox adapter throws `SandboxNotConfiguredError`; never simulate installs, builds, tests or preview URLs.
- The chosen sandbox provider is the user's own Docker server: `runtime/runner-server.mjs` (token auth, docker-sandbox per workspace) reached by `remote-runner-adapter.ts` via WLC_RUNNER_URL/WLC_RUNNER_TOKEN, https only.
- The chat's live status comes only from durable `agent_events` (realtime publication + polling fallback, `src/lib/run-status.ts`); a run whose newest event is not an end event while no session is alive is shown as interrupted, so returning users always see the real state.
- Agent approval goes through the `propose_plan` tool (stores a pending `agent_plans` row and ends the run); "Criar" approves it and sends a "✅ Aprovado" message that runs it in the chat, and the queued `agent_jobs` row is cancel-requested so an external worker never runs the same plan twice.
- Generated sites get an isolated per-repository database (`site_records`, `src/lib/site-db.ts`) injected as `window.wlcDb` into preview and published HTML; the public `/api/public/site-db/$site/$collection` route only lists and creates (size/count limited) so visitors can never edit or delete owner data.
- Agent runs auto-continue up to `MAX_AUTO_CYCLES` cycles of `MAX_STEPS` with a checkpoint and compacted tool outputs between cycles, so large builds finish without the user resuming manually.
- After a remix, re-check the `api_connections` column grant, the `on_auth_user_created` trigger and the realtime publication on `agent_events`, because remixed backends did not keep them before.
- Every agent tool call goes through the `OperationLedger` in `src/lib/execution-engine.ts` (anti-loop guard, error classification + recovery hints, path normalization), and the final chat status is computed by `honestStatus` from verified evidence, so the model can never loop blindly or claim unproven success.
- `.env` stays tracked in git (it holds only the publishable backend URL/key), because hosted preview builds read the VITE_ backend values from it.
- The Cognitive Chat (`/cognitive`, the "WLC.IA" menu item) is separate from the dev chat: `src/lib/cognitive/` (pure prompts/file intake + `engine.server.ts`) and `src/lib/cognitive.functions.ts`; it has no tools, so it can only explain, never build or touch repos. The old `/nexus` page is kept but no longer linked.
- Cognitive knowledge is never deleted or overwritten: corrections and model "update" relations insert a new version (`root_id`/`previous_id`) and mark the old row superseded, conflicts keep both rows flagged `conflicting`; authenticated has no DELETE grant on `cognitive_*` tables.
- Cognitive retrieval uses the `search_cognitive_knowledge` RPC (tsvector, security invoker) over the current motor plus the user's `visibility = 'global'` knowledge; there is no vector store, so semantic search is not implemented yet.
- The `/cognitive-engine/...` JSON files are generated on demand from the database by `exportMotorFiles` and downloaded as a ZIP, because the Workers server has no writable disk; the database stays the source of truth.
- File study is parsed in the browser (`extractUpload`: size/entry/ratio/path guards, DOCX/XLSX/PPTX via XML) and sent in batches; PDF, DOC and XLS are recorded as not interpretable rather than guessed.
- Dev chat modes (Chat/Planejar/Criar) are enforced server-side by `src/lib/mode-policy.ts` (own prompt + tool allowlist + per-call guard); the mode comes only from the selector (persisted in localStorage, default Chat), and a Planejar approval unlocks writes only for that run without switching mode.
- Every dev-chat exchange is appended in the background to `WLC.IA/{Chat,Planejar,Criar}.md` in the linked repo (one commit per message, `src/lib/chat-log-sync.ts`), failing silently so the chat never breaks or gets noisy.
- Official cognitive motors live in source (`src/lib/cognitive-official-catalog.ts`, mirrored to `knowledge/official/` by `scripts/export-official-knowledge.ts`); `ensureOfficialMotors` seeds them per user by slug and the agent prompt always includes them, so remixes with an empty database never lose the base knowledge.
- Cognitive motors are committed (best effort, silent on failure) to the user-chosen official repo stored in the GitHub connection's `metadata.knowledge_repo`, as `knowledge/motors/<slug>/{motor.json,README.md}` after create/learn (`src/lib/knowledge-sync*.ts`), so trained motors survive remixes as source files.
- Motor files in `knowledge/motors/*/motor.json` are auto-discovered via `import.meta.glob` (`src/lib/source-motors.ts`) and merged into the prompt catalog and `ensureOfficialMotors`, so every committed motor is used by the chat and re-seeded after remixes without a manual list.
