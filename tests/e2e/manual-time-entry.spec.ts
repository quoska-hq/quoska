import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { adminClient, cleanupTestUser, createTestUser, testEmail, TEST_PASSWORD } from "./helpers";
import { epochToDate, getCurrentEpochDays } from "@/config/client/date-utils";

test.describe("Manual time entries and automatic breaks", () => {
  const adminEmail = testEmail("manual-time");
  let tenantId = "";
  let adminEmployeeId = "";
  let targetEmployeeId = "";
  const today = epochToDate(getCurrentEpochDays());
  const previousDay = epochToDate(getCurrentEpochDays() - 1);

  function germanDate(date: string): string {
    const [year, month, day] = date.split("-");
    return `${day}.${month}.${year}`;
  }

  function calendarDay(date: string): string {
    const [year, month, day] = date.split("-");
    return `${Number(day)}.${Number(month)}.${year}`;
  }

  test.beforeAll(async () => {
    const setup = await createTestUser({
      email: adminEmail,
      password: TEST_PASSWORD,
      firstName: "Maja",
      lastName: "Admin",
      companyName: "Manual Time Test",
      role: "admin",
      bundesland: "berlin",
    });
    tenantId = setup.tenantId;

    const { data: adminEmployee } = await adminClient
      .from("employees").select("id").eq("email", adminEmail).single();
    adminEmployeeId = adminEmployee!.id;

    const { data: target } = await adminClient.from("employees").insert({
      tenant_id: tenantId,
      user_id: randomUUID(),
      first_name: "Tina",
      last_name: "Team",
      email: testEmail("manual-target"),
      role: "employee",
    }).select("id").single();
    targetEmployeeId = target!.id;
  });

  test.afterAll(async () => {
    await adminClient.from("notifications").delete().eq("tenant_id", tenantId);
    await adminClient.from("time_entry_audit").delete().eq("tenant_id", tenantId);
    await adminClient.from("time_entries").delete().eq("tenant_id", tenantId);
    await adminClient.from("employees").delete().eq("id", targetEmployeeId);
    await cleanupTestUser(adminEmail);
  });

  async function login(page: Page) {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(adminEmail);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
  }

  test("admin can add own time and sees the automatic pause attribution", async ({ page }) => {
    await login(page);
    await page.goto("/app/my-times");
    await page.getByRole("button", { name: "Zeit nachtragen" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Datum")).toContainText(germanDate(today));
    await dialog.getByLabel("Beginn").fill("08:00");
    await dialog.getByLabel("Ende", { exact: true }).fill("17:00");
    await dialog.getByLabel("Bereits genommene Pause (Minuten)").fill("0");
    await expect(dialog.getByText("30 auto", { exact: false })).toBeVisible();
    await dialog.getByRole("button", { name: "Zeit hinzufügen" }).click();
    await expect(dialog).not.toBeVisible({ timeout: 8_000 });

    const { data: entry } = await adminClient.from("time_entries")
      .select("break_minutes, automatic_break_minutes, entry_source")
      .eq("employee_id", adminEmployeeId).eq("date", today).single();
    expect(entry).toMatchObject({
      break_minutes: 30,
      automatic_break_minutes: 30,
      entry_source: "manual",
    });

    await expect(page.getByText("30 Min automatisch")).toBeVisible({ timeout: 8_000 });
    await page.goto("/app/notifications");
    await expect(page.getByText("Pause automatisch ergänzt").first()).toBeVisible();
  });

  test("admin can add time for an employee and the employee is notified", async ({ page }) => {
    await login(page);
    await page.goto("/app/reports");
    await page.getByRole("button", { name: "Zeit hinzufügen" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("combobox").click();
    await page.getByRole("option", { name: "Tina Team" }).click();
    await dialog.getByLabel("Datum").click();
    await page.locator(`[data-day="${calendarDay(previousDay)}"]`).click();
    await dialog.getByLabel("Beginn").fill("10:00");
    await dialog.getByLabel("Ende", { exact: true }).fill("15:00");
    await dialog.getByRole("button", { name: "Zeit hinzufügen" }).click();
    await expect(dialog).not.toBeVisible({ timeout: 8_000 });

    const { data: entry } = await adminClient.from("time_entries")
      .select("entry_source").eq("employee_id", targetEmployeeId).eq("date", previousDay).single();
    expect(entry?.entry_source).toBe("manual");

    const { data: notification } = await adminClient.from("notifications")
      .select("type, message, read").eq("employee_id", targetEmployeeId)
      .eq("type", "manual_time_added").single();
    expect(notification?.read).toBe(false);
    expect(notification?.message).toContain("Maja Admin");
  });

  test("admin can disable and re-enable automatic breaks", async ({ page }) => {
    await login(page);
    await page.goto("/app/settings");

    const toggle = page.getByRole("switch", { name: "Automatische Pausen" });
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");

    const { data: disabled } = await adminClient.from("tenants")
      .select("automatic_breaks_enabled").eq("id", tenantId).single();
    expect(disabled?.automatic_breaks_enabled).toBe(false);

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    const { data: enabled } = await adminClient.from("tenants")
      .select("automatic_breaks_enabled").eq("id", tenantId).single();
    expect(enabled?.automatic_breaks_enabled).toBe(true);
  });

  test("clock-out adds a missing break and immediately shows the red badge", async ({ page }) => {
    await login(page);
    await adminClient.from("notifications").delete().eq("employee_id", adminEmployeeId);

    const clockIn = new Date(Date.now() - 7 * 60 * 60_000).toISOString();
    const { data: running } = await adminClient.from("time_entries").insert({
      tenant_id: tenantId,
      employee_id: adminEmployeeId,
      date: today,
      clock_in: clockIn,
      clock_out: null,
      break_minutes: 0,
      status: "running",
      notes: null,
    }).select("id").single();

    await page.goto("/app/clock");
    const clockOutResponse = page.waitForResponse((response) =>
      response.url().endsWith("/api/v1/clock/out") && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: /ausstempeln/i }).click();
    expect((await clockOutResponse).ok()).toBe(true);
    await expect(page.getByRole("button", { name: /^stempeln$/i })).toBeVisible();

    const { data: completed } = await adminClient.from("time_entries")
      .select("break_minutes, automatic_break_minutes")
      .eq("id", running!.id).single();
    expect(completed).toMatchObject({ break_minutes: 30, automatic_break_minutes: 30 });

    const badge = page.locator('a[href="/app/notifications"] [data-slot="badge"]').first();
    await expect(badge).toHaveText("1");
  });
});
