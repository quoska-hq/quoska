import { test, expect } from "@playwright/test";
import { adminClient, cleanupTestUser, createTestUser, testEmail, TEST_PASSWORD } from "./helpers";
import { epochToDate, getCurrentEpochDays } from "@/config/client/date-utils";

const cases = [
  { requiresApproval: true, name: "employee missing-time request books hours only after a manager approves" },
  { requiresApproval: false, name: "employee missing-time request books immediately when the admin turns off approval" },
] as const;

for (const { requiresApproval, name } of cases) test(name, async ({ page }) => {
  test.setTimeout(60_000);
  const managerEmail = testEmail("missing-manager"), employeeEmail = testEmail("missing-employee");
  const date = epochToDate(getCurrentEpochDays() - 1);
  try {
    const manager = await createTestUser({ email: managerEmail, password: TEST_PASSWORD,
      firstName: "Maja", lastName: "Manager", companyName: "Missing time test", role: requiresApproval ? "manager" : "admin" });
    const { data: auth, error: authError } = await adminClient.auth.admin.createUser({ email: employeeEmail, password: TEST_PASSWORD, email_confirm: true });
    expect(authError).toBeNull();
    const employeeUserId = auth.user!.id;
    const { data: employee, error: employeeError } = await adminClient.from("employees").insert({
      tenant_id: manager.tenantId, user_id: employeeUserId, email: employeeEmail,
      first_name: "Tina", last_name: "Team", role: "employee", employment_start_date: date,
    }).select("id").single();
    expect(employeeError).toBeNull();
    await adminClient.rpc("set_employee_claims", { user_uuid: employeeUserId });

    async function login(email: string) {
      await page.context().clearCookies();
      await page.goto("/login");
      await page.getByLabel("E-Mail").fill(email);
      await page.getByLabel("Passwort").fill(TEST_PASSWORD);
      await page.getByRole("button", { name: /anmelden/i }).click();
      await expect(page).toHaveURL(/\/app\//);
    }
    if (!requiresApproval) {
      await login(managerEmail);
      await page.goto("/app/settings");
      const setting = page.getByRole("switch", { name: "Zeitnachträge von Mitarbeitenden genehmigen" });
      await expect(setting).toBeEnabled();
      await expect(setting).toHaveAttribute("aria-checked", "true");
      await setting.click();
      await expect(setting).toHaveAttribute("aria-checked", "false");
    }
    await login(employeeEmail);
    await page.goto("/app/my-times");
    await page.getByRole("button", { name: "Zeit nachtragen", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: requiresApproval ? "Zeitnachtrag anfragen" : "Zeit manuell hinzufügen" });
    await dialog.getByLabel("Datum", { exact: true }).click();
    const [year, month, day] = date.split("-");
    const targetDay = page.locator(`[data-day="${Number(day)}.${Number(month)}.${year}"]`);
    if (!await targetDay.count()) await page.getByRole("button", { name: /vorherigen monat|previous month/i }).click();
    await targetDay.click();
    await expect(targetDay).toBeHidden();
    await dialog.getByLabel("Beginn", { exact: true }).fill("08:00");
    await expect(dialog.getByLabel("Beginn", { exact: true })).toHaveValue("08:00");
    await dialog.getByLabel("Ende", { exact: true }).fill("16:00");
    await expect(dialog.getByLabel("Ende", { exact: true })).toHaveValue("16:00");
    await dialog.getByLabel("Grund", { exact: true }).fill("Am Vortag Stempeln vergessen");
    await dialog.getByRole("button", { name: requiresApproval ? "Anfrage senden" : "Zeit hinzufügen", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    const entries = () => adminClient.from("time_entries").select("id").eq("employee_id", employee!.id);
    if (!requiresApproval) {
      await expect(page.getByText("Direkt gebucht", { exact: true })).toBeVisible();
      const { data: booked } = await entries();
      expect(booked).toHaveLength(1);
      const { data: audit } = await adminClient.from("time_entry_audit").select("action, reason, changed_by")
        .eq("time_entry_id", booked![0].id).single();
      expect(audit).toMatchObject({
        action: "create", reason: "Zeitnachtrag (direkt gebucht): Am Vortag Stempeln vergessen", changed_by: employee!.id,
      });
      expect((await page.request.patch("/api/v1/settings/time-tracking", { data: { missingTimeApprovalRequired: true } })).status()).toBe(403);
      return;
    }
    await expect(page.getByText("Wartet auf Freigabe", { exact: true })).toBeVisible();
    expect((await entries()).data).toHaveLength(0);
    const { data: pending } = await adminClient.from("correction_requests").select("id, time_entry_id, status")
      .eq("employee_id", employee!.id).single();
    expect(pending).toMatchObject({ status: "pending", time_entry_id: null });
    expect((await page.request.patch(`/api/v1/corrections/${pending!.id}`, { data: { action: "approve" } })).status()).toBe(403);

    await login(managerEmail);
    await page.goto("/app/reports?tab=corrections");
    const card = page.locator('[data-slot="card"]').filter({ hasText: "Am Vortag Stempeln vergessen" });
    await expect(card).toContainText("Tina Team");
    await card.getByRole("button", { name: "Prüfen →", exact: true }).click();
    await card.getByRole("button", { name: "Genehmigen", exact: true }).click();
    await expect(card).toHaveCount(0);
    expect((await entries()).data).toHaveLength(1);
    const { data: audit } = await adminClient.from("time_entry_audit").select("reason, new_value").eq("tenant_id", manager.tenantId);
    expect(audit).toHaveLength(1);
    expect(audit![0].reason).toContain("Nachtragsanfrage (genehmigt)");
    expect(audit![0].new_value).toContain(pending!.id);
    expect((await page.request.patch(`/api/v1/corrections/${pending!.id}`, { data: { action: "approve" } })).status()).toBe(400);

    await login(employeeEmail);
    await page.goto("/app/my-times");
    await expect(page.getByText("Genehmigt", { exact: true })).toBeVisible();
  } finally {
    await cleanupTestUser(employeeEmail);
    await cleanupTestUser(managerEmail);
  }
});
