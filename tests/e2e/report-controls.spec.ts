import { test, expect } from "@playwright/test";
import { testEmail, TEST_PASSWORD, cleanupTestUser, createTestUser } from "./helpers";
import { loginAs } from "./project-assignment-fixtures";

test.describe("Weekly report controls", () => {
  const email = testEmail("report-controls");
  test.beforeAll(async () => {
    await createTestUser({ email, password: TEST_PASSWORD, firstName: "Anna", lastName: "Bericht",
      companyName: "Berichte Test", role: "admin", bundesland: "berlin" });
  });
  test.afterAll(async () => { await cleanupTestUser(email); });

  test("week navigation and CSV export fit without overlapping at all breakpoints", async ({ page }, testInfo) => {
    await loginAs(page, email);
    await page.goto("/app/reports");
    const controls = page.getByTestId("weekly-report-navigation");
    await expect(page.getByTestId("weekly-report-scroll")).toBeVisible();
    for (const width of [320, 640, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const container = await page.locator("[data-app-content]").boundingBox();
      const buttons = controls.getByRole("button");
      await expect(buttons).toHaveCount(4);
      const boxes = await buttons.evaluateAll((elements) => elements.map((element) => {
        const { left, top, right, bottom, height } = element.getBoundingClientRect();
        return { left, top, right, bottom, height };
      }));
      for (const [index, box] of boxes.entries()) {
        expect(box.left, `left at ${width}px`).toBeGreaterThanOrEqual(container!.x - 1);
        expect(box.right, `right at ${width}px`).toBeLessThanOrEqual(container!.x + container!.width + 1);
        for (const other of boxes.slice(index + 1)) {
          expect(box.right <= other.left || other.right <= box.left || box.bottom <= other.top || other.bottom <= box.top,
            `overlap at ${width}px`).toBe(true);
        }
        if (width >= 640) expect(box.top).toBeCloseTo(boxes[0].top, 0);
      }
      if (width === 768 || width === 1440) {
        await page.screenshot({ path: testInfo.outputPath(`report-${width}.png`) });
      }
    }
    const reportResponse = page.waitForResponse((response) => response.url().includes("/reports/weekly?"));
    await controls.getByRole("button", { name: "Vorwoche", exact: true }).click();
    const previousWeek = (await (await reportResponse).json()).data;
    await expect(controls.getByRole("button", { name: "Aktuelle Woche" })).toBeEnabled();
    const exportResponse = page.waitForResponse((response) => response.url().includes("/reports/export/csv?"));
    const download = page.waitForEvent("download");
    await controls.getByRole("button", { name: "CSV Export" }).click();
    const exported = await exportResponse;
    expect(exported.ok()).toBe(true);
    expect(new URL(exported.url()).searchParams.get("startDate")).toBe(previousWeek.weekStart);
    await download;
    await controls.getByRole("button", { name: "Aktuelle Woche" }).click();
    await expect(controls.getByRole("button", { name: "Aktuelle Woche" })).toBeDisabled();
  });
});
