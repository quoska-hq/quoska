import { test, expect, type Page } from "@playwright/test";
import { adminClient } from "./helpers";
import { setupProjectAssignmentEnv, teardownProjectAssignmentEnv, loginAs, PROJECT_NAME, type ProjectAssignmentEnv } from "./project-assignment-fixtures";

test.describe("Project management across navigation and saves", () => {
  let env: ProjectAssignmentEnv;
  const project = (page: Page) => page.locator('[data-slot="card-content"]').filter({ hasText: PROJECT_NAME });
  const navigate = (page: Page, section: string) => page.locator(`a[href="/app/${section}"]`).first().click();

  test.beforeAll(async () => { env = await setupProjectAssignmentEnv("project-navigation"); });
  test.afterAll(async () => { await teardownProjectAssignmentEnv(env); });
  test.beforeEach(async ({ page }) => {
    await adminClient.from("project_assignments").delete().eq("project_id", env.projectId);
    await adminClient.from("project_assignments").insert({ tenant_id: env.tenantId, project_id: env.projectId, employee_id: env.employeeEmpId });
    await loginAs(page, env.adminEmail);
  });

  test("employee → project → employee navigation preserves data and does not crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await navigate(page, "employees");
    await expect(page.getByText("3 aktive Mitarbeiter", { exact: true })).toBeVisible();
    await navigate(page, "projects");
    await project(page).getByTitle("Mitarbeiter zuordnen").click();
    await expect(project(page).getByRole("checkbox", { name: "Lukas Mitarbeiter" })).toBeChecked();
    await navigate(page, "employees");
    await expect(page.getByText("3 aktive Mitarbeiter", { exact: true })).toBeVisible();
    await expect(page.getByText("Max. 3 Mitarbeiter im kostenlosen Tarif.", { exact: false })).toBeVisible();
    const row = page.getByText("Lukas Mitarbeiter", { exact: true }).locator("../..");
    await row.getByRole("button", { name: "Bearbeiten", exact: true }).click();
    await expect(page.getByLabel("Eintrittsdatum")).toHaveValue(/^\d{2}\.\d{2}\.\d{4}$/);
    expect(errors).toEqual([]);
  });

  test("project → employee navigation keeps the employee list and plan limit", async ({ page }) => {
    await navigate(page, "projects");
    await project(page).getByTitle("Mitarbeiter zuordnen").click();
    await expect(project(page).getByRole("checkbox", { name: "Lukas Mitarbeiter" })).toBeChecked();
    await navigate(page, "employees");
    await expect(page.getByText("3 aktive Mitarbeiter", { exact: true })).toBeVisible();
    await expect(page.getByText("Lukas Mitarbeiter", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Hinzufügen", exact: true })).toHaveCount(0);
  });

  test("reopening assignments immediately shows the saved selection", async ({ page }) => {
    await navigate(page, "projects");
    await project(page).getByTitle("Mitarbeiter zuordnen").click();
    await expect(project(page).getByRole("checkbox", { name: "Lukas Mitarbeiter" })).toBeChecked();
    await project(page).getByRole("checkbox", { name: "Lukas Mitarbeiter" }).uncheck();
    await project(page).getByRole("checkbox", { name: "Sarah Kollegin" }).check();
    await project(page).getByRole("button", { name: "Änderungen speichern" }).click();
    await expect(project(page).getByText("Mitarbeiter zuordnen:")).toHaveCount(0);
    await project(page).getByTitle("Mitarbeiter zuordnen").click();
    await expect(project(page).getByRole("checkbox", { name: "Sarah Kollegin" })).toBeChecked();
    await expect(project(page).getByRole("checkbox", { name: "Lukas Mitarbeiter" })).not.toBeChecked();
  });

  test("duplicate project names show the server error inside the dialog", async ({ page }) => {
    await navigate(page, "projects");
    await page.getByRole("button", { name: "Projekt hinzufügen" }).click();
    await page.getByLabel("Name *", { exact: true }).fill(PROJECT_NAME);
    await page.getByRole("button", { name: "Erstellen", exact: true }).click();
    await expect(page.getByRole("dialog").getByRole("alert")).toHaveText("Ein Projekt mit diesem Namen existiert bereits.");
    await expect(page.getByLabel("Name *", { exact: true })).toHaveValue(PROJECT_NAME);
  });

  test("a successful creation leaves the next project form empty", async ({ page }) => {
    await navigate(page, "projects");
    await page.getByRole("button", { name: "Projekt hinzufügen" }).click();
    await page.getByLabel("Name *", { exact: true }).fill("Nächstes Projekt");
    await page.getByLabel("Kunde", { exact: true }).fill("Testkunde");
    await page.getByRole("button", { name: "Erstellen", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "Projekt hinzufügen" }).click();
    await expect(page.getByLabel("Name *", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Kunde", { exact: true })).toHaveValue("");
  });

  test("employee loading failures are not shown as an empty company", async ({ page }) => {
    await page.route("**/api/v1/employees", route => route.fulfill({ status: 500, json: { data: null, error: "Mitarbeiter konnten nicht geladen werden." } }));
    await navigate(page, "employees");
    await expect(page.locator("main").getByRole("alert")).toContainText("Mitarbeiter konnten nicht geladen werden.");
    await expect(page.getByText("0 aktive Mitarbeiter", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Hinzufügen", exact: true })).toHaveCount(0);
    await page.unroute("**/api/v1/employees");
    await page.getByRole("button", { name: "Erneut laden", exact: true }).click();
    await expect(page.getByText("3 aktive Mitarbeiter", { exact: true })).toBeVisible();
  });

  test("assignment loading failures prevent overwriting unknown assignments", async ({ page }) => {
    const endpoint = `**/api/v1/projects/${env.projectId}/assign`;
    await page.route(endpoint, route => route.fulfill({ status: 500, json: { data: null, error: "Zuordnungen konnten nicht geladen werden." } }));
    await navigate(page, "projects");
    await project(page).getByTitle("Mitarbeiter zuordnen").click();
    await expect(project(page).getByRole("alert")).toContainText("Zuordnungen konnten nicht geladen werden.");
    await expect(project(page).getByRole("checkbox")).toHaveCount(0);
    await expect(project(page).getByRole("button", { name: "Änderungen speichern" })).toBeDisabled();
    await page.unroute(endpoint);
    await project(page).getByRole("button", { name: "Erneut laden" }).click();
    await expect(project(page).getByRole("checkbox", { name: "Lukas Mitarbeiter" })).toBeChecked();
  });

  test("a failed assignment save preserves edits and allows retry", async ({ page }) => {
    await navigate(page, "projects");
    await project(page).getByTitle("Mitarbeiter zuordnen").click();
    await expect(project(page).getByRole("checkbox", { name: "Lukas Mitarbeiter" })).toBeChecked();
    await project(page).getByRole("checkbox", { name: "Sarah Kollegin" }).check();
    const endpoint = `**/api/v1/projects/${env.projectId}/assign`;
    await page.route(endpoint, route => route.fulfill({ status: 500, json: { data: null, error: "Speichern fehlgeschlagen." } }));
    await project(page).getByRole("button", { name: "Änderungen speichern" }).click();
    await expect(project(page).getByRole("alert")).toHaveText("Speichern fehlgeschlagen.");
    await expect(project(page).getByRole("checkbox", { name: "Sarah Kollegin" })).toBeChecked();
    await page.unroute(endpoint);
    await project(page).getByRole("button", { name: "Änderungen speichern" }).click();
    await expect(project(page).getByText("Mitarbeiter zuordnen:")).toHaveCount(0);
    await project(page).getByTitle("Mitarbeiter zuordnen").click();
    await expect(project(page).getByRole("checkbox", { name: "Sarah Kollegin" })).toBeChecked();
  });

  test("changed project assignments are immediately available on the clock page", async ({ page }) => {
    await navigate(page, "clock");
    await expect(page.getByRole("button", { name: "Stempeln", exact: true })).toBeVisible();
    await navigate(page, "projects");
    await project(page).getByTitle("Mitarbeiter zuordnen").click();
    await project(page).getByRole("checkbox", { name: "Anna Admin" }).check();
    await project(page).getByRole("button", { name: "Änderungen speichern" }).click();
    await expect(project(page).getByText("Mitarbeiter zuordnen:")).toHaveCount(0);
    await navigate(page, "clock");
    await page.getByRole("combobox", { name: "Projektzuordnung" }).click();
    await expect(page.getByRole("option", { name: PROJECT_NAME })).toBeVisible();
  });
});
