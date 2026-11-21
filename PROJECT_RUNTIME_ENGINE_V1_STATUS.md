# Project Runtime Engine V1 — status in v0.15.0 update

## Integrated in this update
- Added a typed Runtime Engine state-machine contract and project analysis entrypoint.
- Added explicit framework detection for standalone Vite, React+Vite, Next, Vue, Svelte and Node server projects.
- Preview now fails closed for non-static/framework repositories. It no longer extracts a source `index.html` and labels that as a functioning React/Vite/Next preview.
- Existing static HTML preview path remains, with its sandboxed iframe and console bridge.
- Existing publication path stores immutable static HTML releases and verifies the active release pointer. It refuses framework projects because no build provider is connected.

## Runtime infrastructure audit (source-level)
- `runtime/docker-sandbox.mjs` launches Docker with network disabled, read-only root, dropped capabilities, CPU/memory/PID limits and a workspace bind mount.
- `runtime/runner-server.mjs` exposes authenticated workspace create/exec/destroy routes, but does not upload repository files, expose preview ports, stream logs, or keep server processes alive. It is a command runner, not a preview host.
- `src/lib/environment/remote-runner-adapter.ts` adapts those endpoints; `exposePort()` deliberately throws.
- Therefore real framework build/preview cannot be claimed in this deployment. Docker/network/package installation and port proxying are missing pieces.

## Required external setup for real framework runtime
A production implementation needs a separately deployed runtime service that supports source transfer, ephemeral workspaces, dependency installation with controlled egress, build, long-lived server process, port proxy/WebSocket forwarding, resource enforcement, logs, and cleanup. This update intentionally does not run arbitrary project scripts in the WLC web process or pretend this infrastructure exists.

## Validation
Added tests cover framework classification and runtime fail-closed state behavior. Run `npm test -- --run src/test/project-runtime-engine.test.ts` and full project checks with dependencies installed.
