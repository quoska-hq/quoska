import { test, expect, type Page } from "@playwright/test";
import { adminClient } from "./helpers";
import {
  setupProjectAssignmentEnv, teardownProjectAssignmentEnv, loginAs,
  PROJECT_NAME, type ProjectAssignmentEnv,
} from "./project-assignment-fixtures";

const selector = (page: Page) => page.getByRole("combobox", { name: "Projektzuordnung" });

async function chooseProject(page: Page, name: string) {
  await selector(page).click();
  await page.getByRole("option", { name, exact: true }).click();
}

test.describe("Project search and remembered selection", () => {
  let env: ProjectAssignmentEnv;
  let secondProjectId: string;

  test.beforeAll(async () => {
    env = await setupProjectAssignmentEnv("project-search");
    const { data, error } = await adminClient.from("projects").insert({
      tenant_id: env.tenantId, name: "Heizung Wartung", customer_name: "Schmidt GmbH", color: "#22c55e",
    }).select("id").single();
    if (error) throw error;
    secondProjectId = data.id;
    await adminClient.from("project_assignments").insert({
      tenant_id: env.tenantId, project_id: secondProjectId, employee_id: env.employeeEmpId,
    });
  });

  test.beforeEach(async () => {
    await adminClient.from("time_entries").delete().eq("tenant_id", env.tenantId);
  });

  test.afterAll(async () => { await teardownProjectAssignmentEnv(env); });

  test("filters the project list immediately by project or customer, with an empty state", async ({ page }) => {
    await loginAs(page, env.adminEmail);
    await page.goto("/app/projects");
    const search = page.getByRole("searchbox", { name: "Projekte durchsuchen" });
    await expect(page.getByText(PROJECT_NAME, { exact: true })).toBeVisible();
    await search.fill("  HEIZUNG  ");
    await expect(page.getByText("Heizung Wartung", { exact: true })).toBeVisible();
    await expect(page.getByText(PROJECT_NAME, { exact: true })).toHaveCount(0);
    await search.fill("müller");
    await expect(page.getByText(PROJECT_NAME, { exact: true })).toBeVisible();
    await expect(page.getByText("Heizung Wartung", { exact: true })).toHaveCount(0);
    await search.fill("unbekanntes Projekt");
    await expect(page.getByRole("status")).toHaveText("Keine passenden Projekte gefunden.");
    await search.clear();
    await expect(page.getByText(PROJECT_NAME, { exact: true })).toBeVisible();
    await expect(page.getByText("Heizung Wartung", { exact: true })).toBeVisible();
  });

  test("searches with keyboard and remembers selection through reload and clock-out", async ({ page }) => {
    await loginAs(page, env.employeeEmail);
    await page.goto("/app/clock");
    await selector(page).click();
    const search = page.getByRole("combobox", { name: "Projekt suchen" });
    await search.fill("does not exist");
    await expect(page.getByText("Keine passenden Projekte gefunden.")).toBeVisible();
    await search.fill("heizung");
    await expect(page.getByRole("option", { name: PROJECT_NAME })).toHaveCount(0);
    await expect(page.getByRole("option", { name: "Heizung Wartung" })).toBeVisible();
    await search.press("ArrowDown");
    await search.press("Enter");
    await expect(selector(page)).toContainText("Heizung Wartung");
    await page.reload();
    await expect(selector(page)).toContainText("Heizung Wartung");
    const clockIn = page.waitForResponse((response) => response.url().endsWith("/api/v1/clock/in"));
    await page.getByRole("button", { name: /^stempeln$/i }).click();
    expect((await clockIn).ok()).toBe(true);
    await expect(page.getByRole("button", { name: /ausstempeln/i })).toBeVisible();
    const { data } = await adminClient.from("time_entries").select("project_id")
      .eq("employee_id", env.employeeEmpId).eq("status", "running").single();
    expect(data?.project_id).toBe(secondProjectId);
    const clockOut = page.waitForResponse((response) => response.url().endsWith("/api/v1/clock/out"));
    await page.getByRole("button", { name: /ausstempeln/i }).click();
    expect((await clockOut).ok()).toBe(true);
    await expect(selector(page)).toContainText("Heizung Wartung");
    await page.reload();
    await expect(selector(page)).toContainText("Heizung Wartung");
    await chooseProject(page, "Kein Projekt");
    await page.reload();
    await expect(selector(page)).toContainText("Kein Projekt");
    const clockInWithoutProject = page.waitForResponse((response) => response.url().endsWith("/api/v1/clock/in"));
    await page.getByRole("button", { name: /^stempeln$/i }).click();
    expect((await clockInWithoutProject).ok()).toBe(true);
    await expect(page.getByRole("button", { name: /ausstempeln/i })).toBeVisible();
    const { data: unassigned } = await adminClient.from("time_entries").select("project_id")
      .eq("employee_id", env.employeeEmpId).eq("status", "running").single();
    expect(unassigned?.project_id).toBeNull();
  });

  test("uses the last tracked project in a fresh browser and drops a removed assignment", async ({ page }) => {
    const now = new Date();
    const date = now.toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
    const { error } = await adminClient.from("time_entries").insert({
      tenant_id: env.tenantId, employee_id: env.employeeEmpId, date,
      clock_in: new Date(now.getTime() - 3600_000).toISOString(), clock_out: now.toISOString(),
      break_minutes: 0, status: "completed", project_id: secondProjectId,
    });
    if (error) throw error;
    await loginAs(page, env.employeeEmail);
    await page.goto("/app/clock");
    await expect(selector(page)).toContainText("Heizung Wartung");
    await chooseProject(page, PROJECT_NAME);
    await adminClient.from("project_assignments").delete()
      .eq("employee_id", env.employeeEmpId).eq("project_id", env.projectId);
    try {
      await page.reload();
      await expect(selector(page)).toContainText("Kein Projekt");
      await selector(page).click();
      await expect(page.getByRole("option", { name: PROJECT_NAME })).toHaveCount(0);
    } finally {
      await adminClient.from("project_assignments").insert({
        tenant_id: env.tenantId, employee_id: env.employeeEmpId, project_id: env.projectId,
      });
    }
  });

  test("keeps choices separate for different employees in the same browser", async ({ page }) => {
    await adminClient.from("project_assignments").insert({
      tenant_id: env.tenantId, project_id: secondProjectId, employee_id: env.employee2EmpId,
    });
    await loginAs(page, env.employeeEmail);
    await page.goto("/app/clock");
    await chooseProject(page, "Heizung Wartung");
    await loginAs(page, env.employee2Email);
    await page.goto("/app/clock");
    await expect(selector(page)).toContainText("Kein Projekt");
    await loginAs(page, env.employeeEmail);
    await page.goto("/app/clock");
    await expect(selector(page)).toContainText("Heizung Wartung");
  });
});
