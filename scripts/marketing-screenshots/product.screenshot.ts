// Playwright-only asset generator; the custom extension keeps Vitest from collecting it.
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import {
  adminClient,
  cleanupTestUser,
  createTestUser,
  TEST_PASSWORD,
} from "../../tests/e2e/helpers";
import { epochToDate, getCurrentEpochDays } from "@/config/client/date-utils";

const EMAIL = "marketing-demo@quoska.test";
const OUTPUT_DIR = resolve(process.cwd(), "public/product");
let tenantId = "";

const team = [
  { first_name: "Mara", last_name: "Klein", email: "mara@bauwerk.test" },
  { first_name: "Jonas", last_name: "Weber", email: "jonas@bauwerk.test" },
  { first_name: "Aylin", last_name: "Demir", email: "aylin@bauwerk.test" },
] as const;

const schedule = {
  monday: 480,
  tuesday: 480,
  wednesday: 480,
  thursday: 480,
  friday: 480,
  saturday: 0,
  sunday: 0,
};

test.beforeAll(async () => {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await cleanupTestUser(EMAIL);

  const setup = await createTestUser({
    email: EMAIL,
    password: TEST_PASSWORD,
    firstName: "Lena",
    lastName: "Becker",
    companyName: "Bauwerk Nord",
    role: "admin",
    bundesland: "niedersachsen",
  });
  tenantId = setup.tenantId;

  const { data: adminEmployee } = await adminClient
    .from("employees")
    .select("id")
    .eq("email", EMAIL)
    .single();
  if (!adminEmployee) throw new Error("Marketing demo admin was not created.");

  await adminClient
    .from("employees")
    .update({
      work_schedule: schedule,
      bundesland: "niedersachsen",
      created_at: `${epochToDate(getCurrentEpochDays() - 60)}T08:00:00.000Z`,
    })
    .eq("id", adminEmployee.id);

  const { data: employees, error: employeeError } = await adminClient
    .from("employees")
    .insert(team.map((person) => ({
      tenant_id: tenantId,
      user_id: randomUUID(),
      ...person,
      role: "employee",
      bundesland: "niedersachsen",
      work_schedule: schedule,
      created_at: `${epochToDate(getCurrentEpochDays() - 60)}T08:00:00.000Z`,
    })))
    .select("id, first_name");
  if (employeeError || !employees) throw employeeError ?? new Error("Demo team missing.");

  const allEmployees = [
    { id: adminEmployee.id, first_name: "Lena" },
    ...employees,
  ];
  const { data: projects, error: projectError } = await adminClient
    .from("projects")
    .insert([
      { tenant_id: tenantId, name: "Baustelle Linden", customer_name: "Kramer GmbH", color: "#6658d3" },
      { tenant_id: tenantId, name: "Sanierung Nord", customer_name: "Hofmann KG", color: "#0f766e" },
      { tenant_id: tenantId, name: "Werkstatt", color: "#d97706" },
    ])
    .select("id, name");
  if (projectError || !projects) throw projectError ?? new Error("Demo projects missing.");

  const todayEpoch = getCurrentEpochDays();
  const today = epochToDate(todayEpoch);
  const workDates: string[] = [];
  for (let offset = 6; offset >= 1; offset -= 1) {
    const date = epochToDate(todayEpoch - offset);
    const weekday = (todayEpoch - offset + 4) % 7;
    if (weekday !== 0 && weekday !== 6) workDates.push(date);
  }

  const entryRows = allEmployees.flatMap((employee, employeeIndex) =>
    workDates.map((date, dateIndex) => {
      const startHour = 6 + employeeIndex;
      const totalMinutes = employeeIndex === 0
        ? 480
        : 455 + ((employeeIndex + dateIndex) % 4) * 12;
      const endMinutes = startHour * 60 + totalMinutes + 30;
      const endHour = Math.floor(endMinutes / 60);
      const endMinute = endMinutes % 60;
      return {
        tenant_id: tenantId,
        employee_id: employee.id,
        date,
        clock_in: `${date}T${String(startHour).padStart(2, "0")}:00:00.000Z`,
        clock_out: `${date}T${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}:00.000Z`,
        break_minutes: 30,
        status: "completed",
        project_id: projects[(employeeIndex + dateIndex) % projects.length].id,
      };
    }),
  );

  // Keep the running monthly balance realistic. The seven-day cockpit data
  // above deliberately does not cover earlier working days in this month.
  const currentDayOfMonth = Number(today.slice(8, 10));
  for (let offset = currentDayOfMonth - 1; offset >= 7; offset -= 1) {
    const date = epochToDate(todayEpoch - offset);
    const weekday = (todayEpoch - offset + 4) % 7;
    if (weekday === 0 || weekday === 6) continue;
    entryRows.push({
      tenant_id: tenantId,
      employee_id: adminEmployee.id,
      date,
      clock_in: `${date}T07:00:00.000Z`,
      clock_out: `${date}T15:30:00.000Z`,
      break_minutes: 30,
      status: "completed",
      project_id: projects[0].id,
    });
  }
  const { data: entries, error: entryError } = await adminClient
    .from("time_entries")
    .insert(entryRows)
    .select("id, employee_id, project_id, clock_in");
  if (entryError || !entries) throw entryError ?? new Error("Demo entries missing.");

  const activeClockIn = new Date(Date.now() - (6 * 60 + 42) * 60_000).toISOString();
  const { data: activeEntry, error: activeError } = await adminClient
    .from("time_entries")
    .insert({
      tenant_id: tenantId,
      employee_id: adminEmployee.id,
      date: today,
      clock_in: activeClockIn,
      break_minutes: 30,
      status: "running",
      project_id: projects[0].id,
    })
    .select("id, employee_id, project_id, clock_in")
    .single();
  if (activeError || !activeEntry) throw activeError ?? new Error("Active demo entry missing.");

  const auditEntries = [...entries.slice(-10), activeEntry];
  const { error: auditError } = await adminClient.from("time_entry_audit").insert(
    auditEntries.map((entry, index) => ({
      time_entry_id: entry.id,
      tenant_id: tenantId,
      changed_by: entry.employee_id,
      action: "create",
      field_name: "clock_in",
      new_value: entry.clock_in,
      reason: index === auditEntries.length - 1 ? "Eingestempelt" : "Arbeitszeit erfasst",
      changed_at: entry.clock_in,
    })),
  );
  if (auditError) throw auditError;

  const correctionEntry = entries.find((entry) => entry.employee_id === employees[0].id);
  if (!correctionEntry) throw new Error("Correction demo entry missing.");
  const { error: correctionError } = await adminClient.from("correction_requests").insert({
    tenant_id: tenantId,
    employee_id: employees[0].id,
    time_entry_id: correctionEntry.id,
    proposed_change: { clock_out: "16:30" },
    reason: "Ausstempeln am Vortag vergessen",
    status: "pending",
  });
  if (correctionError) throw correctionError;
});

