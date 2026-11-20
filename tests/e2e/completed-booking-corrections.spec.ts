import { test, expect, type Page } from "@playwright/test";
import { berlinDateTimeToIso, formatDateFullDE, getWeekBoundsForOffset } from "@/config/client/date-utils";
import { adminClient } from "./helpers";
import {
  loginAs,
  PROJECT_NAME,
  setupProjectAssignmentEnv,
  teardownProjectAssignmentEnv,
  type ProjectAssignmentEnv,
} from "./project-assignment-fixtures";

const employeeName = "Lukas Mitarbeiter";
const otherEmployeeName = "Sarah Kollegin";
const assignmentReason = "Projekt für den Kundentermin nachgetragen";
const cancellationReason = "Buchung wurde versehentlich erfasst";

async function downloadBookings(page: Page) {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV Export", exact: true }).click();
  const stream = await (await download).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  const [header, ...rows] = Buffer.concat(chunks).toString("utf-8").split("\n");
  expect(header).toMatch(/,Projekt$/);
  return rows;
}

async function openPreviousWeek(page: Page, tab: "Projekte" | "Wochenbericht") {
  await page.getByRole("tab", { name: tab, exact: true }).click();
  const panel = page.getByRole("tabpanel", { name: tab, exact: true });
  await panel.getByRole("button", { name: "Vorwoche", exact: true }).click();
}

test.describe("Projektzuordnung und Storno abgeschlossener Buchungen", () => {
  let env: ProjectAssignmentEnv;
  let entryId: string;
  const { start: date } = getWeekBoundsForOffset(-1);
  const formattedDate = formatDateFullDE(date);
  const otherEntryLine = `${otherEmployeeName},${formattedDate},13:00,15:00,0,2:00,,${PROJECT_NAME}`;
  const correctedEntryLine = `${employeeName},${formattedDate},08:00,12:00,30,3:30,,`;

  test.beforeAll(async () => {
    env = await setupProjectAssignmentEnv("booking-correction");
    const { data, error } = await adminClient.from("time_entries").insert([
      {
        tenant_id: env.tenantId,
        employee_id: env.employeeEmpId,
        date,
        clock_in: berlinDateTimeToIso(date, "08:00"),
        clock_out: berlinDateTimeToIso(date, "12:00"),
        break_minutes: 30,
        status: "completed",
        project_id: null,
      },
      {
        tenant_id: env.tenantId,
        employee_id: env.employee2EmpId,
        date,
        clock_in: berlinDateTimeToIso(date, "13:00"),
        clock_out: berlinDateTimeToIso(date, "15:00"),
        break_minutes: 0,
        status: "completed",
        project_id: env.projectId,
      },
    ]).select("id,employee_id");
    expect(error).toBeNull();
    entryId = data!.find((entry) => entry.employee_id === env.employeeEmpId)!.id;
  });

  test.afterAll(async () => {
    await teardownProjectAssignmentEnv(env);
  });

  test("updates report and CSV after assignment and cancellation and preserves the audit", async ({ page }) => {
    await loginAs(page, env.adminEmail);
    await page.goto("/app/reports");

    const project = page.getByRole("button", { name: PROJECT_NAME, exact: true });
    const unassigned = page.getByRole("button", { name: "Ohne Projekt", exact: true });
    const edit = page.getByRole("dialog", { name: "Zeiteintrag bearbeiten" });
    const cancel = page.getByRole("dialog", { name: "Zeiteintrag stornieren" });
    const audit = page.getByRole("dialog", { name: "Verlauf" });
    const auditPath = `/api/v1/time-entries/${entryId}`;

    await openPreviousWeek(page, "Projekte");
    await expect(unassigned).toBeVisible();
    await unassigned.click();
    const unassignedBookings = page.getByRole("table", { name: "Buchungen für Ohne Projekt" });
    await expect(unassignedBookings).toContainText(employeeName);
    expect(await downloadBookings(page)).toEqual([`${correctedEntryLine}Ohne Projekt`, otherEntryLine]);

    await openPreviousWeek(page, "Wochenbericht");
    await page.getByRole("button", { name: employeeName, exact: true }).click();
    await page.getByRole("button", { name: "Bearbeiten", exact: true }).click();
    const projectSelector = edit.getByRole("combobox", { name: "Projektzuordnung", exact: true });
    await expect(projectSelector).toHaveText("Kein Projekt");
    await projectSelector.click();
    await page.getByRole("option", { name: PROJECT_NAME, exact: true }).click();
    await edit.getByRole("textbox", { name: /^Grund/ }).fill(assignmentReason);
    await edit.getByRole("button", { name: "Speichern", exact: true }).click();
    await expect(edit).toBeHidden();
    await expect(page.getByText(PROJECT_NAME, { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Verlauf", exact: true }).click();
    await expect(audit.getByText(assignmentReason, { exact: false })).toBeVisible();
    await audit.getByRole("button", { name: "Schließen", exact: true }).click();
    await page.getByRole("button", { name: "← Zurück", exact: true }).click();

    await openPreviousWeek(page, "Projekte");
    await expect(unassigned).toHaveCount(0);
    await expect(page.getByRole("row").filter({ has: project })).toContainText("5 Std 30 Min");
    await project.click();
    const projectBookings = page.getByRole("table", { name: `Buchungen für ${PROJECT_NAME}` });
    await expect(projectBookings).toContainText(employeeName);
    await expect(projectBookings).toContainText(otherEmployeeName);
    expect(await downloadBookings(page)).toEqual([`${correctedEntryLine}${PROJECT_NAME}`, otherEntryLine]);

    await openPreviousWeek(page, "Wochenbericht");
    await page.getByRole("button", { name: employeeName, exact: true }).click();
    await page.getByRole("button", { name: "Bearbeiten", exact: true }).click();
    await edit.getByRole("button", { name: "Stornieren", exact: true }).click();
    const confirmCancellation = cancel.getByRole("button", { name: "Eintrag stornieren", exact: true });
    await expect(confirmCancellation).toBeDisabled();
    await cancel.getByLabel("Grund für das Storno", { exact: true }).fill(cancellationReason);
    await confirmCancellation.click();
    await expect(cancel).toBeHidden();
    await expect(page.getByText("Storniert", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Bearbeiten", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Verlauf", exact: true }).click();
    await expect(audit.getByText(assignmentReason, { exact: false })).toBeVisible();
    await expect(audit.getByText(cancellationReason, { exact: false })).toBeVisible();

    const auditResponse = await page.request.get(auditPath);
    expect(auditResponse.ok()).toBe(true);
    expect((await auditResponse.json()).data).toEqual(expect.arrayContaining([
      expect.objectContaining({
        action: "update", field_name: "project_id", old_value: null, new_value: env.projectId,
        reason: assignmentReason,
      }),
      expect.objectContaining({
        action: "delete", field_name: "deleted_at", new_value: expect.any(String),
        reason: cancellationReason,
      }),
    ]));
    await audit.getByRole("button", { name: "Schließen", exact: true }).click();
    await page.getByRole("button", { name: "← Zurück", exact: true }).click();

    await openPreviousWeek(page, "Projekte");
    await expect(page.getByRole("row").filter({ has: project })).toContainText("2 Std 0 Min");
    await project.click();
    await expect(projectBookings).toContainText(otherEmployeeName);
    await expect(projectBookings).not.toContainText(employeeName);
    expect(await downloadBookings(page)).toEqual([otherEntryLine]);
  });
});
