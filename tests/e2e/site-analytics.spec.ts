import { expect, test } from "@playwright/test";
import { cleanupTestUser, createTestUser, TEST_PASSWORD } from "./helpers";
import { formatDateTimeDE } from "../../src/config/client/date-utils";
import type { AccountOverview } from "../../src/types/product-analytics";

test.describe("owner-only website analytics", () => {
  const email = "analytics-owner@quoska.test";
  const customerEmail = "analytics-customer@quoska.test";

  test.beforeAll(async () => {
    await cleanupTestUser(email);
    await cleanupTestUser(customerEmail);
    await createTestUser({ email: customerEmail, password: TEST_PASSWORD, firstName: "Customer", lastName: "Admin", companyName: "Analytics Customer", role: "admin" });
    await createTestUser({
      email,
      password: TEST_PASSWORD,
      firstName: "Analytics",
      lastName: "Owner",
      companyName: "Quoska Analytics",
      role: "admin",
    });
  });

  test.afterAll(async () => { await cleanupTestUser(email); await cleanupTestUser(customerEmail); });

  test("collects a public view and shows it in the private dashboard", async ({ page, request }) => {
    const collection = await request.post("/api/site-analytics/collect", {
      headers: {
        "x-forwarded-for": "8.8.8.8",
        "user-agent": "Mozilla/5.0 (iPhone; Mobile) AppleWebKit/605.1.15",
      },
      data: {
        path: "/funktionen",
        referrer: "https://www.google.com/search?q=zeiterfassung",
        utmSource: "e2e-test",
      },
    });
    expect(collection.status()).toBe(204);

    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/);

    await expect(page.getByRole("link", { name: "Website-Analytics" })).toBeVisible();
    await page.getByRole("link", { name: "Website-Analytics" }).click();
    await expect(page).toHaveURL(/\/app\/site-analytics/);
    await expect(page.getByTestId("site-analytics-dashboard")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Website-Analytics" })).toBeVisible();
    await expect(page.getByText("/funktionen", { exact: true })).toBeVisible();
    await expect(page.getByText("e2e-test", { exact: true })).toBeVisible();
    await expect(page.getByText("Mobil", { exact: true })).toBeVisible();
    await page.goto("/app/product-analytics");
    await expect(page.getByTestId("product-analytics-dashboard")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Produktübersicht", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Kommen neue Firmen in der Folgewoche zurück?" })).toBeVisible();
    await page.getByLabel("Firma suchen", { exact: true }).fill("Quoska Analytics");
    const companies = page.locator("section").filter({ has: page.getByRole("heading", { name: "Firmen und Nutzung", exact: true }) });
    await expect(companies.getByRole("cell", { name: "Quoska Analytics", exact: true })).toBeVisible();
    await expect(companies.getByRole("cell", { name: "Analytics Customer", exact: true })).toHaveCount(0);
    const accounts = page.getByTestId("product-account-table");
    await accounts.getByLabel("Konto oder Firma suchen").fill(email);
    await expect(accounts.getByRole("row")).toHaveCount(2);
    await expect(accounts.getByRole("cell", { name: email, exact: false })).toBeVisible();
    await accounts.getByLabel("Konto oder Firma suchen").fill("Analytics Customer");
    await expect(accounts.getByRole("row")).toHaveCount(2);
    await expect(accounts.getByRole("cell", { name: customerEmail, exact: false })).toBeVisible();
    await expect(accounts.getByRole("row").last()).toContainText("Noch nicht erfasst");
    await accounts.getByLabel("Kontostatus").selectOption("deactivated");
    await expect(accounts.getByText("Keine passenden Konten.")).toBeVisible();
    const report = await page.request.get("/api/v1/product-analytics");
    expect(report.status()).toBe(200);
    expect((await report.json()).totals.companies).toBeGreaterThan(0);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("records app use after login, ignores idle polling, and attributes successful clock actions", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    const initialPresence = page.waitForResponse(r => r.url().endsWith("/api/v1/product-activity") && r.status() === 204);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/);
    await initialPresence;
    const account = async () => {
      const report = await page.request.get("/api/v1/product-analytics");
      expect(report.status()).toBe(200);
      const accounts = (await report.json()).accounts as AccountOverview[];
      return accounts.find(a => a.email === email)!;
    };
    const before = await account();
    expect(before.lastSignInAt).toBeTruthy(); expect(before.lastActiveAt).toBeTruthy();
    let observations = 0;
    page.on("request", r => { if (r.url().endsWith("/api/v1/product-activity")) observations++; });
    await page.clock.install();
    await page.clock.fastForward(31 * 60_000);
    await page.request.get("/api/v1/clock/status");
    const idle = await account();
    expect(idle.lastActiveAt).toBe(before.lastActiveAt);
    expect(observations).toBe(0);

    const interaction = page.waitForResponse(r => r.url().endsWith("/api/v1/product-activity") && r.status() === 204);
    await page.getByRole("link", { name: "Produktübersicht", exact: true }).click();
    await interaction;
    const active = await account();
    expect(Date.parse(active.lastActiveAt!)).toBeGreaterThan(Date.parse(before.lastActiveAt!));
    expect(active.lastSignInAt).toBe(before.lastSignInAt);
    expect(observations).toBe(1);

    const stamp = await page.request.post("/api/v1/clock/in", { data: {} });
    expect(stamp.status()).toBe(201);
    const entryId = (await stamp.json()).data.id;
    expect((await account()).lastAction).toBe("clock_in");
    const finish = await page.request.post("/api/v1/clock/out", { data: { timeEntryId: entryId } });
    expect(finish.status()).toBe(200);
    const finished = await account();
    expect(finished.lastAction).toBe("clock_out");
    expect(finished.lastActionAt).toBe(finished.lastActiveAt);
    expect(finished.lastSignInAt).toBe(before.lastSignInAt);

    await page.reload();
    await page.getByLabel("Konto oder Firma suchen").fill(email);
    const row = page.getByTestId("product-account-table").getByRole("row").last();
    await expect(row).toContainText(`${formatDateTimeDE(before.lastSignInAt!)} Uhr`);
    await expect(row).toContainText(`${formatDateTimeDE(finished.lastActionAt!)} Uhr`);
    await expect(row).toContainText("Ausstempeln");
  });
  test("customer administrators cannot open cross-company product reports", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(customerEmail);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/);
    await expect(page.getByRole("link", { name: "Produktübersicht", exact: true })).toHaveCount(0);
    expect((await page.request.get("/api/v1/product-analytics")).status()).toBe(404);
    await page.goto("/app/product-analytics");
    await expect(page.getByTestId("product-analytics-dashboard")).toHaveCount(0);
  });

});
