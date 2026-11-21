# WLC.IA Autonomous Development Core v0.7

## Added foundation
- Task planning with explicit dependency graph and acceptance criteria.
- Dependency readiness and graph validation (missing references/cycles).
- Multi-file batch validation: duplicate paths and traversal prevention.
- Checkpoint snapshots with isolated state copies.
- Session-scoped lessons (not permanent model training).
- Validation result ledger and bounded repair-attempt policy.
- Adapter-based test/typecheck/lint/build execution; this module does not spawn shell commands.
- Autonomous engineering context injected into the existing development agent.

## Safety and truthful status
This release does **not** provide a general-purpose sandbox or arbitrary shell executor. A host must implement `IsolatedRunner` using a real isolation environment before code execution is enabled. The agent must not claim tests/builds ran without adapter evidence. External deployments, destructive actions, credential changes and production migrations require explicit authorization.

## Lifecycle
1. Plan task graph and criteria.
2. Inspect repository context.
3. Create checkpoint before impactful edits.
4. Validate file batch before applying.
5. Implement task-by-task and track changed paths.
6. Run configured isolated validations.
7. Record failures, lessons and bounded repair attempts.
8. Review final diff and deliver evidence.

## Tests
`src/test/wlc-autonomous-development-core.test.ts` covers task graph, dependency gating, path safety, checkpoint snapshots and bounded session repair.
