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

## Browser selection

`open` defaults to the bundled Chromium build that `npm run setup` installs, so it
works without a separate Google Chrome installation. Precedence:

1. an explicit `--browser=<value>` on the call
2. the `PI_PLAYWRIGHT_BROWSER` env var
3. `chromium` (bundled build)

Accepted values: `chromium`, `chrome`, `msedge`, `firefox`, `webkit`. Note that
`chromium` works but is missing from upstream `playwright-cli --help open`.

```bash
node "$SKILL_DIR/scripts/pw.js" open http://localhost:3000 --browser=msedge
PI_PLAYWRIGHT_BROWSER=msedge node "$SKILL_DIR/scripts/pw.js" open http://localhost:3000
```

Every value needs that browser present on the machine. If a call reports a browser
is not installed, install it once:

```bash
npx playwright install chromium   # the default; same as `npm run setup`
npx playwright install firefox webkit
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
