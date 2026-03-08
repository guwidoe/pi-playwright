import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const wrapper = join(projectRoot, "skills", "playwright-browser", "scripts", "pw.js");
const artifactScript = join(projectRoot, "skills", "playwright-browser", "scripts", "artifact-dir.js");

function runNode(script, args, options = {}) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: projectRoot,
    env: { ...process.env, ...(options.env || {}) },
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(
      `Command failed: node ${script} ${args.join(" ")}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }
  return result;
}

async function startServer(rootDir) {
  const serverCode = `
    import http from "node:http";
    import { readFileSync } from "node:fs";
    import { join } from "node:path";

    const rootDir = process.argv[1];
    const server = http.createServer((req, res) => {
      if (req.url === "/") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(readFileSync(join(rootDir, "index.html")));
        return;
      }
      if (req.url === "/favicon.ico") {
        res.writeHead(204).end();
        return;
      }
      res.writeHead(404).end("not found");
    });

    server.listen(0, "127.0.0.1", () => {
      console.log(server.address().port);
    });

    process.on("SIGTERM", () => server.close(() => process.exit(0)));
    process.on("SIGINT", () => server.close(() => process.exit(0)));
  `;

  const child = spawn(process.execPath, ["--input-type=module", "-e", serverCode, rootDir], {
    stdio: ["ignore", "pipe", "inherit"],
  });

  const port = await new Promise((resolvePort, reject) => {
    let settled = false;

    child.stdout.on("data", (chunk) => {
      if (settled) return;
      const value = Number(String(chunk).trim());
      if (Number.isFinite(value) && value > 0) {
        settled = true;
        resolvePort(value);
      }
    });

    child.on("exit", (code) => {
      if (!settled) {
        settled = true;
        reject(new Error(`server exited before startup: ${code}`));
      }
    });
  });

  return {
    child,
    port,
    async close() {
      if (child.exitCode !== null) return;
      child.kill("SIGTERM");
      await new Promise((resolveClose) => child.once("exit", resolveClose));
    },
  };
}

const tempRoot = mkdtempSync(join(tmpdir(), "pi-playwright-smoke-"));
const siteDir = join(tempRoot, "site");
const artifactDir = join(tempRoot, "artifacts");
const session = "pi-playwright-smoke";

mkdirSync(siteDir, { recursive: true });
writeFileSync(
  join(siteDir, "index.html"),
  `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>pi-playwright smoke</title>
  </head>
  <body>
    <h1>Smoke Test</h1>
    <label>
      Name
      <input aria-label="Name" />
    </label>
    <button id="submit">Submit</button>
    <p id="status">waiting</p>
    <script>
      document.getElementById('submit').addEventListener('click', () => {
        const value = document.querySelector('input').value || 'missing';
        document.getElementById('status').textContent = 'submitted:' + value;
      });
    </script>
  </body>
</html>`,
);

const server = await startServer(siteDir);
const url = `http://127.0.0.1:${server.port}`;

const env = {
  PLAYWRIGHT_CLI_SESSION: session,
  PI_PLAYWRIGHT_ARTIFACTS: artifactDir,
};

try {
  const detectedArtifactDir = runNode(artifactScript, [], { env }).stdout.trim();
  assert.equal(detectedArtifactDir, artifactDir);

  runNode(wrapper, ["open", url], { env });

  const snapshotPath = join(artifactDir, "snapshot.md");
  runNode(wrapper, ["snapshot", "--filename", snapshotPath], { env });
  const snapshot = readFileSync(snapshotPath, "utf8");
  const inputMatch = snapshot.match(/textbox \"Name\" \[ref=(e\d+)\]/);
  const buttonMatch = snapshot.match(/button \"Submit\" \[ref=(e\d+)\]/);
  assert(inputMatch, "expected Name textbox ref in snapshot");
  assert(buttonMatch, "expected Submit button ref in snapshot");

  runNode(wrapper, ["fill", inputMatch[1], "Alice"], { env });
  runNode(wrapper, ["click", buttonMatch[1]], { env });

  const evalResult = runNode(wrapper, ["eval", '() => document.querySelector("#status").textContent'], { env });
  assert.match(evalResult.stdout, /submitted:Alice/);

  const screenshotPath = join(artifactDir, "page.png");
  runNode(wrapper, ["screenshot", "--filename", screenshotPath, "--full-page"], { env });
  assert.equal(existsSync(screenshotPath), true);
} finally {
  try {
    runNode(wrapper, ["close"], { env });
  } catch {
    // ignore cleanup failure
  }
  await server.close();
  rmSync(tempRoot, { recursive: true, force: true });
}

console.log("smoke test passed");
