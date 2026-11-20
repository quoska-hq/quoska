/**
 * Epic 11: Project Reports — E2E
 *
 * Split out of project-assignment.spec.ts to keep files under the 300-line
 * limit (NFR-8). These tests verify the Projekte tab on the reports page:
 * project hours, the "Ohne Projekt" bucket, and week navigation.
 *
 * Shared setup lives in project-assignment-fixtures.ts.
 */

import { test, expect, type Page } from "@playwright/test";
import { berlinDateTimeToIso, formatDateFullDE, getLocalToday } from "@/config/client/date-utils";
import { adminClient } from "./helpers";
import {
  setupProjectAssignmentEnv,
  teardownProjectAssignmentEnv,
  loginAs,
  PROJECT_NAME,
  type ProjectAssignmentEnv,
} from "./project-assignment-fixtures";

test.describe("Project Reports — Epic 11", () => {
  let env: ProjectAssignmentEnv;
  // Describe-scope aliases so test bodies reference them verbatim.
  let tenantId: string;
  let employeeEmpId: string;
  let employee2EmpId: string;
  let projectId: string;
  const reportDate = getLocalToday();

  const loginAsAdmin = (page: Page) => loginAs(page, env.adminEmail);

  test.beforeAll(async () => {
    env = await setupProjectAssignmentEnv("pr", 1);
    tenantId = env.tenantId;
    employeeEmpId = env.employeeEmpId;
    employee2EmpId = env.employee2EmpId;
    projectId = env.projectId;
    const entry = {
      tenant_id: tenantId,
      date: reportDate,
      clock_in: berlinDateTimeToIso(reportDate, "08:00"),
      clock_out: berlinDateTimeToIso(reportDate, "12:00"),
      break_minutes: 30,
      status: "completed",
    };
    const { error } = await adminClient.from("time_entries").insert([
      { ...entry, employee_id: employeeEmpId, project_id: projectId },
      { ...entry, employee_id: employee2EmpId, project_id: null, break_minutes: 0 },
      {
        ...entry, employee_id: employee2EmpId, project_id: projectId, break_minutes: 0,
        clock_in: berlinDateTimeToIso(reportDate, "13:00"),
        clock_out: berlinDateTimeToIso(reportDate, "15:00"),
      },
    ]);
    expect(error).toBeNull();
  });

  test.afterAll(async () => {
    await teardownProjectAssignmentEnv(env);
  });

  test("reports page has Projekte tab", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/app/reports");
    await expect(page.getByRole("tab", { name: /projekte/i })).toBeVisible({ timeout: 5_000 });
  });

  test("project bookings and CSV share the selected month, project and employee", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/app/projects");
    await page.getByRole("link", { name: `Projektbericht für ${PROJECT_NAME}`, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`tab=projects&projectId=${projectId}`));
    await expect(page.getByRole("cell", { name: PROJECT_NAME, exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("columnheader", { name: "Stunden" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Ohne Projekt", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Monat", exact: true }).click();
    await expect(page.getByText(/dieser monat/i)).toBeVisible();
    await page.getByRole("combobox", { name: "Mitarbeiter filtern" }).click();
    await page.getByRole("option", { name: "Lukas Mitarbeiter" }).click();

    const bookings = page.getByRole("table", { name: `Buchungen für ${PROJECT_NAME}` });
    await expect(bookings.getByRole("row")).toHaveCount(2);
    for (const cell of [formatDateFullDE(reportDate), "Lukas Mitarbeiter", "08:00", "12:00", "30 Min", "3 Std 30 Min"]) {
      await expect(bookings.getByRole("cell", { name: cell, exact: true })).toBeVisible();
    }

    const csvResponse = page.waitForResponse((response) => response.url().includes("/reports/export/csv?"));
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "CSV Export" }).click();
    const response = await csvResponse;
    expect(response.ok()).toBe(true);
    const params = new URL(response.url()).searchParams;
    expect(params.get("employeeId")).toBe(employeeEmpId);
    expect(params.get("projectId")).toBe(projectId);
    expect(params.get("startDate")).toBe(`${reportDate.slice(0, 7)}-01`);
    const stream = await (await download).createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk);
    const [, ...data] = Buffer.concat(chunks).toString("utf-8").split("\n");
    expect(data).toEqual([`Lukas Mitarbeiter,${formatDateFullDE(reportDate)},08:00,12:00,30,3:30,,${PROJECT_NAME}`]);
  });

  test("project report shows Ohne Projekt for unassigned entries", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/app/reports");
    await page.getByRole("tab", { name: /projekte/i }).click();

    await expect(page.getByRole("cell", { name: /ohne projekt/i })).toBeVisible({ timeout: 10_000 });
  });

  test("project report has week navigation", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/app/reports");
    await page.getByRole("tab", { name: /projekte/i }).click();

    await expect(page.getByText(/diese woche/i)).toBeVisible({ timeout: 5_000 });
  });

  test("the weekly drill-down and CSV include the project name", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/app/reports");
    const csv = await page.request.get(`/api/v1/reports/export/csv?startDate=${reportDate}&endDate=${reportDate}`);
    expect(csv.ok()).toBe(true);
    expect(await csv.text()).toContain(PROJECT_NAME);
    await page.getByRole("button", { name: "Lukas Mitarbeiter", exact: true }).click();
    await expect(page.getByText(PROJECT_NAME, { exact: true })).toBeVisible();
  });
});
