import { defineConfig } from "@playwright/test";

// Default test port. Set E2E_BASE_URL to override (e.g. to reuse a server
// you started manually on :3000). Otherwise Playwright's webServer (below)
// boots an isolated server on this port with its own distDir so it never
// clashes with a dev server you're running.
const TEST_URL = process.env.E2E_BASE_URL || "http://localhost:3100";
const TEST_SERVER_COMMAND = process.env.CI
  ? "export E2E_DIST_DIR=.next-e2e STRIPE_SECRET_KEY= STRIPE_PRO_PRICE_ID= STRIPE_WEBHOOK_SECRET=; npm run build && npm run start -- -p 3100"
  : "E2E_DIST_DIR=.next-e2e STRIPE_SECRET_KEY= STRIPE_PRO_PRICE_ID= STRIPE_WEBHOOK_SECRET= npx next dev -p 3100 --turbopack";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  // Self-contained app server: Playwright starts it, waits for the port, runs
  // the suite, then tears it down. CI builds and serves the production output
  // so on-demand dev compilation cannot stall the release gate; local runs
  // keep the faster dev-server feedback loop. Billing is tested in no-keys
  // mode (open-source path) by blanking the Stripe env; the live/keys-on path
  // is covered by unit tests + the manual checkout.
  // reuseExistingServer lets you point E2E_BASE_URL at a server you own.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: TEST_SERVER_COMMAND,
        url: TEST_URL,
        timeout: 90_000,
        // A stale dev server can serve an older working tree and turn the
        // release suite into a test of the wrong build. Reuse is still
        // available explicitly through E2E_BASE_URL above.
        reuseExistingServer: false,
        stdout: "pipe",
        stderr: "pipe",
      },
  use: {
    baseURL: TEST_URL,
    trace: "on-first-retry",
    headless: true,
    // Quoska's legal day/week boundaries are German local calendar dates.
    // Keep browser-side date pickers aligned with the server and test fixtures.
    timezoneId: "Europe/Berlin",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
