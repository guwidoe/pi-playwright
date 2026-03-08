import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildPlaywrightCliArgs,
  detectArtifactDir,
  detectSessionName,
  sanitizeSessionName,
} from "../skills/playwright-browser/scripts/lib/runtime.js";

test("sanitizeSessionName normalizes values", () => {
  assert.equal(sanitizeSessionName("My Repo!!!"), "my-repo");
  assert.equal(sanitizeSessionName("__A.B__"), "__a.b__");
  assert.equal(sanitizeSessionName("..."), "pi-playwright");
});

test("detectSessionName prefers PLAYWRIGHT_CLI_SESSION", () => {
  const session = detectSessionName({
    cwd: "/tmp/example",
    env: { PLAYWRIGHT_CLI_SESSION: "Custom Session" },
  });
  assert.equal(session, "custom-session");
});

test("detectSessionName falls back to cwd basename outside git", () => {
  const temp = mkdtempSync(join(tmpdir(), "pi-playwright-test-"));
  try {
    const session = detectSessionName({ cwd: temp, env: {} });
    assert.equal(session, sanitizeSessionName(temp.split("/").at(-1)));
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("detectArtifactDir creates a session-scoped temp directory", () => {
  const artifactDir = detectArtifactDir({
    cwd: "/tmp/project",
    env: { PLAYWRIGHT_CLI_SESSION: "artifact-demo" },
  });
  assert.match(artifactDir, /pi-playwright\/artifact-demo$/);
});

test("buildPlaywrightCliArgs injects implicit session only once", () => {
  const args = buildPlaywrightCliArgs(["open", "https://example.com"], {
    cwd: "/tmp/project",
    env: { PLAYWRIGHT_CLI_SESSION: "demo" },
  });
  assert.deepEqual(args, ["-s=demo", "open", "https://example.com"]);

  const explicit = buildPlaywrightCliArgs(["-s=manual", "open"], {
    cwd: "/tmp/project",
    env: { PLAYWRIGHT_CLI_SESSION: "demo" },
  });
  assert.deepEqual(explicit, ["-s=manual", "open"]);
});
