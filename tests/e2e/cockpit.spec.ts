import { test, expect } from "@playwright/test";
import { epochToDate, getCurrentEpochDays } from "@/config/client/date-utils";
import {
  adminClient,
  cleanupTestUser,
  createTestUser,
  TEST_PASSWORD,
  testEmail,
} from "./helpers";

test.describe("Admin Cockpit", () => {
  const email = testEmail("cockpit");
  let tenantId = "";

  test.beforeAll(async () => {
    const setup = await createTestUser({
      email,
      password: TEST_PASSWORD,
      firstName: "Clara",
      lastName: "Chef",
      companyName: "Cockpit Test GmbH",
      role: "admin",
      bundesland: "berlin",
    });
    tenantId = setup.tenantId;
    const { data: employee } = await adminClient
      .from("employees")
      .select("id")
      .eq("email", email)
      .single();
    const joinedDate = epochToDate(getCurrentEpochDays() - 30);
    await adminClient
      .from("employees")
      .update({
        created_at: `${joinedDate}T08:00:00.000Z`,
        employment_start_date: joinedDate,
      })
      .eq("id", employee?.id);
    const { data: project } = await adminClient
      .from("projects")
      .insert({ tenant_id: tenantId, name: "Launch", color: "#6658d3" })
      .select("id")
      .single();
    const today = epochToDate(getCurrentEpochDays());
    const { data: entry } = await adminClient
      .from("time_entries")
      .insert({
        tenant_id: tenantId,
        employee_id: employee?.id,
        date: today,
        clock_in: `${today}T07:00:00.000Z`,
        clock_out: `${today}T15:30:00.000Z`,
        break_minutes: 30,
        status: "completed",
        project_id: project?.id,
      })
      .select("id, clock_in")
      .single();
    await adminClient.from("time_entry_audit").insert({
      time_entry_id: entry?.id,
      tenant_id: tenantId,
      changed_by: employee?.id,
      action: "create",
      field_name: "clock_in",
      new_value: entry?.clock_in,
      reason: "Clock in",
    });
    let absenceDate = getCurrentEpochDays() - 1;
    while ([0, 6].includes((absenceDate + 4) % 7)) absenceDate--;
    const leaveDate = epochToDate(absenceDate);
    await adminClient.from("leave_requests").insert({
      tenant_id: tenantId,
      employee_id: employee?.id,
      type: "urlaub",
      start_date: leaveDate,
      end_date: leaveDate,
      work_days_count: 1,
      status: "approved",
      reviewed_by: employee?.id,
    });
    await adminClient.from("correction_requests").insert({
      tenant_id: tenantId,
      employee_id: employee?.id,
      time_entry_id: entry?.id,
      proposed_change: { break_minutes: 45 },
      reason: "Pause korrigieren",
      status: "pending",
    });
  });

  test.afterAll(async () => {
    await cleanupTestUser(email);
  });

  test("shows overview, employee filter, charts and immutable activity", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();

    await expect(page.getByRole("heading", { name: "Cockpit" })).toBeVisible();
    await expect(page.getByLabel("Mitarbeiter filtern")).toBeVisible();
    await expect(page.getByTestId("cockpit-action-center")).toBeVisible();
    await expect(page.getByText("Arbeitszeitverlauf")).toBeVisible();
    await expect(page.getByText("Launch").first()).toBeVisible();
    await page.getByLabel("Clara Chef öffnen").click();
    const drawer = page.getByTestId("employee-cockpit-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText("1 Tag")).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await page.getByRole("tab", { name: /aktivitäten/i }).click();
    await expect(page.getByText("Eingestempelt")).toBeVisible();
    await expect(page.getByText(/Clara Chef/).first()).toBeVisible();
    await expect(page.getByText(/unveränderlich protokolliert/i)).toBeVisible();
  });

  test("opens pending corrections directly from the Action Center", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await page.getByRole("link", { name: "Prüfen" }).click();

    await expect(page).toHaveURL(/\/app\/reports\?tab=corrections/);
    await expect(page.getByRole("tab", { name: "Korrekturen" })).toHaveAttribute("data-active");
    await expect(page.getByText("Pause korrigieren")).toBeVisible();
  });
});
