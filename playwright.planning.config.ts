import { defineConfig } from "@playwright/test";

// Separate from the authenticated production E2E suite: these routes are dev-only.
export default defineConfig({
  testDir: "./tests/e2e/planning-preview",
  workers: 1,
  timeout: 30_000,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://127.0.0.1:3110",
    browserName: "chromium",
    timezoneId: "Europe/Berlin",
    trace: "retain-on-failure",
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command:
          "E2E_DIST_DIR=.next-planning NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=preview-anon-key SUPABASE_SERVICE_ROLE_KEY=preview-service-key NEXT_PUBLIC_APP_URL=http://127.0.0.1:3110 npx next dev --hostname 127.0.0.1 --port 3110",
        url: "http://127.0.0.1:3110/preview/dienstplanung",
        timeout: 90_000,
        reuseExistingServer: false,
      },
});
