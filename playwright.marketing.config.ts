import { defineConfig } from "@playwright/test";

const BASE_URL = "http://localhost:3101";

/**
 * Reproducible product screenshots used by the public marketing pages.
 * This stays separate from the release suite because it intentionally writes
 * image assets into public/product.
 */
export default defineConfig({
  testDir: "./scripts/marketing-screenshots",
  testMatch: /.*\.screenshot\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  timeout: 60_000,
  webServer: {
    command:
      "E2E_DIST_DIR=.next-marketing STRIPE_SECRET_KEY= STRIPE_PRO_PRICE_ID= STRIPE_WEBHOOK_SECRET= npx next dev -p 3101 --turbopack",
    url: BASE_URL,
    timeout: 90_000,
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",
  },
  use: {
    baseURL: BASE_URL,
    browserName: "chromium",
    headless: true,
    timezoneId: "Europe/Berlin",
    colorScheme: "light",
  },
});
