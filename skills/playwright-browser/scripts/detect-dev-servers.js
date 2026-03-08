#!/usr/bin/env node

const DEFAULT_PORTS = [
  3000, 3001, 3002, 4173, 4174, 4321, 5000, 5173, 5174, 5500, 8000, 8080,
  8787, 9000,
];

const timeoutMs = Number(process.env.PI_PLAYWRIGHT_PROBE_TIMEOUT_MS || 400);
const ports = (process.env.PI_PLAYWRIGHT_PORTS || "")
  .split(",")
  .map((value) => Number(value.trim()))
  .filter(Boolean);
const candidates = ports.length > 0 ? ports : DEFAULT_PORTS;

async function probe(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "manual",
      headers: { "user-agent": "pi-playwright" },
    });

    const contentType = response.headers.get("content-type") || "";
    let title = "";

    try {
      const text = await response.text();
      const match = text.match(/<title[^>]*>(.*?)<\/title>/is);
      title = match?.[1]?.replace(/\s+/g, " ")?.trim() || "";
    } catch {
      // ignore body read errors
    }

    return {
      url,
      status: response.status,
      ok: response.ok,
      contentType,
      title,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const results = (await Promise.all(candidates.map((port) => probe(`http://127.0.0.1:${port}`))))
  .filter(Boolean)
  .sort((a, b) => a.url.localeCompare(b.url));

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

if (results.length === 0) {
  console.log("No common localhost dev servers detected.");
  process.exit(0);
}

for (const result of results) {
  const title = result.title ? ` title=${JSON.stringify(result.title)}` : "";
  const contentType = result.contentType ? ` content-type=${result.contentType}` : "";
  console.log(`${result.url} status=${result.status}${contentType}${title}`);
}
