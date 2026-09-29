/**
 * Story 2.2: Break Tracking — Pause & Resume E2E test
 *
 * Tests the break flow through the UI:
 * - Start break when clocked in
 * - UI shows "Pause beenden" and break duration
 * - End short breaks after confirmation
 * - Cannot clock out while on break
 * - Break minutes accumulate correctly
 */

import { test, expect } from "@playwright/test";
import { testEmail, TEST_PASSWORD, cleanupTestUser, createTestUser, adminClient } from "./helpers";

test.describe("Break Tracking — Story 2.2", () => {
  const email = testEmail("break22");

  test.beforeAll(async () => {
    await createTestUser({
      email,
      password: TEST_PASSWORD,
      firstName: "Benjamin",
      lastName: "Breaker",
      companyName: "Break Test GmbH",
      role: "employee",
      bundesland: "berlin",
    });
  });

  test.afterAll(async () => {
    await cleanupTestUser(email);
  });

  /** Helper: log in, clean up, clock in, and return to clock page */
  async function clockInAndReady(page: import("@playwright/test").Page) {
    // Clean up any existing entries
    const { data: employees } = await adminClient
      .from("employees")
      .select("id, tenant_id")
      .eq("email", email);
    if (employees?.length) {
      const emp = employees[0];
      await adminClient.from("time_entry_audit").delete().eq("tenant_id", emp.tenant_id);
      await adminClient.from("break_sessions").delete().eq("tenant_id", emp.tenant_id);
      await adminClient.from("time_entries").delete().eq("tenant_id", emp.tenant_id).eq("employee_id", emp.id);
    }

    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    await page.goto("/app/clock");
    await expect(page.getByRole("heading", { name: /stempeln/i })).toBeVisible({ timeout: 5_000 });

    // Clock in
    await page.getByRole("button", { name: /^stempeln$/i }).click();
    await expect(page.getByRole("button", { name: /ausstempeln/i })).toBeVisible({ timeout: 5_000 });
  }

  test("can start a break when clocked in", async ({ page }) => {
    await clockInAndReady(page);

    // Click "Pause starten"
    await page.getByRole("button", { name: /pause starten/i }).click();

    // Button should change to "Pause beenden"
    await expect(page.getByRole("button", { name: /pause beenden/i })).toBeVisible({ timeout: 5_000 });

    // Should show "Pause seit" sublabel
    await expect(page.getByText(/pause seit/i)).toBeVisible({ timeout: 5_000 });

    // The current break duration is visible as a live stopwatch.
    await expect(page.getByTestId("active-break-duration")).toContainText(
      /\d+:\d{2}:\d{2}/,
    );
    await expect(page.getByTestId("active-break-duration")).toContainText(
      /anrechenbaren Pause/,
    );
    await expect(page.getByRole("button", { name: /pause beenden/i })).toBeEnabled();

    // On other tabs, the global header must require ending the pause first.
    await page.goto("/app/dashboard");
    const appHeader = page.getByTestId("app-header");
    await expect(appHeader.getByRole("button", { name: "Pause beenden" })).toBeVisible();
    await expect(appHeader.getByRole("button", { name: "Pause beenden" })).toBeEnabled();
    await expect(appHeader.getByRole("button", { name: "Ausstempeln" })).not.toBeVisible();
    await expect(page).toHaveTitle(/^Pause \d+:\d{2}:\d{2} · Quoska$/);

    // Clean up only this test tenant.
    await cleanupForEmail(email);
  });

  test("short interruption: cancel, confirm, reload and clock out", async ({ page }) => {
    await clockInAndReady(page);
    await page.getByRole("button", { name: "Pause starten" }).click();
    const endButton = page.getByRole("button", { name: "Pause beenden", exact: true });
    await expect(endButton).toBeEnabled();
    await endButton.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Pause vorzeitig beenden?");
    await expect(dialog).toContainText("Diese Unterbrechung ist kürzer als 15 Minuten und zählt nicht zur gesetzlichen Mindestpause.");
    await dialog.getByRole("button", { name: "Weiter pausieren" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(endButton).toBeVisible();

    await endButton.click();
    const resumed = page.waitForResponse((res) => res.url().endsWith("/clock/resume") && res.request().method() === "POST");
    await dialog.getByRole("button", { name: "Pause beenden", exact: true }).click();
    const response = await resumed;
    expect(response.status()).toBe(200);
    const { data } = await response.json();
    expect(data.breakMinutes).toBe(0);
    expect(data.breakSession.break_end).toBeTruthy();
    const seconds = (Date.parse(data.breakSession.break_end) - Date.parse(data.breakSession.break_start)) / 1000;
    expect(seconds).toBeGreaterThanOrEqual(0);
    expect(seconds).toBeLessThan(900);
    await expect(page.getByRole("button", { name: "Ausstempeln" })).toBeVisible();
    await expect(page.getByText(/Kurze Unterbrechung:/)).toBeVisible();
    await page.reload();
    await expect(page.getByText(/Kurze Unterbrechung:/)).toBeVisible();
    await page.getByRole("button", { name: "Ausstempeln" }).click();
    await expect(page.getByRole("button", { name: "Stempeln", exact: true })).toBeVisible();
    await page.goto("/app/my-times");
    await expect(page.getByText(/Kurze Unterbrechung:/)).toBeVisible();
  });

  test("header confirms short interruptions and allows clock-out afterwards", async ({ page }) => {
    await clockInAndReady(page);
    await page.goto("/app/dashboard");
    const header = page.getByTestId("app-header");
    await header.getByRole("button", { name: "Pause starten" }).click();
    await expect(header.getByRole("button", { name: "Pause beenden" })).toBeEnabled();
    await header.getByRole("button", { name: "Pause beenden" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Weiter pausieren" }).click();
    await expect(header.getByRole("button", { name: "Pause beenden" })).toBeEnabled();
    await header.getByRole("button", { name: "Pause beenden" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Pause beenden", exact: true }).click();
    await expect(header.getByRole("button", { name: "Ausstempeln" })).toBeVisible();
    await header.getByRole("button", { name: "Ausstempeln" }).click();
    await expect(header.getByRole("button", { name: "Stempeln", exact: true })).toBeVisible();
  });

  test("a full 15-minute block ends without confirmation and is deducted", async ({ page }) => {
    await clockInAndReady(page);
    await page.getByRole("button", { name: "Pause starten" }).click();
    await expect(page.getByRole("button", { name: "Pause beenden" })).toBeEnabled();
    const { data: status } = await (await page.request.get("/api/v1/clock/status")).json();
    // Only the freshly created test tenant is changed; simulate elapsed time.
    const start = new Date(Date.now() - 15 * 60_000 - 1000).toISOString();
    await adminClient.from("time_entries").update({ clock_in: new Date(Date.now() - 60 * 60_000).toISOString() }).eq("id", status.activeEntry.id);
    await adminClient.from("break_sessions").update({ break_start: start }).eq("id", status.activeBreak.id);
    await page.reload();
    await expect(page.getByText("Mindestdauer erreicht")).toBeVisible();
    const resumed = page.waitForResponse((res) => res.url().endsWith("/clock/resume") && res.request().method() === "POST");
    await page.getByRole("button", { name: "Pause beenden" }).click();
    expect((await (await resumed).json()).data.breakMinutes).toBe(15);
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Ausstempeln" })).toBeVisible();
  });

  for (const automatic of [false, true]) {
    test(`short interruption keeps persisted balance and CSV consistent (automatic=${automatic})`, async ({ page }) => {
      await clockInAndReady(page);
      const { data: initial } = await (await page.request.get("/api/v1/clock/status")).json();
      const entry = initial.activeEntry;
      await adminClient.from("tenants").update({ automatic_breaks_enabled: automatic }).eq("id", entry.tenant_id);
      await adminClient.from("time_entries").update({ clock_in: new Date(Date.now() - 8 * 60 * 60_000).toISOString() }).eq("id", entry.id);
      const pause = await page.request.post("/api/v1/clock/pause", { data: { timeEntryId: entry.id } });
      const pauseId = (await pause.json()).data.id;
      await adminClient.from("break_sessions").update({ break_start: new Date(Date.now() - 10 * 60_000).toISOString() }).eq("id", pauseId);
      const resumed = await page.request.post("/api/v1/clock/resume", { data: { breakSessionId: pauseId } });
      expect(resumed.status()).toBe(200);
      expect((await resumed.json()).data.breakMinutes).toBe(0);
      const { data: status } = await (await page.request.get("/api/v1/clock/status")).json();
      expect(status.compliance.warnings.some((warning: { category: string }) => warning.category === "break")).toBe(true);
      const out = await page.request.post("/api/v1/clock/out", { data: { timeEntryId: entry.id } });
      expect(out.status()).toBe(200);
      const { data: completed } = await out.json();
      expect(completed.break_minutes).toBe(automatic ? 30 : 0);
      expect(completed.automatic_break_minutes).toBe(automatic ? 30 : 0);
      const { data: times } = await (await page.request.get(`/api/v1/my-times?startDate=${entry.date}&endDate=${entry.date}`)).json();
      expect(times.entries[0].netMinutes).toBe(automatic ? 450 : 480);
      expect(times.entries[0].shortInterruptions).toHaveLength(1);
      const exported = await page.request.get("/api/v1/my-data/export");
      expect(exported.status()).toBe(200);
      expect(await exported.text()).toContain(automatic ? ",30,7:30," : ",0,8:00,");
      await adminClient.from("tenants").update({ automatic_breaks_enabled: false }).eq("id", entry.tenant_id);
    });
  }

  test("'Pause starten' button not visible when not clocked in", async ({ page }) => {
    await cleanupForEmail(email);

    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    await page.goto("/app/clock");
    await expect(page.getByRole("heading", { name: /stempeln/i })).toBeVisible({ timeout: 5_000 });

    // Should NOT see "Pause starten" when not clocked in
    await expect(page.getByRole("button", { name: /pause starten/i })).not.toBeVisible();
  });

  test("'Ausstempeln' is replaced by 'Pause beenden' when on break", async ({ page }) => {
    await clockInAndReady(page);

    // Start break
    await page.getByRole("button", { name: /pause starten/i }).click();
    await expect(page.getByRole("button", { name: /pause beenden/i })).toBeVisible({ timeout: 5_000 });

    // "Ausstempeln" should NOT be visible
    await expect(page.getByRole("button", { name: /ausstempeln/i })).not.toBeVisible();

    // Clean up
    await cleanupForEmail(email);
  });

  test("break state persists after page reload", async ({ page }) => {
    await clockInAndReady(page);

    // Start break
    await page.getByRole("button", { name: /pause starten/i }).click();
    await expect(page.getByRole("button", { name: /pause beenden/i })).toBeVisible({ timeout: 5_000 });

    // Reload
    await page.reload();
    await expect(page.getByRole("heading", { name: /stempeln/i })).toBeVisible({ timeout: 5_000 });

    // Should still show "Pause beenden" — server state persisted
    await expect(page.getByRole("button", { name: /pause beenden/i })).toBeVisible({ timeout: 5_000 });

    // Clean up
    await cleanupForEmail(email);
  });
});

/** Clean up all time entries / breaks for a test user */
async function cleanupForEmail(email: string) {
  const { data: employees } = await adminClient
    .from("employees")
    .select("id, tenant_id")
    .eq("email", email);
  if (!employees?.length) return;

  const emp = employees[0];
  await adminClient.from("time_entry_audit").delete().eq("tenant_id", emp.tenant_id);
  await adminClient.from("break_sessions").delete().eq("tenant_id", emp.tenant_id);
  await adminClient.from("time_entries").delete().eq("tenant_id", emp.tenant_id).eq("employee_id", emp.id);
}
