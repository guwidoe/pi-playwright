import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "../../../../");

export function getPackageRoot() {
  return packageRoot;
}

export function resolvePlaywrightCliBin() {
  const platformBin = process.platform === "win32" ? "playwright-cli.cmd" : "playwright-cli";
  return join(packageRoot, "node_modules", ".bin", platformBin);
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

export function buildPlaywrightCliArgs(args, options = {}) {
  const session = detectSessionName(options);
  if (hasExplicitSessionArg(args)) {
    return [...args];
  }
  return [`-s=${session}`, ...args];
}

export function runPlaywrightCli(args, options = {}) {
  const bin = resolvePlaywrightCliBin();
  const finalArgs = buildPlaywrightCliArgs(args, options);
  const result = spawnSync(bin, finalArgs, {
    cwd: options.cwd || process.cwd(),
    env: { ...process.env, ...(options.env || {}) },
    stdio: "inherit",
  });

  if (typeof result.status === "number") {
    return result.status;
  }
  return 1;
}
