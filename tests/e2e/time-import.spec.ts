import { test, expect } from "@playwright/test";
import { adminClient, cleanupTestUser, createTestUser, testEmail, TEST_PASSWORD } from "./helpers";

test.describe("Historical time import", () => {
  const email = testEmail("time-import");
  let tenantId = "";
  test.beforeAll(async () => {
    const setup = await createTestUser({ email, password: TEST_PASSWORD, firstName: "Anna", lastName: "Import", companyName: "Import Test", role: "admin", bundesland: "berlin" });
    tenantId = setup.tenantId;
  });
  test.afterAll(async () => { await cleanupTestUser(email); });

  test("upload, map, preview and commit original times; retry skips duplicates", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/);
    await page.goto("/app/settings");
    const card = page.locator("#zeitimport");
    const supportLink = card.getByRole("link", { name: "support@quoska.de" });
    await expect(supportLink).toBeVisible();
    const supportUrl = new URL((await supportLink.getAttribute("href"))!);
    expect(supportUrl.protocol).toBe("mailto:");
    expect(supportUrl.searchParams.get("body")).toContain("Download-Link");
    await card.getByLabel("CSV-Datei auswählen").setInputFiles({ name: "unsupported.csv", mimeType: "text/csv", buffer: Buffer.from("Nur eine Kopfzeile") });
    await expect(card.getByRole("alert")).toBeVisible();
    await expect(supportLink).toBeVisible();
    const csv = `Email,Start date,Start time,End date,End time,Pause (Min),Description\n${email},2026-01-12,08:00:05,2026-01-12,17:00:05,10,Originalpause\n${email},2026-01-13,22:00:00,2026-01-14,06:00:00,30,Nachtschicht`;
    const file = { name: "historie.csv", mimeType: "text/csv", buffer: Buffer.from(csv) };
    await card.getByLabel("CSV-Datei auswählen").setInputFiles(file);
    await card.getByRole("button", { name: "Import prüfen", exact: true }).click();
    await expect(card.getByText("2 neue Einträge · 0 Duplikate · 0 Fehler")).toBeVisible();
    const { count } = await adminClient.from("time_entries").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
    expect(count).toBe(0);
    // Changes invalidate the preview and require a fresh check.
    await card.getByLabel("Zeitzone der Datei").selectOption("UTC");
    await expect(card.getByRole("button", { name: "2 Einträge importieren" })).toHaveCount(0);
    await card.getByLabel("Zeitzone der Datei").selectOption("Europe/Berlin");
    await card.getByRole("button", { name: "Import prüfen", exact: true }).click();
    await card.getByRole("button", { name: "2 Einträge importieren" }).click();
    await expect(card.getByRole("status")).toContainText("2 Einträge importiert.");
    const { data: entries } = await adminClient.from("time_entries").select("employee_id, clock_in, break_minutes, automatic_break_minutes, entry_source").eq("tenant_id", tenantId).order("clock_in");
    expect(entries).toHaveLength(2);
    expect(Date.parse(entries![0].clock_in)).toBe(Date.parse("2026-01-12T07:00:05Z"));
    expect(entries![0]).toMatchObject({ break_minutes: 10, automatic_break_minutes: 0, entry_source: "import" });
    const { count: audits } = await adminClient.from("time_entry_audit").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("field_name", "import_entry");
    expect(audits).toBe(2);
    await card.getByLabel("CSV-Datei auswählen").setInputFiles(file);
    await card.getByRole("button", { name: "Import prüfen", exact: true }).click();
    await expect(card.getByText("0 neue Einträge · 2 Duplikate · 0 Fehler")).toBeVisible();
    await expect(card.getByRole("button", { name: /Einträge importieren/ })).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    await page.screenshot({ path: "/tmp/quoska-time-import-mobile.png", fullPage: true });

    // Two concurrent callers must not pass the overlap check and insert twice.
    const data = {
      csv: `Email,Start date,Start time,End time\n${email},2026-01-15,08:00,09:00`,
      delimiter: ",", dateFormat: "YYYY-MM-DD", timezone: "Europe/Berlin", durationFormat: "clock",
      columns: { employee: 0, date: 1, start: 2, end: 3 },
      employees: [{ source: email, employeeId: entries![0].employee_id }], mode: "import",
    };
    const responses = await Promise.all([
      page.request.post("/api/v1/time-entries/import", { data }),
      page.request.post("/api/v1/time-entries/import", { data }),
    ]);
    for (const response of responses) expect(response.ok()).toBe(true);
    const results = await Promise.all(responses.map((response) => response.json()));
    expect(results.map((result) => result.data.importedCount).sort()).toEqual([0, 1]);
    expect(results.map((result) => result.data.duplicateCount).sort()).toEqual([0, 1]);
  });
});
