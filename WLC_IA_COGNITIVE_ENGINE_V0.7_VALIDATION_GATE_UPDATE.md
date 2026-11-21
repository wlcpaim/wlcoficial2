# WLC.IA v0.7 — Validation Gate implementation

## Implemented
- Added an evidence-based gate requiring one or more named checks.
- A required check passes only when it has a unique result, status `passed`, exit code `0`, and non-empty evidence.
- Missing, failed, unrun, ambiguous, or evidence-free checks block completion.
- Added session integration so a failed gate leaves a session in `repairing` while retries remain, otherwise `failed`; a passing gate marks it `completed`.
- Added focused unit tests for successful validation and failure cases.

## Scope and safety
This is a deterministic policy layer. It does not execute shell commands, provide sandbox isolation, or manufacture evidence. The caller must supply genuine runner results.
