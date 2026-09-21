# Publishing to npm from WSL

This package can be published from a WSL terminal, but npm's browser login must be completed in a Windows browser when the passkey or password manager is available there.

## Login with a passkey

Use npm's web authentication flow. Do not use the legacy flow if the npm account uses a passkey: the legacy flow expects an authenticator-app OTP.

```bash
BROWSER=true npm login --auth-type=web
```

The command prints a new `https://www.npmjs.com/login?...` URL. Keep the command running, copy that URL into a Windows browser, and complete the login with the passkey from the password manager. Return to the WSL terminal and wait for npm to finish.

If npm tries to open a browser automatically, this also works on many WSL installations:

```bash
BROWSER=explorer.exe npm login --auth-type=web
```

Do not reuse an old login URL; generate a fresh one for each attempt.

Verify the credentials were saved in WSL before publishing:

```bash
npm whoami
```

## Publish a release

Run the checks and publish the version declared in `package.json`:

```bash
npm run check
npm publish
```

If npm requests a second factor during publishing, use the method configured on the npm account. A passkey is not a six-digit OTP. For a passkey, npm prints an `https://www.npmjs.com/auth/cli/...` URL and a `https://registry.npmjs.org/-/v1/done?...` URL. Open the first URL in the Windows browser, approve the passkey, retrieve the short-lived value from the `done` URL, and rerun:

```bash
npm publish --otp=<value-from-the-done-url>
```

Do not share either URL or the short-lived value. Authenticator-app users can provide their six-digit OTP directly:

```bash
npm publish --otp=123456
```

Never commit or share the npm credentials in `~/.npmrc`, login URLs, passkeys, OTPs, or recovery codes.

## Troubleshooting

- `npm whoami` returns `E401`: the web login did not complete in the WSL terminal. Cancel the command and retry with `BROWSER=true` while keeping the terminal process running.
- The terminal asks for an OTP but the account only has a passkey: cancel the command and use `npm login --auth-type=web`, not `--auth-type=legacy`.
- `npm publish` reports that the version already exists: update `version` in `package.json`; npm does not allow republishing the same version.
