import { test, expect, type Page } from "@playwright/test";
import { adminClient } from "./helpers";
import { setupProjectAssignmentEnv, teardownProjectAssignmentEnv, loginAs, PROJECT_NAME, type ProjectAssignmentEnv } from "./project-assignment-fixtures";

test.describe("Project counts include only active employees", () => {
  let env: ProjectAssignmentEnv;
  let formerOnlyProject: string;
  let emptyProject: string;
  let inactiveProject: string;
  const card = (page: Page, name: string) => page.locator('[data-slot="card-content"]').filter({ hasText: name });

  test.beforeAll(async () => {
    env = await setupProjectAssignmentEnv("active-project-counts");
    const { data, error } = await adminClient.from("projects").insert([
      { tenant_id: env.tenantId, name: "Nur frühere Mitarbeiter", active: true },
      { tenant_id: env.tenantId, name: "Ohne Zuordnung", active: true },
      { tenant_id: env.tenantId, name: "Inaktives Projekt", active: false },
    ]).select("id, name");
    if (error) throw error;
    formerOnlyProject = data.find(p => p.name === "Nur frühere Mitarbeiter")!.id;
    emptyProject = data.find(p => p.name === "Ohne Zuordnung")!.id;
    inactiveProject = data.find(p => p.name === "Inaktives Projekt")!.id;
    const assigned = await adminClient.from("project_assignments").insert([
      { tenant_id: env.tenantId, project_id: env.projectId, employee_id: env.employee2EmpId },
      { tenant_id: env.tenantId, project_id: formerOnlyProject, employee_id: env.employee2EmpId },
      { tenant_id: env.tenantId, project_id: inactiveProject, employee_id: env.employeeEmpId },
      { tenant_id: env.tenantId, project_id: inactiveProject, employee_id: env.employee2EmpId },
    ]);
    if (assigned.error) throw assigned.error;
  });

  test.beforeEach(async () => {
    const { error } = await adminClient.from("employees").update({ deleted_at: null }).eq("id", env.employee2EmpId);
    if (error) throw error;
  });
  test.afterAll(async () => { await teardownProjectAssignmentEnv(env); });

  test("excludes deactivated people while retaining projects with zero active assignments", async ({ page }) => {
    const { error } = await adminClient.from("employees").update({ deleted_at: new Date().toISOString() }).eq("id", env.employee2EmpId);
    if (error) throw error;
    await loginAs(page, env.adminEmail);
    const response = await page.request.get("/api/v1/projects");
    expect(response.ok()).toBe(true);
    const { data } = await response.json();
    const counts = new Map(data.map((p: { id: string; employee_count: number }) => [p.id, p.employee_count]));
    expect(counts.get(env.projectId)).toBe(1);
    expect(counts.get(formerOnlyProject)).toBe(0);
    expect(counts.get(emptyProject)).toBe(0);
    expect(counts.has(inactiveProject)).toBe(false);
    const all = await (await page.request.get("/api/v1/projects?all=true")).json();
    expect(all.data.find((p: { id: string }) => p.id === inactiveProject).employee_count).toBe(1);
    const stored = await adminClient.from("project_assignments").select("id", { count: "exact", head: true }).eq("project_id", env.projectId);
    expect(stored.count).toBe(2);
  });

  test("deactivating an employee immediately updates cached project counts", async ({ page }) => {
    await loginAs(page, env.adminEmail);
    await page.locator('a[href="/app/projects"]').first().click();
    await expect(card(page, PROJECT_NAME).getByText("2 Mitarbeiter", { exact: true })).toBeVisible();
    await page.locator('a[href="/app/employees"]').first().click();
    const row = page.getByText("Sarah Kollegin", { exact: true }).locator("../..");
    page.once("dialog", dialog => dialog.accept());
    await row.getByRole("button", { name: "Deaktivieren", exact: true }).click();
    await expect(page.getByText("2 aktive Mitarbeiter", { exact: true })).toBeVisible();
    await page.locator('a[href="/app/projects"]').first().click();
    await expect(card(page, PROJECT_NAME).getByText("1 Mitarbeiter", { exact: true })).toBeVisible();
    await expect(card(page, "Nur frühere Mitarbeiter").getByText("0 Mitarbeiter", { exact: true })).toBeVisible();
    await card(page, PROJECT_NAME).getByTitle("Mitarbeiter zuordnen").click();
    await expect(card(page, PROJECT_NAME).getByRole("checkbox", { name: "Lukas Mitarbeiter" })).toBeChecked();
    await expect(card(page, PROJECT_NAME).getByRole("checkbox", { name: "Sarah Kollegin" })).toHaveCount(0);
  });
});
