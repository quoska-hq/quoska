import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { adminClient, TEST_PASSWORD } from "./helpers";
import { setupProjectAssignmentEnv, teardownProjectAssignmentEnv, loginAs, type ProjectAssignmentEnv } from "./project-assignment-fixtures";

const actionCenter = (page: Page) => page.getByTestId("cockpit-action-center");
const actions = (page: Page) => actionCenter(page).getByTestId("cockpit-action");

test.describe("Cockpit hint dismissal", () => {
  let env: ProjectAssignmentEnv;
  let adminId: string;
  let today: string;

  test.beforeAll(async () => {
    env = await setupProjectAssignmentEnv("cockpit-dismissal");
    const { data } = await adminClient.from("employees").select("id").eq("email", env.adminEmail).single();
    adminId = data!.id;
    today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
    // A second admin makes it possible to verify personal acknowledgement ownership.
    const { data: colleague } = await adminClient.from("employees").update({ role: "admin" })
      .eq("id", env.employee2EmpId).select("user_id").single();
    await adminClient.rpc("set_employee_claims", { user_uuid: colleague!.user_id });
  });

  test.beforeEach(async () => {
    await adminClient.from("cockpit_action_dismissals").delete().eq("tenant_id", env.tenantId);
    await adminClient.from("time_entries").delete().eq("tenant_id", env.tenantId);
    const { error } = await adminClient.from("time_entries").insert([adminId, env.employeeEmpId, env.employee2EmpId].map((employeeId) => ({
      tenant_id: env.tenantId, employee_id: employeeId, date: today,
      clock_in: `${today}T07:00:00Z`, clock_out: `${today}T19:00:00Z`, status: "completed", break_minutes: 0,
    })));
    if (error) throw error;
  });

  test.afterAll(async () => { await teardownProjectAssignmentEnv(env); });

  test("dismisses one hint persistently without hiding others", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await loginAs(page, env.adminEmail);
    await expect(actionCenter(page)).toContainText("6 offene Hinweise");
    const box = await actionCenter(page).boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);
    await page.screenshot({ path: testInfo.outputPath("cockpit-mobile.png") });
    const id = await actions(page).first().getAttribute("data-action-id");
    await actions(page).first().getByTitle("Hinweis ausblenden").click();
    await expect(actionCenter(page)).toContainText("5 offene Hinweise");
    await page.reload();
    await expect(actionCenter(page)).toContainText("5 offene Hinweise");
    expect(await page.locator(`[data-action-id="${id}"]`).count()).toBe(0);
  });

  test("dismisses all hints of the selected person and keeps the rest of the team", async ({ page }) => {
    await loginAs(page, env.adminEmail);
    await page.getByLabel("Mitarbeiter filtern").click();
    await page.getByRole("option", { name: "Lukas Mitarbeiter" }).click();
    await expect(actionCenter(page)).toContainText("2 offene Hinweise");
    await page.getByRole("button", { name: "Alle Hinweise dieser Person ausblenden" }).click();
    await expect(page.getByText("Keine offenen Hinweise", { exact: true })).toBeVisible();
    await page.getByLabel("Mitarbeiter filtern").click();
    await page.getByRole("option", { name: "Gesamtes Team" }).click();
    await expect(actionCenter(page)).toContainText("4 offene Hinweise");
    await expect(actionCenter(page)).not.toContainText("Lukas Mitarbeiter");
  });

  test("supports dismissal from employee details", async ({ page }) => {
    await loginAs(page, env.adminEmail);
    await page.getByRole("button", { name: "Lukas Mitarbeiter öffnen" }).click();
    const drawer = page.getByTestId("employee-cockpit-drawer");
    await expect(drawer).toContainText("2 offene Hinweise");
    await drawer.getByRole("button", { name: "Alle Hinweise dieser Person ausblenden" }).click();
    await expect(drawer.getByText("Keine offenen Hinweise")).toBeVisible();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(actionCenter(page)).toContainText("4 offene Hinweise");
  });

  test("dismisses the entire filtered list, including collapsed hints, while new ones reappear", async ({ page }) => {
    await loginAs(page, env.adminEmail);
    await expect(actions(page)).toHaveCount(4);
    await page.getByRole("button", { name: "Alle Hinweise des Teams ausblenden" }).click();
    await expect(page.getByText("Keine offenen Hinweise", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText("Keine offenen Hinweise", { exact: true })).toBeVisible();
    const { error } = await adminClient.from("time_entries").insert({
      tenant_id: env.tenantId, employee_id: env.employeeEmpId, date: today,
      clock_in: `${today}T00:00:00Z`, clock_out: `${today}T06:45:00Z`, status: "completed", break_minutes: 0,
    });
    if (error) throw error;
    await page.reload();
    await expect(actionCenter(page)).toContainText("1 offener Hinweis");
    await expect(actionCenter(page)).toContainText("Pause unterschritten");
  });

  test("keeps dismissals personal to each admin", async ({ page }) => {
    await loginAs(page, env.adminEmail);
    await page.getByRole("button", { name: "Alle Hinweise des Teams ausblenden" }).click();
    await expect(page.getByText("Keine offenen Hinweise", { exact: true })).toBeVisible();
    await loginAs(page, env.employee2Email);
    await expect(actionCenter(page)).toContainText("6 offene Hinweise");
  });

  test("keeps hints visible on a failed save", async ({ page }) => {
    await loginAs(page, env.adminEmail);
    await page.route("**/api/v1/cockpit/dismiss", (route) => route.fulfill({ status: 500, json: { data: null, error: "Speichern fehlgeschlagen" } }));
    await actions(page).first().getByTitle("Hinweis ausblenden").click();
    await expect(actionCenter(page).getByRole("alert")).toHaveText("Speichern fehlgeschlagen");
    await expect(actionCenter(page)).toContainText("6 offene Hinweise");
  });

  test("rejects dismissals outside the selected employee and from non-admins", async ({ page }) => {
    await loginAs(page, env.adminEmail);
    const cockpit = await (await page.request.get("/api/v1/cockpit?days=7")).json();
    const anotherPerson = cockpit.data.actions.find((item: { employeeId: string }) => item.employeeId === adminId);
    const response = await page.request.post("/api/v1/cockpit/dismiss", { data: { days: 7, employeeId: env.employeeEmpId, actionIds: [anotherPerson.id] } });
    expect(response.status()).toBe(409);
    await expect(actionCenter(page)).toContainText("6 offene Hinweise");
    await loginAs(page, env.employeeEmail);
    const forbidden = await page.request.post("/api/v1/cockpit/dismiss", { data: { days: 7, actionIds: [anotherPerson.id] } });
    expect(forbidden.status()).toBe(403);
  });

  test("undoes a single dismissal and the entire team batch", async ({ page }) => {
    await loginAs(page, env.adminEmail);
    await actions(page).first().getByTitle("Hinweis ausblenden").click();
    await expect(actionCenter(page)).toContainText("5 offene Hinweise");
    await expect(page.getByTestId("cockpit-undo-notice")).toContainText("Hinweis ausgeblendet.");
    await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
    await expect(actionCenter(page)).toContainText("6 offene Hinweise");
    await expect(page.getByTestId("cockpit-undo-notice")).toHaveCount(0);
    await page.getByRole("button", { name: "Alle Hinweise des Teams ausblenden" }).click();
    await expect(page.getByTestId("cockpit-undo-notice")).toContainText("6 Hinweise ausgeblendet.");
    await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
    await expect(actionCenter(page)).toContainText("6 offene Hinweise");
  });

  test("keeps undo available when switching the employee filter", async ({ page }) => {
    await loginAs(page, env.adminEmail);
    await page.getByLabel("Mitarbeiter filtern").click();
    await page.getByRole("option", { name: "Lukas Mitarbeiter" }).click();
    await page.getByRole("button", { name: "Alle Hinweise dieser Person ausblenden" }).click();
    await expect(page.getByTestId("cockpit-undo-notice")).toContainText("2 Hinweise ausgeblendet.");
    await page.getByLabel("Mitarbeiter filtern").click();
    await page.getByRole("option", { name: "Gesamtes Team" }).click();
    await expect(actionCenter(page)).toContainText("4 offene Hinweise");
    await page.getByRole("button", { name: "Rückgängig", exact: true }).click();
    await expect(actionCenter(page)).toContainText("6 offene Hinweise");
  });

  test("undoes only the selected batch after consecutive dismissals", async ({ page }) => {
    await loginAs(page, env.adminEmail);
    await actions(page).first().getByTitle("Hinweis ausblenden").click();
    await expect(actionCenter(page)).toContainText("5 offene Hinweise");
    await actions(page).first().getByTitle("Hinweis ausblenden").click();
    await expect(actionCenter(page)).toContainText("4 offene Hinweise");
    await expect(page.getByTestId("cockpit-undo-notice")).toHaveCount(2);
    await page.getByRole("button", { name: "Rückgängig", exact: true }).last().click();
    await expect(actionCenter(page)).toContainText("5 offene Hinweise");
    await expect(page.getByTestId("cockpit-undo-notice")).toHaveCount(1);
  });

  test("expires the undo control after ten seconds", async ({ page }) => {
    await loginAs(page, env.adminEmail);
    await page.clock.install();
    await actions(page).first().getByTitle("Hinweis ausblenden").click();
    await expect(page.getByTestId("cockpit-undo-notice")).toBeVisible();
    await page.clock.fastForward(11_000);
    await expect(page.getByTestId("cockpit-undo-notice")).toHaveCount(0);
    await expect(actionCenter(page)).toContainText("5 offene Hinweise");
  });

  test("the server rejects expired undo and tokens owned by another admin", async ({ page }) => {
    await loginAs(page, env.adminEmail);
    const cockpit = await (await page.request.get("/api/v1/cockpit?days=7")).json();
    const response = await page.request.post("/api/v1/cockpit/dismiss", { data: { days: 7, actionIds: [cockpit.data.actions[0].id] } });
    const { data } = await response.json();
    expect(data.dismissedCount).toBe(1);
    await adminClient.from("cockpit_action_dismissals").update({ dismissed_at: new Date(Date.now() - 11_000).toISOString() })
      .eq("tenant_id", env.tenantId).eq("undo_token", data.undoToken);
    const expired = await page.request.post("/api/v1/cockpit/dismiss/undo", { data: { undoToken: data.undoToken } });
    expect(expired.status()).toBe(409);
    const fresh = await page.request.post("/api/v1/cockpit/dismiss", { data: { days: 7, actionIds: [cockpit.data.actions[1].id] } });
    const { data: freshData } = await fresh.json();
    await loginAs(page, env.employee2Email);
    const foreign = await page.request.post("/api/v1/cockpit/dismiss/undo", { data: { undoToken: freshData.undoToken } });
    expect(foreign.status()).toBe(409);
  });

  test("enforces ownership in the database even when bypassing the app API", async () => {
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { error: loginError } = await client.auth.signInWithPassword({ email: env.adminEmail, password: TEST_PASSWORD });
    if (loginError) throw loginError;
    await adminClient.from("cockpit_action_dismissals").insert([
      { tenant_id: env.tenantId, dismissed_by: adminId, action_id: "own-hint" },
      { tenant_id: env.tenantId, dismissed_by: env.employee2EmpId, action_id: "other-admin-hint" },
    ]);
    const { data, error } = await client.from("cockpit_action_dismissals").select("action_id");
    expect(error).toBeNull();
    expect(data).toEqual([{ action_id: "own-hint" }]);
    const forged = await client.from("cockpit_action_dismissals").insert({
      tenant_id: env.tenantId, dismissed_by: env.employee2EmpId, action_id: "forged-hint",
    });
    expect(forged.error?.code).toBe("42501");
    const otherTenant = await client.from("cockpit_action_dismissals").insert({
      tenant_id: "11111111-1111-4111-8111-111111111111", dismissed_by: adminId, action_id: "foreign-tenant-hint",
    });
    expect(otherTenant.error?.code).toBe("42501");
    await client.auth.signOut();
  });
});
