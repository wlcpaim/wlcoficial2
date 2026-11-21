import test from "node:test";
import assert from "node:assert/strict";
import { runSandboxCommand } from "./docker-sandbox.mjs";

test("rejects missing/untrusted sandbox image before spawning Docker", async () => {
  await assert.rejects(
    runSandboxCommand({ workspace: process.cwd(), command: "/usr/bin/node", args: ["--version"], image: "" }),
    /WLC_SANDBOX_IMAGE/,
  );
});
test("rejects shell commands and relative executables", async () => {
  await assert.rejects(
    runSandboxCommand({ workspace: process.cwd(), command: "sh -c whoami", image: "node:22" }),
    /absolute executable/,
  );
});
test("rejects malformed argument arrays", async () => {
  await assert.rejects(
    runSandboxCommand({ workspace: process.cwd(), command: "/usr/bin/node", args: [null], image: "node:22" }),
    /Invalid sandbox arguments/,
  );
});
