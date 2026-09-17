import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, sep } from "node:path";

import {
  buildPlaywrightCliArgs,
  detectArtifactDir,
  detectCliCommand,
  detectSessionName,
  resolveDefaultBrowserArgs,
  resolvePlaywrightCliEntry,
  runPlaywrightCli,
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
    cwd: tmpdir(),
    env: { PLAYWRIGHT_CLI_SESSION: "artifact-demo" },
  });
  assert.equal(artifactDir, join(tmpdir(), "pi-playwright", "artifact-demo"));
  assert.equal(artifactDir.endsWith(`${sep}pi-playwright${sep}artifact-demo`), true);
  assert.equal(existsSync(artifactDir), true);
});

test("buildPlaywrightCliArgs injects implicit session only once", () => {
  const args = buildPlaywrightCliArgs(["snapshot"], {
    cwd: "/tmp/project",
    env: { PLAYWRIGHT_CLI_SESSION: "demo" },
  });
  assert.deepEqual(args, ["-s=demo", "snapshot"]);

  const explicit = buildPlaywrightCliArgs(["-s=manual", "snapshot"], {
    cwd: "/tmp/project",
    env: { PLAYWRIGHT_CLI_SESSION: "demo" },
  });
  assert.deepEqual(explicit, ["-s=manual", "snapshot"]);
});

// --- CLI resolution (issues #1, #4) -----------------------------------------

test("resolvePlaywrightCliEntry resolves the CLI's own JS entry point", () => {
  const entry = resolvePlaywrightCliEntry();
  assert.equal(existsSync(entry), true, `expected CLI entry to exist at ${entry}`);
  assert.equal(basename(entry), "playwright-cli.js");
  assert.equal(entry.includes(`${sep}@playwright${sep}cli${sep}`), true);
});

test("resolvePlaywrightCliEntry throws a diagnosable error when the CLI is missing", () => {
  assert.throws(
    () =>
      resolvePlaywrightCliEntry({
        resolve() {
          const error = new Error("Cannot find module '@playwright/cli/package.json'");
          error.code = "MODULE_NOT_FOUND";
          throw error;
        },
      }),
    /@playwright\/cli/,
  );
});

// --- command detection ------------------------------------------------------

test("detectCliCommand finds the subcommand past flags and session values", () => {
  assert.equal(detectCliCommand(["open", "https://example.com"]), "open");
  assert.equal(detectCliCommand(["-s=manual", "open", "https://example.com"]), "open");
  assert.equal(detectCliCommand(["-s", "manual", "open"]), "open");
  assert.equal(detectCliCommand(["--session", "manual", "open"]), "open");
  assert.equal(detectCliCommand(["--version"]), null);
  assert.equal(detectCliCommand([]), null);
});

// --- browser default (issue #2) ---------------------------------------------

test("resolveDefaultBrowserArgs defaults open to the bundled chromium build", () => {
  assert.deepEqual(resolveDefaultBrowserArgs(["open", "https://example.com"], { env: {} }), [
    "--browser=chromium",
  ]);
});

test("resolveDefaultBrowserArgs honours PI_PLAYWRIGHT_BROWSER", () => {
  assert.deepEqual(
    resolveDefaultBrowserArgs(["open"], { env: { PI_PLAYWRIGHT_BROWSER: "msedge" } }),
    ["--browser=msedge"],
  );
});

test("resolveDefaultBrowserArgs never overrides an explicit --browser", () => {
  assert.deepEqual(resolveDefaultBrowserArgs(["open", "--browser=firefox"], { env: {} }), []);
  assert.deepEqual(resolveDefaultBrowserArgs(["open", "--browser", "firefox"], { env: {} }), []);
});

test("resolveDefaultBrowserArgs only applies to open", () => {
  assert.deepEqual(resolveDefaultBrowserArgs(["snapshot"], { env: {} }), []);
  assert.deepEqual(resolveDefaultBrowserArgs(["--version"], { env: {} }), []);
});

test("buildPlaywrightCliArgs appends the default browser for open", () => {
  const args = buildPlaywrightCliArgs(["open", "https://example.com"], {
    cwd: "/tmp/project",
    env: { PLAYWRIGHT_CLI_SESSION: "demo" },
  });
  assert.deepEqual(args, ["-s=demo", "open", "https://example.com", "--browser=chromium"]);
});

// --- failures are loud, never silent (issues #1, #4) ------------------------

test("runPlaywrightCli reports spawn errors instead of exiting silently", () => {
  const errors = [];
  const status = runPlaywrightCli(["--version"], {
    env: {},
    spawn: () => ({ status: null, signal: null, error: new Error("spawnSync EINVAL") }),
    onError: (message) => errors.push(message),
  });

  assert.equal(status, 1);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /pi-playwright/);
  assert.match(errors[0], /EINVAL/);
});

test("runPlaywrightCli reports an unresolvable CLI instead of exiting silently", () => {
  const errors = [];
  const status = runPlaywrightCli(["--version"], {
    env: {},
    resolveEntry() {
      throw new Error("@playwright/cli could not be resolved");
    },
    spawn: () => assert.fail("spawn must not run when the CLI cannot be resolved"),
    onError: (message) => errors.push(message),
  });

  assert.equal(status, 1);
  assert.match(errors[0], /@playwright\/cli/);
});

test("runPlaywrightCli executes the CLI entry with the current node binary", () => {
  const calls = [];
  const status = runPlaywrightCli(["--version"], {
    env: { PLAYWRIGHT_CLI_SESSION: "demo" },
    resolveEntry: () => "/fake/@playwright/cli/playwright-cli.js",
    spawn: (command, args, opts) => {
      calls.push({ command, args, opts });
      return { status: 0, signal: null, error: undefined };
    },
  });

  assert.equal(status, 0);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, process.execPath);
  assert.deepEqual(calls[0].args, ["/fake/@playwright/cli/playwright-cli.js", "-s=demo", "--version"]);
  assert.equal(calls[0].opts.shell, undefined, "must never re-parse agent arguments through a shell");
});
