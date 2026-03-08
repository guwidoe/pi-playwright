# `playwright-browser` command notes

Use the wrapper, not global binaries:

```bash
node "$SKILL_DIR/scripts/pw.js" <command> [...args]
```

## Session behavior

The wrapper auto-adds a session unless one is already set:

- `PLAYWRIGHT_CLI_SESSION=...`
- `-s=<name>`
- `-s <name>`
- `--session <name>`

Default session name:

1. `PLAYWRIGHT_CLI_SESSION` env var
2. current git repo basename
3. current working directory basename

Artifacts default to:

```bash
/tmp/pi-playwright/<session>/
```

Print that directory with:

```bash
node "$SKILL_DIR/scripts/artifact-dir.js"
```

## Useful commands

### Open page

```bash
node "$SKILL_DIR/scripts/pw.js" open http://localhost:3000
node "$SKILL_DIR/scripts/pw.js" open http://localhost:3000 --headed
```

### Find element refs

```bash
ARTIFACT_DIR=$(node "$SKILL_DIR/scripts/artifact-dir.js")
node "$SKILL_DIR/scripts/pw.js" snapshot --filename "$ARTIFACT_DIR/snapshot.md"
```

Snapshot files contain refs like `e4`, `e5`, etc.

### Interact

```bash
node "$SKILL_DIR/scripts/pw.js" fill e4 "alice@example.com"
node "$SKILL_DIR/scripts/pw.js" click e5
node "$SKILL_DIR/scripts/pw.js" press Enter
node "$SKILL_DIR/scripts/pw.js" select e7 "admin"
node "$SKILL_DIR/scripts/pw.js" check e8
```

### Evaluate / escape hatch

```bash
node "$SKILL_DIR/scripts/pw.js" eval '() => document.title'
node "$SKILL_DIR/scripts/pw.js" run-code 'async (page) => { console.log(await page.title()); }'
```

### Capture artifacts

```bash
node "$SKILL_DIR/scripts/pw.js" screenshot --filename "$ARTIFACT_DIR/page.png" --full-page
node "$SKILL_DIR/scripts/pw.js" pdf --filename "$ARTIFACT_DIR/page.pdf"
```

### Inspect app behavior

```bash
node "$SKILL_DIR/scripts/pw.js" console
node "$SKILL_DIR/scripts/pw.js" network
```

### Auth / state

```bash
node "$SKILL_DIR/scripts/pw.js" state-save "$ARTIFACT_DIR/auth.json"
node "$SKILL_DIR/scripts/pw.js" state-load "$ARTIFACT_DIR/auth.json"
```

### Localhost probing

```bash
node "$SKILL_DIR/scripts/detect-dev-servers.js"
node "$SKILL_DIR/scripts/detect-dev-servers.js" --json
```

### Close session

```bash
node "$SKILL_DIR/scripts/pw.js" close
```
