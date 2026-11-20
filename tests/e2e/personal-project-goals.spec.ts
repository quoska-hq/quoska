import { expect, test } from "@playwright/test";
import { berlinDateTimeToIso, getWeekBoundsForOffset } from "@/config/client/date-utils";
import { adminClient } from "./helpers";
import {
  loginAs, PROJECT_NAME, setupProjectAssignmentEnv, teardownProjectAssignmentEnv, type ProjectAssignmentEnv,
} from "./project-assignment-fixtures";

test("employee sees their own full project week, bookings and remaining time from the clock", async ({ page }) => {
  let team: ProjectAssignmentEnv | undefined;
  try {
    team = await setupProjectAssignmentEnv("personal-goals");
    const { tenantId, projectId, employeeEmpId, employee2EmpId } = team;
    const previous = getWeekBoundsForOffset(-1).start;
    const current = getWeekBoundsForOffset(0).start;
    const other = await adminClient.from("project_assignments").insert({
      tenant_id: tenantId, project_id: projectId, employee_id: employee2EmpId,
    });
    expect(other.error).toBeNull();
    const targets = await adminClient.from("project_weekly_targets").insert([
      { tenant_id: tenantId, project_id: projectId, employee_id: employeeEmpId, effective_from: previous, weekly_minutes: 180 },
      { tenant_id: tenantId, project_id: projectId, employee_id: employeeEmpId, effective_from: current, weekly_minutes: 420 },
      { tenant_id: tenantId, project_id: projectId, employee_id: employee2EmpId, effective_from: previous, weekly_minutes: 1080 },
    ]);
    expect(targets.error).toBeNull();
    const booking = await adminClient.from("time_entries").insert({
      tenant_id: tenantId, project_id: projectId, employee_id: employeeEmpId, date: previous,
      clock_in: berlinDateTimeToIso(previous, "08:00"), clock_out: berlinDateTimeToIso(previous, "10:30"),
      break_minutes: 30, status: "completed",
    });
    expect(booking.error).toBeNull();

    await loginAs(page, team.employeeEmail);
    await page.goto("/app/clock");
    await page.getByRole("combobox", { name: "Projektzuordnung" }).click();
    await page.getByRole("option", { name: PROJECT_NAME, exact: true }).click();
    await page.getByRole("link", { name: "Meine Projektziele", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/my-times#projektziele$/);
    const region = page.getByRole("region", { name: "Meine Projektziele" });
    await expect(region).toContainText(PROJECT_NAME);
    const api = "/api/v1/my-times/project-goals?weekStart=";
    const response = await page.request.get(api + current);
    expect(response.status()).toBe(200);
    expect((await response.json()).data).toEqual([
      expect.objectContaining({ projectId, plannedMinutes: 420, actualMinutes: 0 }),
    ]);
    await page.getByRole("button", { name: "Vorwoche", exact: true }).click();
    await expect(region).toContainText(/1\s*(?:Std|h)/);
    const older = await page.request.get(api + previous);
    expect((await older.json()).data).toEqual([
      expect.objectContaining({ projectId, plannedMinutes: 180, actualMinutes: 120, balanceMinutes: -60 }),
    ]);
    expect((await page.request.get(api + current + "&employeeId=" + employee2EmpId)).status()).toBe(400);
    expect((await page.request.get("/api/v1/reports/project-balances?startDate=" + current + "&endDate=" + current)).status()).toBe(403);
  } finally {
    if (team) await teardownProjectAssignmentEnv(team);
  }
});
