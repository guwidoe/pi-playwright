import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Build the layout a real install actually produces: the *packed* package (no
 * node_modules of its own -- see `files` in package.json) sitting in a
 * node_modules tree with @playwright/cli hoisted beside it rather than nested
 * inside it. This is the layout `pi install npm:pi-playwright` creates, and the
 * one in which the wrapper used to exit 1 with no output at all.
 */
function createHoistedInstall() {
  const root = mkdtempSync(join(tmpdir(), "pi-playwright-pack-"));
  const nodeModules = join(root, "node_modules");
  mkdirSync(nodeModules, { recursive: true });

  // `npm` is a .cmd shim on Windows, so it needs a shell there. Every argument
  // below is a literal -- no path is passed through the shell, which is exactly
  // the property the production code must also keep.
  const isWindows = process.platform === "win32";
  const pack = spawnSync(isWindows ? "npm.cmd" : "npm", ["pack", "--silent"], {
    cwd: projectRoot,
    encoding: "utf8",
    shell: isWindows,
  });
  assert.equal(pack.status, 0, `npm pack failed: ${pack.stderr}`);
  const tarballName = pack.stdout.trim().split("\n").at(-1).trim();
  // Copy rather than rename: the temp dir can be on a different drive to the
  // checkout (D: vs C: on Windows runners), and rename fails with EXDEV.
  const packedTarball = join(projectRoot, tarballName);
  const tarball = join(root, tarballName);
  cpSync(packedTarball, tarball);
  rmSync(packedTarball, { force: true });

  const packageDir = join(nodeModules, "pi-playwright");
  mkdirSync(packageDir, { recursive: true });
  const untar = spawnSync("tar", ["-xzf", tarball, "-C", packageDir, "--strip-components=1"], {
    encoding: "utf8",
  });
  assert.equal(untar.status, 0, `tar failed: ${untar.stderr}`);

  // Hoisted beside the package, never nested inside it.
  for (const dep of readdirSync(join(projectRoot, "node_modules"))) {
    if (dep === "pi-playwright" || dep === ".bin") continue;
    cpSync(join(projectRoot, "node_modules", dep), join(nodeModules, dep), { recursive: true });
  }

  return { root, wrapper: join(packageDir, "skills", "playwright-browser", "scripts", "pw.js") };
}

test("the packed package runs the CLI when dependencies are hoisted", () => {
  const { root, wrapper } = createHoistedInstall();
  try {
    const result = spawnSync(process.execPath, [wrapper, "--version"], {
      cwd: root,
      encoding: "utf8",
    });

    assert.equal(
      result.status,
      0,
      `wrapper exited ${result.status}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
    );
    assert.match(result.stdout, /\d+\.\d+\.\d+/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a missing @playwright/cli fails loudly rather than silently", () => {
  const { root, wrapper } = createHoistedInstall();
  try {
    rmSync(join(root, "node_modules", "@playwright"), { recursive: true, force: true });

    const result = spawnSync(process.execPath, [wrapper, "--version"], {
      cwd: root,
      encoding: "utf8",
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /pi-playwright/);
    assert.match(result.stderr, /@playwright\/cli/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
