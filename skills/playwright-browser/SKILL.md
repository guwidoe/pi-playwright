---
name: playwright-browser
description: Browser automation with Playwright CLI. Use when testing web apps, navigating websites, filling forms, taking screenshots, checking console/network issues, saving auth state, or performing repeatable browser workflows from pi.
license: MIT
---

# Playwright Browser

Use local `@playwright/cli` through the wrapper scripts in this skill.

**Path resolution:** determine `$SKILL_DIR` from the location of this `SKILL.md`. Commands below assume that path.

## Why this skill

- CLI-first; good fit for pi
- lower context overhead than large MCP tool schemas
- stable per-project sessions
- easy to inspect, extend, and script

## Quick rules

1. Prefer the wrapper:
   ```bash
   node "$SKILL_DIR/scripts/pw.js" <command> [...args]
   ```
2. Session is automatic. Only set `PLAYWRIGHT_CLI_SESSION` or `-s=...` when you need multiple independent browser sessions.
3. Save snapshots/screenshots/PDFs to files in the artifact dir instead of dumping large outputs into context.
4. Get element refs with `snapshot` before using `click`, `fill`, `select`, `check`, etc.
5. Use `run-code` only when the standard CLI primitives are not enough.
6. Use `--headed` when the user wants to watch or debug visually; otherwise default headless is fine.

## Setup

Run once after cloning or before publishing/testing locally:

```bash
cd "$SKILL_DIR/../.." && npm install
cd "$SKILL_DIR/../.." && npm run setup
```

If Chrome is already available, `npm install` is often enough. `npm run setup` installs bundled Chromium for reliability.

## First steps for a browser task

### 1. If working against localhost, probe likely dev servers

```bash
node "$SKILL_DIR/scripts/detect-dev-servers.js"
```

If nothing useful appears, ask the user for the URL or help them start the app.

### 2. Get the artifact directory

```bash
ARTIFACT_DIR=$(node "$SKILL_DIR/scripts/artifact-dir.js")
echo "$ARTIFACT_DIR"
```

Default: `/tmp/pi-playwright/<session>/`

### 3. Open the page

```bash
node "$SKILL_DIR/scripts/pw.js" open http://localhost:3000
node "$SKILL_DIR/scripts/pw.js" open http://localhost:3000 --headed
```

## Core workflow

### Capture refs

```bash
node "$SKILL_DIR/scripts/pw.js" snapshot --filename "$ARTIFACT_DIR/snapshot.md"
```

Read the snapshot file to find refs like `e4`, `e5`.

### Interact

```bash
node "$SKILL_DIR/scripts/pw.js" fill e4 "alice@example.com"
node "$SKILL_DIR/scripts/pw.js" click e5
node "$SKILL_DIR/scripts/pw.js" press Enter
```

### Validate page state

```bash
node "$SKILL_DIR/scripts/pw.js" eval '() => document.title'
node "$SKILL_DIR/scripts/pw.js" console
node "$SKILL_DIR/scripts/pw.js" network
```

### Save artifacts

```bash
node "$SKILL_DIR/scripts/pw.js" screenshot --filename "$ARTIFACT_DIR/page.png" --full-page
node "$SKILL_DIR/scripts/pw.js" pdf --filename "$ARTIFACT_DIR/page.pdf"
```

### Save or restore auth state

```bash
node "$SKILL_DIR/scripts/pw.js" state-save "$ARTIFACT_DIR/auth.json"
node "$SKILL_DIR/scripts/pw.js" state-load "$ARTIFACT_DIR/auth.json"
```

### Close when done

```bash
node "$SKILL_DIR/scripts/pw.js" close
```

## When to use `run-code`

Use it for one-off logic that would otherwise take many CLI calls.

```bash
node "$SKILL_DIR/scripts/pw.js" run-code 'async (page) => { console.log(await page.title()); }'
```

Keep snippets short. If you need lots of custom browser logic, write a temporary script file and execute it deliberately.

## More command details

Read this reference when you need more examples or exact command patterns:

- `references/commands.md`
