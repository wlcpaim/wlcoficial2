import test from "node:test";
import assert from "node:assert/strict";
import { authorized, splitCommand } from "./runner-server.mjs";
const T = "x".repeat(40);
test("rejects missing, wrong or short tokens", () => {
  assert.equal(authorized("Bearer " + T, T), true);
  assert.equal(authorized("Bearer nope", T), false);
  assert.equal(authorized("Bearer abc", "abc"), false);
});
test("maps allowed tools and refuses shell syntax", () => {
  assert.deepEqual(splitCommand("npm ci"), { command: "/usr/local/bin/npm", args: ["ci"] });
  assert.throws(() => splitCommand("npm ci && rm -rf /"));
  assert.throws(() => splitCommand("curl x"));
});
