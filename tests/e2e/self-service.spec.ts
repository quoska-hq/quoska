import { test, expect } from "@playwright/test";
import { adminClient, createTestUser, cleanupTestUser, TEST_PASSWORD } from "./helpers";
import { setupProjectAssignmentEnv, teardownProjectAssignmentEnv, loginAs, type ProjectAssignmentEnv } from "./project-assignment-fixtures";

test.describe("Self-service activation", () => {
  let env: ProjectAssignmentEnv;
  const operator = "analytics-owner@quoska.test";
  test.beforeAll(async () => {
    env = await setupProjectAssignmentEnv("self-service");
    await createTestUser({ email: operator, password: TEST_PASSWORD, firstName: "Test", lastName: "Betreiber", companyName: "Analytics Test" });
  });
  test.afterAll(async () => {
    await teardownProjectAssignmentEnv(env);
    await cleanupTestUser(operator);
  });

  test("saves optional team intent, preserves a failed draft, hides and restores the guide on mobile", async ({ page }, testInfo) => {
    await loginAs(page, env.adminEmail);
    const guide = page.getByTestId("start-guide");
    await expect(guide).toContainText("1 von 3 Schritten erledigt");
    await guide.getByRole("button", { name: "Freiwillig angeben" }).click();
    await guide.getByRole("radio", { name: "4–10 Personen", exact: true }).check();
    await page.route("**/api/v1/onboarding", async route => {
      if (route.request().method() === "PATCH") await route.fulfill({ status: 503, json: { error: "Speichern derzeit nicht möglich." } });
      else await route.continue();
    });
    await guide.getByRole("button", { name: "Angabe speichern" }).click();
    await expect(guide.getByRole("alert")).toContainText("nicht möglich");
    await expect(guide.getByRole("radio", { name: "4–10 Personen", exact: true })).toBeChecked();
    await page.unroute("**/api/v1/onboarding");
    await guide.getByRole("button", { name: "Angabe speichern" }).click();
    await expect(guide).toContainText("Geplant: 4–10 Personen");
    await page.reload();
    await expect(guide).toContainText("Geplant: 4–10 Personen");
    await page.screenshot({ path: testInfo.outputPath("start-guide-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 375, height: 900 });
    await guide.getByRole("button", { name: "Angabe ändern" }).click();
    await expect(page.getByRole("radio", { name: "Noch offen" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("start-guide-mobile.png"), fullPage: true });
    await guide.getByRole("button", { name: "Abbrechen" }).click();
    await guide.getByRole("button", { name: "Startliste ausblenden" }).click();
    await expect(guide).toHaveCount(0);
    await page.reload();
    await expect(guide).toHaveCount(0);
    await page.getByRole("button", { name: "Starthilfe anzeigen" }).click();
    await expect(guide).toBeVisible();
    const { data } = await adminClient.from("tenants").select("planned_team_size,plan").eq("id", env.tenantId).single();
    expect(data).toEqual({ planned_team_size: "4-10", plan: "free" });
  });

  test("counts completed work separately from imports and only marks a non-empty report once", async ({ page }) => {
    await loginAs(page, env.adminEmail);
    const reportUrl = "/api/v1/reports/export/csv?startDate=2026-09-01&endDate=2026-09-30";
    expect((await page.request.get(reportUrl)).status()).toBe(200);
    expect((await (await page.request.get("/api/v1/onboarding")).json()).data.exported).toBe(false);
    const { error } = await adminClient.from("time_entries").insert({ tenant_id: env.tenantId, employee_id: env.employeeEmpId,
      date: "2026-09-10", clock_in: "2026-09-10T08:00:00Z", clock_out: "2026-09-10T09:00:00Z", status: "completed", entry_source: "import", break_minutes: 0 });
    expect(error).toBeNull();
    expect((await (await page.request.get("/api/v1/onboarding")).json()).data).toMatchObject({ imported: true, recorded: false });
    const inserted = await adminClient.from("time_entries").insert({ tenant_id: env.tenantId, employee_id: env.employeeEmpId,
      date: "2026-09-11", clock_in: "2026-09-11T08:00:00Z", clock_out: "2026-09-11T09:00:00Z", status: "completed", entry_source: "manual", break_minutes: 0 });
    expect(inserted.error).toBeNull();
    const exported = await page.request.get(reportUrl);
    expect(exported.status()).toBe(200);
    expect(exported.headers()["content-type"]).toContain("text/csv");
    const first = await adminClient.from("tenants").select("first_report_export_at").eq("id", env.tenantId).single();
    expect(first.data!.first_report_export_at).toBeTruthy();
    await page.request.get(reportUrl);
    const second = await adminClient.from("tenants").select("first_report_export_at").eq("id", env.tenantId).single();
    expect(second.data).toEqual(first.data);
    await page.reload();
    await expect(page.getByTestId("start-guide")).toContainText("3 von 3 Schritten erledigt");
  });

  test("rejects foreign identity and employee changes, and accepts clearing the answer", async ({ page }) => {
    await loginAs(page, env.adminEmail);
    expect((await page.request.patch("/api/v1/onboarding", { data: { tenantId: "forged", plannedTeamSize: "51+" } })).status()).toBe(400);
    expect((await page.request.patch("/api/v1/onboarding", { data: { plannedTeamSize: null } })).status()).toBe(200);
    expect((await page.request.post("/api/v1/product-interest", { data: { action: "invoice_paid" } })).status()).toBe(400);
    await loginAs(page, env.employeeEmail);
    await expect(page.getByTestId("start-guide")).toHaveCount(0);
    expect((await page.request.patch("/api/v1/onboarding", { data: { plannedTeamSize: "51+" } })).status()).toBe(403);
    expect((await page.request.post("/api/v1/product-interest", { data: { action: "upgrade_view" } })).status()).toBe(403);
    expect((await page.request.get("/api/v1/reports/export/csv?startDate=2026-09-01&endDate=2026-09-30")).status()).toBe(403);
  });

  test("shows activation only to the operator and does not treat interest as a payment", async ({ page }, testInfo) => {
    await loginAs(page, env.adminEmail);
    expect((await page.request.get("/api/v1/product-analytics")).status()).toBe(404);
    for (let i = 0; i < 2; i++) expect((await page.request.post("/api/v1/product-interest", { data: { action: "upgrade_view" } })).status()).toBe(204);
    await loginAs(page, operator);
    await page.goto("/app/product-analytics");
    await expect(page.getByTestId("product-activation")).toContainText("Vom Einstieg zur Zahlung");
    const response = await page.request.get("/api/v1/product-analytics");
    expect(response.status()).toBe(200);
    const report = await response.json();
    expect(report.activation.paid).toBe(0);
    expect(report.activation.exported).toBeGreaterThanOrEqual(1);
    expect(report.actions.filter((a: { action: string }) => a.action === "upgrade_view").every((a: { count: number }) => a.count === 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("activation-overview.png"), fullPage: true });
  });
});
