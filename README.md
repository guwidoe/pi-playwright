# pi-playwright

Playwright browser automation skill package for [pi](https://github.com/mariozechner/pi-coding-agent).

It adds the `playwright-browser` skill so pi can open pages, inspect the DOM, click, fill forms, capture screenshots, watch console/network output, and save auth state through the local `@playwright/cli`.

CLI-first. Token-efficient. Built for coding agents.

## Included skill

- `playwright-browser` — browser automation via `@playwright/cli`

## Why

This package keeps browser automation simple and inspectable:

- local CLI execution instead of a large remote tool surface
- project-scoped browser sessions
- artifact-friendly workflows for screenshots, PDFs, and snapshots
- minimal context overhead for coding agents

## Install

### Install into pi

```bash
pi install npm:pi-playwright
```

To install only for the current project:

```bash
pi install -l npm:pi-playwright
```

Pi installs the package dependencies automatically.

Install the bundled Chromium build once:

```bash
npx playwright install chromium
```

This is the browser `open` uses by default; a separate Google Chrome installation
is not required.

## Add to pi config

Global config (`~/.pi/agent/settings.json`):

```json
{
  "packages": ["pi-playwright"]
}
```

Explicit npm source:

```json
{
  "packages": ["npm:pi-playwright"]
}
```

If you want to pin a specific release, use `npm:pi-playwright@<version>`.

Project-local config (`.pi/settings.json`) works the same way.

## Usage

Ask pi to use the skill naturally, or force it explicitly:

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

- session derived from the current git repo or cwd
- artifacts stored under `/tmp/pi-playwright/<session>/`
- resolves `@playwright/cli` through Node, so nested and hoisted installs both work
- `open` uses the bundled Chromium build installed by `npx playwright install chromium`

Environment overrides:

| Variable | Effect |
| --- | --- |
| `PLAYWRIGHT_CLI_SESSION` | session name (default: git repo or cwd basename) |
| `PI_PLAYWRIGHT_ARTIFACTS` | artifact directory (default: `/tmp/pi-playwright/<session>/`) |
| `PI_PLAYWRIGHT_BROWSER` | browser for `open`: `chromium`, `chrome`, `msedge`, `firefox`, `webkit` (default: `chromium`) |

```bash
PLAYWRIGHT_CLI_SESSION=my-session node skills/playwright-browser/scripts/pw.js open https://example.com
PI_PLAYWRIGHT_BROWSER=msedge node skills/playwright-browser/scripts/pw.js open https://example.com
node skills/playwright-browser/scripts/pw.js open https://example.com --browser=firefox
```

## Contributing

Issues and pull requests are welcome.

- Repository: https://github.com/guwidoe/pi-playwright
- Issue tracker: https://github.com/guwidoe/pi-playwright/issues

Local development:

```bash
git clone https://github.com/guwidoe/pi-playwright.git
cd pi-playwright
npm install
npm run setup
npm test
npm run smoke
```

To try the local checkout with pi:

```bash
pi install .
```

See `CONTRIBUTING.md` for collaboration and local development notes.

## License

MIT
