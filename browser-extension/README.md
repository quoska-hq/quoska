# Quoska Browser Extension

The extension is a Manifest V3 client for Quoska's existing clock services. It
requests access only to the configured Quoska origin and uses a user-approved,
PKCE-protected, revocable token. It does not inspect other websites.

The full product requirements, threat boundaries, phased roadmap, and acceptance
criteria are in [`../docs/browser-extension-plan.md`](../docs/browser-extension-plan.md).

## Build for local development

Start the local Supabase stack and Quoska application as described in the main
README. For an already-running local database, apply pending migrations first.
Then build the unpacked extension:

```bash
npx supabase migration up --local
npm run dev
```

In a second terminal:

```bash
npm run extension:build:local
```

This generates `browser-extension/dist/` with exactly one host permission:
`http://localhost:3000/*`.

Load it in Chrome:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select the generated `browser-extension/dist` directory.
5. Pin Quoska in the toolbar and open it.
6. Click **Mit Quoska verbinden**, sign in if necessary, and approve access.

The approval flow runs in the extension's background worker. Chrome may close
the toolbar popup while the approval window is open; after approval, reopen the
popup and it will load the securely stored connection automatically.

Use `edge://extensions` and the same unpacked directory to test Microsoft Edge.

## Build for production

```bash
npm run extension:build
```

The generated manifest receives only `https://quoska.de/*`. Do not submit a
localhost build to a browser store. Before packaging, update the extension
version in `src/manifest.json` and run the validation commands below.

Production authorization fails closed until the published extension ID is set
on the Quoska server. Configure one or more comma-separated IDs:

```env
BROWSER_EXTENSION_IDS=abcdefghijklmnopabcdefghijklmnop
```

Use the actual 32-character Chrome Web Store ID; the example is only the expected
format. Local development does not require this variable.

## Validation

```bash
npm run extension:build
node --check browser-extension/dist/api.js
node --check browser-extension/dist/background.js
node --check browser-extension/dist/popup.js
npm run lint
npx tsc --noEmit
npm test
npm run build
npx playwright test tests/e2e/browser-extension.spec.ts --reporter=line
```

## Manual acceptance pass

- Connect from a signed-out browser and verify login returns to the approval page.
- Verify the connection completes even when Chrome closes the toolbar popup while
  the approval window is open; reopening the popup must show the current status.
- Cancel once and verify no token is created.
- Approve and verify the popup shows the same off/running/paused state as Quoska.
- Clock in with and without a project and note.
- Start a pause; verify an early resume shows the existing 15-minute warning.
- Resume after the allowed duration and clock out.
- Change state in the web app and verify popup refresh/badge synchronization.
- Verify the toolbar keeps the original white, theme-safe logo background with a
  more legible rabbit and only a tiny green corner dot while running, an amber
  dot while paused, and no text badge.
- Disconnect and verify reopening the popup shows **Mit Quoska verbinden**.
- Open **Einstellungen → Browser-Erweiterungen**, revoke the connection, and
  verify the popup returns to its disconnected state on refresh.
- Stop the Quoska server and verify actions show a network error and create no
  queued or client-timestamped event.
- Inspect the manifest and confirm there is no all-sites, tabs, history, idle, or
  scripting permission.

## Source layout

- `src/manifest.json` — permissions, popup, worker, icon, and shortcut.
- `src/api.js` — PKCE connection, token storage, and scoped API client.
- `src/background.js` — periodic state badge refresh.
- `src/popup.*` — German popup interface.
- `../scripts/build-browser-extension.mjs` — origin-specific package builder.

`dist/` is generated and intentionally ignored by Git.