test.afterAll(async () => {
  await cleanupTestUser(EMAIL);
});

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(EMAIL);
  await page.getByLabel("Passwort").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /anmelden/i }).click();
  await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 15_000 });
}

test("captures the real product for the marketing site", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await login(page);
  await expect(page.getByTestId("cockpit-overview")).toBeVisible();
  await page.screenshot({ path: resolve(OUTPUT_DIR, "cockpit.png"), animations: "disabled" });

  await page.getByRole("tab", { name: /aktivitäten/i }).click();
  await expect(page.getByTestId("cockpit-activity")).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0 }));
  await page.screenshot({ path: resolve(OUTPUT_DIR, "activity-log.png"), animations: "disabled" });

  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/app/clock");
  await expect(page.getByRole("heading", { name: "Stempeln" })).toBeVisible();
  // Let the product's balance and progress animations reach their final state.
  await page.waitForTimeout(800);
  await page.screenshot({ path: resolve(OUTPUT_DIR, "mobile-clock.png"), animations: "disabled" });

  await page.setViewportSize({ width: 1600, height: 1200 });
  await page.goto("/");
  await page.addStyleTag({ content: "header { display: none !important; }" });
  const showcase = page.getByTestId("product-showcase");
  await expect(showcase).toBeVisible();
  await showcase.locator("img").last().evaluate(async (image) => {
    await (image as HTMLImageElement).decode();
  });
  await showcase.screenshot({
    path: resolve(OUTPUT_DIR, "readme-showcase.png"),
    animations: "disabled",
  });
});
