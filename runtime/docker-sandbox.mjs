/**
 * Docker-backed command sandbox. Requires a trusted, pre-pulled image.
 * No shell is used; network, Linux capabilities and root filesystem are restricted.
 */
import { spawn } from "node:child_process";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";

const MAX_OUTPUT = 1024 * 1024;
const SAFE_IMAGE = /^[a-zA-Z0-9][a-zA-Z0-9._/:@-]{0,200}$/;

export async function runSandboxCommand({
  workspace, command, args = [], image = process.env.WLC_SANDBOX_IMAGE,
  timeoutMs = 120_000, memory = "1g", cpus = "2", pids = 128,
}) {
  if (!image || !SAFE_IMAGE.test(image)) throw new Error("WLC_SANDBOX_IMAGE must name a trusted pre-pulled image");
  if (typeof command !== "string" || !command.startsWith("/") || command.includes("\0")) {
    throw new Error("Command must be an absolute executable path inside the container");
  }
  if (!Array.isArray(args) || args.length > 128 || args.some((a) => typeof a !== "string" || a.length > 8192 || a.includes("\0"))) {
    throw new Error("Invalid sandbox arguments");
  }
  const source = await realpath(workspace);
  const info = await stat(source);
  if (!info.isDirectory()) throw new Error("Sandbox workspace must be a directory");
  const limits = { timeoutMs: Math.min(Math.max(timeoutMs, 1000), 15 * 60_000), memory, cpus, pids: Math.min(Math.max(pids, 16), 512) };
  const dockerArgs = [
    "run", "--rm", "--network=none", "--read-only", "--user=10001:10001",
    "--cap-drop=ALL", "--security-opt=no-new-privileges", `--pids-limit=${limits.pids}`,
    `--memory=${limits.memory}`, `--cpus=${limits.cpus}`,
    "--tmpfs", "/tmp:rw,noexec,nosuid,size=128m",
    "--mount", `type=bind,src=${source},dst=/workspace`,
    "--workdir", "/workspace", image, command, ...args,
  ];
  return await new Promise((resolve, reject) => {
    const child = spawn("docker", dockerArgs, { shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "", settled = false, overflow = false;
    const append = (target, chunk) => {
      const value = target + chunk.toString("utf8");
      if (value.length > MAX_OUTPUT) overflow = true;
      return value.slice(-MAX_OUTPUT);
    };
    child.stdout.on("data", (c) => { stdout = append(stdout, c); });
    child.stderr.on("data", (c) => { stderr = append(stderr, c); });
    const timer = setTimeout(() => child.kill("SIGKILL"), limits.timeoutMs);
    const finish = (fn, value) => { if (settled) return; settled = true; clearTimeout(timer); fn(value); };
    child.on("error", (e) => finish(reject, e));
    child.on("close", (code, signal) => finish(resolve, {
      exitCode: code, signal, stdout, stderr, outputTruncated: overflow,
      timedOut: signal === "SIGKILL", sandbox: "docker-network-none-readonly-root",
    }));
  });
}
