import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "../../../../");
const require = createRequire(import.meta.url);

const DEFAULT_BROWSER = "chromium";

export function getPackageRoot() {
  return packageRoot;
}

/**
 * Resolve the Playwright CLI's own JS entry point through Node's resolver.
 *
 * Node walks up to every parent `node_modules`, so this works whether the
 * dependency is nested inside this package or hoisted next to it (which is what
 * `pi install` and npm produce). Resolving the `.js` entry rather than the
 * `node_modules/.bin` shim also avoids Windows `.cmd` shims, which Node refuses
 * to spawn without `shell: true`.
 *
 * `resolve` is injectable so the failure path can be tested.
 */
export function resolvePlaywrightCliEntry({ resolve: resolver = require.resolve } = {}) {
  let manifestPath;
  try {
    manifestPath = resolver("@playwright/cli/package.json");
  } catch (error) {
    throw new Error(
      `@playwright/cli could not be resolved from ${__dirname}. ` +
        `Reinstall the pi-playwright package (npm install / pi install npm:pi-playwright). ` +
        `Underlying error: ${error.message}`,
    );
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const bin = typeof manifest.bin === "string" ? manifest.bin : manifest.bin?.["playwright-cli"];
  if (!bin) {
    throw new Error(`@playwright/cli at ${manifestPath} declares no "playwright-cli" bin entry.`);
  }

  return join(dirname(manifestPath), bin);
}

export function resolveGitRoot(cwd = process.cwd()) {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

export function sanitizeSessionName(value) {
  const session = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return session || "pi-playwright";
}

export function detectSessionName({ cwd = process.cwd(), env = process.env } = {}) {
  if (env.PLAYWRIGHT_CLI_SESSION) {
    return sanitizeSessionName(env.PLAYWRIGHT_CLI_SESSION);
  }

  const gitRoot = resolveGitRoot(cwd);
  if (gitRoot) {
    return sanitizeSessionName(basename(gitRoot));
  }

  return sanitizeSessionName(basename(cwd));
}

export function detectArtifactDir({ cwd = process.cwd(), env = process.env } = {}) {
  const session = detectSessionName({ cwd, env });
  const explicit = env.PI_PLAYWRIGHT_ARTIFACTS;
  const dir = explicit ? resolve(cwd, explicit) : join(tmpdir(), "pi-playwright", session);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function hasExplicitSessionArg(args) {
  return args.some((arg, index) => {
    if (arg.startsWith("-s=")) return true;
    if (arg === "-s" || arg === "--session") return true;
    if (index > 0 && args[index - 1] === "-s") return true;
    if (index > 0 && args[index - 1] === "--session") return true;
    return false;
  });
}

/** First positional token, skipping flags and the value of a spaced `-s`/`--session`. */
export function detectCliCommand(args) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg.startsWith("-")) continue;
    const previous = args[index - 1];
    if (previous === "-s" || previous === "--session") continue;
    return arg;
  }
  return null;
}

/**
 * `playwright-cli open` defaults to the `chrome` *channel*, so it fails on any
 * machine without Google Chrome installed -- including machines where this
 * package's own `npm run setup` has installed the bundled Chromium build.
 * Default to that bundled build instead, overridable via PI_PLAYWRIGHT_BROWSER.
 */
export function resolveDefaultBrowserArgs(args, { env = process.env } = {}) {
  if (detectCliCommand(args) !== "open") return [];
  if (args.some((arg) => arg === "--browser" || arg.startsWith("--browser="))) return [];
  return [`--browser=${env.PI_PLAYWRIGHT_BROWSER || DEFAULT_BROWSER}`];
}

export function buildPlaywrightCliArgs(args, options = {}) {
  const withSession = hasExplicitSessionArg(args)
    ? [...args]
    : [`-s=${detectSessionName(options)}`, ...args];
  return [...withSession, ...resolveDefaultBrowserArgs(args, options)];
}

export function runPlaywrightCli(args, options = {}) {
  const {
    spawn = spawnSync,
    resolveEntry = resolvePlaywrightCliEntry,
    onError = (message) => console.error(message),
  } = options;

  let entry;
  try {
    entry = resolveEntry();
  } catch (error) {
    onError(`pi-playwright: ${error.message}`);
    return 1;
  }

  const finalArgs = buildPlaywrightCliArgs(args, options);
  // Spawn the CLI's JS entry with this same Node binary: identical on every
  // platform, and no shell to re-parse agent-supplied selectors, URLs or JS.
  const result = spawn(process.execPath, [entry, ...finalArgs], {
    cwd: options.cwd || process.cwd(),
    env: { ...process.env, ...(options.env || {}) },
    stdio: "inherit",
  });

  if (result.error) {
    onError(`pi-playwright: failed to launch ${entry}: ${result.error.message}`);
    return 1;
  }
  if (typeof result.status === "number") {
    return result.status;
  }
  if (result.signal) {
    onError(`pi-playwright: Playwright CLI terminated by signal ${result.signal}.`);
  }
  return 1;
}
