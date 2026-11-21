# WLC.IA v0.7 — Autonomous Development Core

- Introduced `wlc-autonomous-development-core.ts`.
- Added task graph and dependency validation, acceptance criteria, file batch/path safety, checkpoint snapshots, session-only lessons, bounded repair state and validation result tracking.
- Added an adapter interface for isolated validation. No unsafe shell execution or sandbox claims are included.
- Injected autonomous engineering protocol into the existing development agent's cognitive context.
- Added focused tests.
- Existing providers, database schema, auth and integrations were not changed.
