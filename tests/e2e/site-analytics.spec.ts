import { expect, test } from "@playwright/test";
import { cleanupTestUser, createTestUser, TEST_PASSWORD } from "./helpers";

test.describe("owner-only website analytics", () => {
  const email = "analytics-owner@quoska.test";

  test.beforeAll(async () => {
    await cleanupTestUser(email);
    await createTestUser({
      email,
      password: TEST_PASSWORD,
      firstName: "Analytics",
      lastName: "Owner",
      companyName: "Quoska Analytics",
      role: "admin",
    });
  });

  test.afterAll(async () => cleanupTestUser(email));

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
    await expect(page.getByRole("heading", { name: "Besucher-Analytics" })).toBeVisible();
    await expect(page.getByText("/funktionen", { exact: true })).toBeVisible();
    await expect(page.getByText("e2e-test", { exact: true })).toBeVisible();
    await expect(page.getByText("Mobil", { exact: true })).toBeVisible();
  });
});
