# pi-playwright

Playwright browser automation skill package for [pi](https://github.com/mariozechner/pi-coding-agent).

CLI-first. Token-efficient. Built for coding agents.

## Included skill

- `playwright-browser` — browser automation via `@playwright/cli`

## Why

Pi is optimized for bash, code, and skills. This package follows that model:

- small skill surface
- local CLI execution
- project-scoped browser sessions
- minimal context overhead vs large MCP tool schemas

## Install

### Local development

```bash
cd ~/ralph-repos/pi-playwright
npm install
npm run setup
```

Use from pi without publishing:

```bash
pi install ~/ralph-repos/pi-playwright
```

### After publishing

```bash
pi install npm:pi-playwright
```

## Usage

Ask pi to use the skill naturally, or force it:

```bash
/skill:playwright-browser
```

Example prompts:

- `Use the playwright browser skill to test http://localhost:3000 login flow.`
- `Open the app in a browser, take a full-page screenshot, and inspect console errors.`
- `Use playwright-browser to fill the signup form and save auth state.`

## What the skill provides

Wrapper scripts live in `skills/playwright-browser/scripts/`:

- `pw.js` — local `playwright-cli` wrapper with auto session selection
- `artifact-dir.js` — prints a stable artifact directory for the current session
- `detect-dev-servers.js` — probes common localhost dev server URLs

Default behavior:

- session derived from current git repo or cwd
- artifacts under `/tmp/pi-playwright/<session>/`
- uses local package dependency, not global install

Override session:

```bash
PLAYWRIGHT_CLI_SESSION=my-session node skills/playwright-browser/scripts/pw.js open https://example.com
```

## Dev

```bash
npm install
npm run setup
npm test
npm run smoke
```

## Publish

```bash
npm publish
```

## License

MIT
