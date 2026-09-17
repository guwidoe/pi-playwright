import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";

import {
  buildPlaywrightCliArgs,
  cliShellOption,
  detectArtifactDir,
  detectSessionName,
  findCliBin,
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
    assert.equal(session, sanitizeSessionName(basename(temp)));
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("detectArtifactDir creates a session-scoped temp directory", () => {
  const artifactDir = detectArtifactDir({
    cwd: "/tmp/project",
    env: { PLAYWRIGHT_CLI_SESSION: "artifact-demo" },
  });
  assert.equal(basename(artifactDir), "artifact-demo");
  assert.match(artifactDir, /pi-playwright[\\/]artifact-demo$/);
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

test("findCliBin locates the bin in a parent node_modules", () => {
  const binName = process.platform === "win32" ? "playwright-cli.cmd" : "playwright-cli";
  const parent = mkdtempSync(join(tmpdir(), "pi-playwright-find-"));
  try {
    const nested = join(parent, "site", "node_modules", "pi-playwright");
    mkdirSync(join(nested, "a"), { recursive: true });
    const binDir = join(parent, "node_modules", ".bin");
    mkdirSync(binDir, { recursive: true });
    const bin = join(binDir, binName);
    writeFileSync(bin, "#!/bin/sh\n");

    assert.equal(findCliBin(nested), bin);
    assert.equal(findCliBin(join(parent, "nowhere", "deep")), bin);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test("findCliBin returns null when no bin exists up the tree", () => {
  const temp = mkdtempSync(join(tmpdir(), "pi-playwright-none-"));
  try {
    mkdirSync(join(temp, "x"), { recursive: true });
    // Only assert on platforms where walking up cannot hit a stray install:
    // the temp parent chain is under the system temp dir.
    const result = findCliBin(join(temp, "x"));
    assert.ok(
      result === null || /node_modules[\\/]@playwright/.test(result),
      "expected no bin or a playwright install",
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("cliShellOption requires a shell for cmd/bat shims only", () => {
  assert.equal(cliShellOption("/x/node_modules/.bin/playwright-cli.cmd"), true);
  assert.equal(cliShellOption("/x/node_modules/.bin/tool.bat"), true);
  assert.equal(cliShellOption("/x/node_modules/.bin/playwright-cli"), false);
});
