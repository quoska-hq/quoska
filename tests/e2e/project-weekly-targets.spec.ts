import { expect, test } from "@playwright/test";
import { berlinDateTimeToIso, formatDateFullDE, getWeekBoundsForOffset } from "@/config/client/date-utils";
import { addDays } from "@/services/holidayService";
import { adminClient } from "./helpers";
import {
  loginAs, PROJECT_NAME, setupProjectAssignmentEnv, teardownProjectAssignmentEnv,
  type ProjectAssignmentEnv,
} from "./project-assignment-fixtures";

test.describe("Wochenziele und Projektstundenkonten", () => {
  let team: ProjectAssignmentEnv;
  const { start, end } = getWeekBoundsForOffset(-1);

  test.beforeAll(async () => {
    team = await setupProjectAssignmentEnv("project-target");
  });
  test.afterAll(async () => {
    await teardownProjectAssignmentEnv(team);
  });

  test("saves a target in the project and keeps two balances independent for the same person", async ({ page }) => {
    const { tenantId, projectId, employeeEmpId } = team;
    const second = await adminClient.from("projects")
      .insert({ tenant_id: tenantId, name: "Zweite Arbeitsstelle" }).select("id").single();
    expect(second.error).toBeNull();
    const secondId: string = second.data!.id;
    const assignment = await adminClient.from("project_assignments")
      .insert({ tenant_id: tenantId, project_id: secondId, employee_id: employeeEmpId });
    expect(assignment.error).toBeNull();
    const booking = await adminClient.from("time_entries").insert({
      tenant_id: tenantId, project_id: projectId, employee_id: employeeEmpId, date: start,
      clock_in: berlinDateTimeToIso(start, "08:00"), clock_out: berlinDateTimeToIso(start, "12:00"),
      break_minutes: 30, status: "completed",
    });
    expect(booking.error).toBeNull();

    await loginAs(page, team.adminEmail);
    await page.goto("/app/projects");
    await page.getByRole("button", { name: `Wochenziele für ${PROJECT_NAME}` }).click();
    const from = page.getByLabel("Gültig ab", { exact: true });
    await from.fill(formatDateFullDE(start));
    await from.press("Tab");
    await page.getByLabel("Stunden pro Woche", { exact: true }).fill("3");
    await page.getByLabel("Minuten pro Woche", { exact: true }).fill("0");
    const save = page.waitForResponse(res => res.url().endsWith(`/projects/${projectId}/targets`) && res.request().method() === "PATCH");
    await page.getByRole("button", { name: "Ziel speichern", exact: true }).click();
    expect((await save).status()).toBe(200);

    const secondTarget = await page.request.patch(`/api/v1/projects/${secondId}/targets`, {
      data: { employeeId: employeeEmpId, effectiveFrom: start, weeklyMinutes: 300 },
    });
    expect(secondTarget.status()).toBe(200);
    const result = await page.request.get(`/api/v1/reports/project-balances?startDate=${start}&endDate=${end}&employeeId=${employeeEmpId}`);
    expect(result.status()).toBe(200);
    expect((await result.json()).data).toEqual(expect.arrayContaining([
      expect.objectContaining({ projectId, employeeId: employeeEmpId, targetMinutes: 180, actualMinutes: 210, balanceMinutes: 30 }),
      expect.objectContaining({ projectId: secondId, targetMinutes: 300, actualMinutes: 0, balanceMinutes: -300 }),
    ]));
    await page.goto("/app/reports?tab=projects");
    await page.getByRole("button", { name: "Vorwoche", exact: true }).click();
    await expect(page.getByRole("region", { name: "Projektkonten" }).getByRole("cell", { name: "Zweite Arbeitsstelle", exact: true })).toBeVisible();

    await page.goto("/app/projects");
    await page.getByRole("button", { name: `Wochenziele für ${PROJECT_NAME}` }).click();
    await page.getByRole("button", { name: "Ziel beenden", exact: true }).click();
    await from.fill(formatDateFullDE(addDays(start, 1)));
    await from.press("Tab");
    await page.getByRole("button", { name: "Beendigung speichern", exact: true }).click();
    await expect(page.getByText("Beendigung gespeichert.", { exact: true })).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: `Wochenziele für ${PROJECT_NAME}` }).click();
    await page.getByText("Zielverlauf", { exact: true }).click();
    await expect(page.getByText(`Ab ${formatDateFullDE(addDays(start, 1))} · Kein Wochenziel`)).toBeVisible();
    const changed = await page.request.get(`/api/v1/reports/project-balances?startDate=${start}&endDate=${end}&projectId=${projectId}`);
    expect((await changed.json()).data).toEqual([
      expect.objectContaining({ projectId, targetMinutes: 36, actualMinutes: 210, balanceMinutes: 174 }),
    ]);
  });
});
