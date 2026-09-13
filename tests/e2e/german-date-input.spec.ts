import { test, expect, type Page } from "@playwright/test";
import { adminClient } from "./helpers";
import { setupProjectAssignmentEnv, teardownProjectAssignmentEnv, loginAs, type ProjectAssignmentEnv } from "./project-assignment-fixtures";

test.describe("German date fields", () => {
  test.use({ locale: "en-US" });
  let env: ProjectAssignmentEnv;

  test.beforeAll(async () => { env = await setupProjectAssignmentEnv("german-dates"); });
  test.afterAll(async () => { await teardownProjectAssignmentEnv(env); });
  test.beforeEach(async ({ page }) => {
    const { error } = await adminClient.from("employees").update({ employment_start_date: "2026-09-01" }).eq("id", env.employeeEmpId);
    if (error) throw error;
    await loginAs(page, env.adminEmail);
    await page.goto("/app/employees");
    await openEmployee(page);
  });

  async function openEmployee(page: Page) {
    const row = page.getByText("Lukas Mitarbeiter", { exact: true }).locator("../..");
    await row.getByRole("button", { name: "Bearbeiten", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Mitarbeiter bearbeiten" })).toBeVisible();
  }

  test("shows and saves day-month-year independently of browser language", async ({ page }) => {
    const field = page.getByLabel("Eintrittsdatum", { exact: true });
    await expect(field).toHaveValue("01.09.2026");
    await field.fill("15082026");
    await field.press("Tab");
    await expect(field).toHaveValue("15.08.2026");
    const save = page.waitForResponse(response => response.url().endsWith(`/api/v1/employees/${env.employeeEmpId}`) && response.request().method() === "PATCH");
    await page.getByRole("button", { name: "Speichern", exact: true }).click();
    expect((await save).ok()).toBe(true);
    expect((await save).request().postDataJSON().employment_start_date).toBe("2026-08-15");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await openEmployee(page);
    await expect(field).toHaveValue("15.08.2026");
    const stored = await adminClient.from("employees").select("employment_start_date").eq("id", env.employeeEmpId).single();
    expect(stored.data?.employment_start_date).toBe("2026-08-15");
  });

  test("rejects impossible dates and supports calendar selection on mobile", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 375, height: 900 });
    const field = page.getByLabel("Eintrittsdatum", { exact: true });
    await field.fill("31.02.2026");
    await page.getByRole("button", { name: "Speichern", exact: true }).click();
    await expect(field).toHaveAttribute("aria-invalid", "true");
    expect(await field.evaluate((element: HTMLInputElement) => element.validationMessage)).toContain("TT.MM.JJJJ");
    await expect(page.getByRole("dialog")).toBeVisible();
    await field.fill("1.9.2026");
    await page.getByRole("button", { name: "Kalender öffnen", exact: true }).click();
    await page.locator('button[data-day="2.9.2026"]').click();
    await expect(page.locator('button[data-day="2.9.2026"]')).toBeHidden();
    await expect(field).toHaveValue("02.09.2026");
    await expect(field).toHaveAttribute("aria-invalid", "false");
    const box = await field.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);
    await page.screenshot({ path: testInfo.outputPath("german-date-mobile.png") });
  });
});
