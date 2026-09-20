import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { adminClient, TEST_PASSWORD } from "./helpers";
import { setupProjectAssignmentEnv, teardownProjectAssignmentEnv, loginAs, type ProjectAssignmentEnv } from "./project-assignment-fixtures";
import type { DatevSettings } from "@/types/datev";

const api = "/api/v1/reports/datev";
test.describe("LODAS export", () => {
  let env: ProjectAssignmentEnv;
  let foreign: ProjectAssignmentEnv;
  test.beforeAll(async () => {
    env = await setupProjectAssignmentEnv("datev");
    foreign = await setupProjectAssignmentEnv("datev-other");
    const result = await adminClient.from("time_entries").insert({ tenant_id: env.tenantId, employee_id: env.employeeEmpId,
      date: "2026-08-03", clock_in: "2026-08-03T06:00:00Z", clock_out: "2026-08-03T08:30:00Z",
      status: "completed", break_minutes: 30, entry_source: "manual" });
    expect(result.error).toBeNull();
  });
  test.afterAll(async () => {
    await teardownProjectAssignmentEnv(env);
    await teardownProjectAssignmentEnv(foreign);
  });

  test("exports on the free plan, configures on mobile, downloads a checked file and protects against unconfirmed repetition", async ({ page }, testInfo) => {
    expect((await adminClient.from("tenants").update({ plan: "free" }).eq("id", env.tenantId)).error).toBeNull();
    await loginAs(page, env.adminEmail);
    await page.goto("/app/reports?tab=datev");
    await page.getByLabel("Abrechnungsmonat – Datum auswählen").fill("01.08.2026");
    await expect(page.getByTestId("datev-export")).toContainText("Exportzuordnung fehlt");
    await page.getByLabel("Beraternummer", { exact: true }).fill("12345");
    await page.getByLabel("Mandantennummer", { exact: true }).fill("6789");
    await page.getByLabel("Export für Lukas Mitarbeiter").selectOption("include");
    await page.getByLabel("Personalnummer Lukas Mitarbeiter").fill("14");
    await page.getByLabel("Lohnart Lukas Mitarbeiter").fill("200");
    await page.getByRole("button", { name: "Zuordnung speichern" }).click();
    await expect(page.getByTestId("datev-export")).toContainText("2,00 Stunden");
    await page.setViewportSize({ width: 390, height: 850 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("datev-mobile.png"), fullPage: true });
    const downloadButton = page.getByRole("button", { name: "LODAS-Datei herunterladen" });
    await expect(downloadButton).toBeDisabled();
    await page.getByLabel(/Ich habe Vollständigkeit/).check();
    const downloadEvent = page.waitForEvent("download");
    await downloadButton.click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toMatch(/^quoska-lodas-2026-08-/);
    const stream = await download.createReadStream();
    let content = "";
    for await (const chunk of stream!) content += chunk.toString();
    expect(content).toContain("1;01.08.2026;2,00;01;200;14;\r\n");
    await expect(page.getByTestId("datev-export")).toContainText("keine Daten an DATEV übertragen");
    await expect(page.getByLabel(/Ich benötige die Datei erneut/)).toBeVisible();
    const { data: p } = await (await page.request.get(`${api}?month=2026-08`)).json();
    expect(p.preview.history).toHaveLength(1);
    const payload = { month: "2026-08", fingerprint: p.preview.fingerprint, confirmed: true, repeatConfirmed: false };
    expect((await page.request.post(api, { data: payload })).status()).toBe(409);
    expect((await page.request.post(api, { data: { ...payload, repeatConfirmed: true } })).status()).toBe(200);
    const refreshed = await (await page.request.get(`${api}?month=2026-08`)).json();
    expect(refreshed.data.preview.history).toHaveLength(1);
    await page.reload();
    await expect(page.getByLabel("Beraternummer", { exact: true })).toHaveValue("12345");
  });

  test("rejects foreign mappings, stale revisions, stale previews and direct employee access", async ({ page }) => {
    await loginAs(page, env.adminEmail);
    const { data } = await (await page.request.get(`${api}?month=2026-08`)).json();
    const settings: DatevSettings = data.settings;
    expect((await page.request.put(api, { data: { ...settings, employees: [{ employeeId: foreign.employeeEmpId,
      mode: "include", personnelNumber: 15, wageType: 200 }] } })).status()).toBe(409);
    expect((await page.request.put(api, { data: { ...settings, advisorNumber: 54321 } })).status()).toBe(200);
    expect((await page.request.put(api, { data: settings })).status()).toBe(409);
    expect((await page.request.post(api, { data: { month: "2026-08", fingerprint: data.preview.fingerprint,
      confirmed: true, repeatConfirmed: true } })).status()).toBe(409);
    await loginAs(page, env.employeeEmail);
    expect((await page.request.get(api)).status()).toBe(403);
    expect((await page.request.put(api, { data: settings })).status()).toBe(403);
    // Table and RPC access must also be denied with an ordinary user's JWT.
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } });
    expect((await client.auth.signInWithPassword({ email: env.employeeEmail, password: TEST_PASSWORD })).error).toBeNull();
    expect((await client.from("datev_exports").select("*")).error).not.toBeNull();
    expect((await client.from("datev_settings").select("*")).error).not.toBeNull();
    expect((await client.rpc("datev_month_snapshot", { p_tenant: env.tenantId, p_month: "2026-08-01" })).error).not.toBeNull();
    expect((await client.rpc("save_datev_settings", { p_tenant: env.tenantId, p_revision: 0, p_config: settings })).error).not.toBeNull();
    await client.auth.signOut();
  });

  test("includes more than 1000 rows and blocks month-crossing records from the previous month", async ({ page }) => {
    test.setTimeout(60_000);
    const rows = Array.from({ length: 1100 }, (_, i) => {
      const start = Date.UTC(2026, 6, 1 + Math.floor(i / 100), 8, i % 100);
      return { tenant_id: env.tenantId, employee_id: env.employeeEmpId, date: `2026-07-${String(1 + Math.floor(i / 100)).padStart(2, "0")}`,
        clock_in: new Date(start).toISOString(), clock_out: new Date(start + 60000).toISOString(), status: "completed", break_minutes: 0 };
    });
    expect((await adminClient.from("time_entries").insert(rows)).error).toBeNull();
    await loginAs(page, env.adminEmail);
    const { data } = await (await page.request.get(`${api}?month=2026-07`)).json();
    expect(data.preview.errors).toEqual([]);
    expect(data.preview.rows[0]).toMatchObject({ entries: 1100, hours: "18,33" });
    expect((await adminClient.from("time_entries").insert({ tenant_id: env.tenantId, employee_id: env.employeeEmpId,
      date: "2026-06-30", clock_in: "2026-06-30T21:00:00Z", clock_out: "2026-06-30T23:00:00Z", status: "completed", break_minutes: 0 })).error).toBeNull();
    const crossed = await (await page.request.get(`${api}?month=2026-07`)).json();
    expect(crossed.data.preview.errors.join(" ")).toContain("Monatsgrenze");
  });
});
