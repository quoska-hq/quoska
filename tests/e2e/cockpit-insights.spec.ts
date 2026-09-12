import { test, expect, type Page } from "@playwright/test";
import { epochToDate, formatDateFullDE, getCurrentEpochDays } from "@/config/client/date-utils";
import { adminClient } from "./helpers";
import { setupProjectAssignmentEnv, teardownProjectAssignmentEnv, loginAs, PROJECT_NAME, type ProjectAssignmentEnv } from "./project-assignment-fixtures";

const distribution = (page: Page) => page.getByTestId("cockpit-project-distribution");
const trend = (page: Page) => page.getByTestId("cockpit-work-trend");

test.describe("Cockpit charts and expandable projects", () => {
  let env: ProjectAssignmentEnv;
  let today: string;
  let historicalDate: string;

  test.beforeAll(async () => {
    env = await setupProjectAssignmentEnv("cockpit-insights");
    today = epochToDate(getCurrentEpochDays());
    historicalDate = epochToDate(getCurrentEpochDays() - 20);
    const { error: employmentError } = await adminClient.from("employees")
      .update({ employment_start_date: historicalDate }).eq("tenant_id", env.tenantId);
    if (employmentError) throw employmentError;
    const { data: projects, error: projectError } = await adminClient.from("projects").insert([
      { name: "Werkstatt", color: "#d97706" },
      { name: "Sanierung Nord", color: "#0d9488" },
      { name: "Kundendienst", color: "#3b82f6" },
      { name: "Planung", color: "#e879a0" },
      { name: "Montage", color: "#65a30d" },
      { name: "Ein sehr langer Projektname für die mobile Darstellung ohne abgeschnittene Namen", color: "#64748b" },
    ].map((project) => ({ ...project, tenant_id: env.tenantId }))).select("id");
    if (projectError) throw projectError;
    const { error: entryError } = await adminClient.from("time_entries").insert([
      { employee_id: env.employeeEmpId, project_id: env.projectId, date: today, clock_in: `${today}T07:00:00Z`, clock_out: `${today}T09:15:00Z`, break_minutes: 15 },
      { employee_id: env.employee2EmpId, project_id: env.projectId, date: today, clock_in: `${today}T07:00:00Z`, clock_out: `${today}T08:00:00Z`, break_minutes: 0 },
      { employee_id: env.employeeEmpId, project_id: env.projectId, date: historicalDate, clock_in: `${historicalDate}T07:00:00Z`, clock_out: `${historicalDate}T10:00:00Z`, break_minutes: 0 },
      ...(projects ?? []).map((project, index) => ({
        employee_id: env.employeeEmpId, project_id: project.id, date: today,
        clock_in: `${today}T${String(10 + Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}:00Z`,
        clock_out: `${today}T${String(10 + Math.floor((index + 1) / 2)).padStart(2, "0")}:${index % 2 ? "00" : "30"}:00Z`, break_minutes: 0,
      })),
      { employee_id: env.employeeEmpId, project_id: null, date: today, clock_in: `${today}T14:00:00Z`, clock_out: `${today}T14:15:00Z`, break_minutes: 0 },
    ].map((entry) => ({ ...entry, tenant_id: env.tenantId, status: "completed" })));
    if (entryError) throw entryError;
  });

  test.afterAll(async () => { await teardownProjectAssignmentEnv(env); });

  test("expands project contributors, opens their details and reveals all project groups", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await loginAs(page, env.adminEmail);
    const project = distribution(page).locator("details").filter({ hasText: PROJECT_NAME });
    await expect(project.locator("summary")).toContainText("3 Std.");
    await expect(project.locator("summary")).toContainText("2 Personen");
    await expect(project.getByRole("button", { name: "Mitarbeiterdetails für Lukas Mitarbeiter" })).toBeHidden();
    await project.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(project.getByRole("button", { name: "Mitarbeiterdetails für Lukas Mitarbeiter" })).toContainText("2 Std.");
    await expect(project.getByRole("button", { name: "Mitarbeiterdetails für Sarah Kollegin" })).toContainText("1 Std.");
    await project.getByRole("button", { name: "Mitarbeiterdetails für Lukas Mitarbeiter" }).click();
    await expect(page.getByTestId("employee-cockpit-drawer")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("Lukas Mitarbeiter");
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(distribution(page).locator("details:visible")).toHaveCount(5);
    const more = distribution(page).getByRole("button", { name: "3 weitere anzeigen" });
    await more.click();
    await expect(distribution(page).locator("details:visible")).toHaveCount(8);
    await expect(distribution(page).getByText("Ohne Projekt", { exact: true })).toBeVisible();
    await distribution(page).getByRole("button", { name: "Weniger anzeigen" }).click();
    await expect(distribution(page).locator("details:visible")).toHaveCount(5);
    await page.mouse.move(0, 0);
    await trend(page).locator("..").screenshot({ path: testInfo.outputPath("cockpit-desktop.png") });
  });

  test("keeps contributors and totals within the employee and period filters", async ({ page }) => {
    await loginAs(page, env.adminEmail);
    await page.getByLabel("Mitarbeiter filtern").click();
    await page.getByRole("option", { name: "Lukas Mitarbeiter" }).click();
    const project = distribution(page).locator("details").filter({ hasText: PROJECT_NAME });
    await expect(project.locator("summary")).toContainText("2 Std.");
    await project.locator("summary").click();
    await expect(project.getByRole("button", { name: "Mitarbeiterdetails für Lukas Mitarbeiter" })).toBeVisible();
    await expect(project).not.toContainText("Sarah Kollegin");
    await page.getByLabel("Zeitraum", { exact: true }).click();
    await page.getByRole("option", { name: "30 Tage", exact: true }).click();
    await expect(project.locator("summary")).toContainText("5 Std.");
    await project.locator("summary").click();
    await expect(project.getByRole("button", { name: "Mitarbeiterdetails für Lukas Mitarbeiter" })).toContainText("5 Std.");
    await page.getByLabel("Mitarbeiter filtern").click();
    await page.getByRole("option", { name: "Anna Admin" }).click();
    await expect(distribution(page)).toContainText("Noch keine Projektzeit.");
    await expect(trend(page)).toContainText("Noch keine abgeschlossenen Zeiten im Zeitraum.");
  });

  test("selects days with pointer and keyboard and exposes full German dates", async ({ page }) => {
    await loginAs(page, env.adminEmail);
    await page.getByLabel("Zeitraum", { exact: true }).click();
    await page.getByRole("option", { name: "30 Tage", exact: true }).click();
    const chart = trend(page).getByRole("group", { name: "Arbeitszeit und Sollzeit pro Tag" });
    await expect(chart.getByRole("button")).toHaveCount(30);
    const historical = chart.getByRole("button", { name: new RegExp(`^${formatDateFullDE(historicalDate).replaceAll(".", "\\.")}`) });
    await historical.click();
    await expect(historical).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("cockpit-day-detail")).toContainText(formatDateFullDE(historicalDate));
    await expect(page.getByTestId("cockpit-day-detail")).toContainText("3 Std.");
    await historical.press("ArrowRight");
    await expect(chart.getByRole("button").nth(10)).toBeFocused();
    await page.keyboard.press("Home");
    await expect(chart.getByRole("button").first()).toBeFocused();
    await page.keyboard.press("End");
    await expect(chart.getByRole("button").last()).toBeFocused();
    await expect(page.getByTestId("cockpit-day-detail")).toContainText(formatDateFullDE(today));
  });

  test("fits the 30-day chart and expanded long project names on small screens", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await loginAs(page, env.adminEmail);
    await page.getByLabel("Zeitraum", { exact: true }).click();
    await page.getByRole("option", { name: "30 Tage", exact: true }).click();
    await distribution(page).getByRole("button", { name: "3 weitere anzeigen" }).click();
    const longProject = distribution(page).locator("details").filter({ hasText: "Ein sehr langer Projektname" });
    await longProject.locator("summary").click();
    await expect(longProject.getByRole("button", { name: "Mitarbeiterdetails für Lukas Mitarbeiter" })).toBeVisible();
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const card of [trend(page), distribution(page)]) {
        const box = await card.boundingBox();
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
        expect(await card.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      }
    }
    await page.setViewportSize({ width: 375, height: 900 });
    await trend(page).scrollIntoViewIfNeeded();
    await trend(page).getByRole("group").getByRole("button").first().click();
    await expect(trend(page).getByRole("group").getByRole("button").first()).toHaveAttribute("aria-pressed", "true");
    await trend(page).screenshot({ path: testInfo.outputPath("cockpit-mobile-chart.png") });
    await distribution(page).screenshot({ path: testInfo.outputPath("cockpit-mobile-projects.png") });
  });
});
