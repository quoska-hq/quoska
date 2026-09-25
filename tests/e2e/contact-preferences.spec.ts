import { test, expect } from "@playwright/test";
import { adminClient } from "./helpers";
import { setupProjectAssignmentEnv, teardownProjectAssignmentEnv, loginAs, type ProjectAssignmentEnv } from "./project-assignment-fixtures";

test.describe("Personal admin contact consent", () => {
  let env: ProjectAssignmentEnv;
  test.beforeAll(async () => { env = await setupProjectAssignmentEnv("contact"); });
  test.afterAll(async () => { await teardownProjectAssignmentEnv(env); });

  test("defaults off, records only explicit choice and offers immediate withdrawal", async ({ page }) => {
    await loginAs(page, env.adminEmail);
    await page.goto("/app/settings");
    const card = page.getByTestId("contact-preferences");
    const consent = card.getByRole("checkbox");
    await expect(consent).not.toBeChecked();
    await expect(card.getByRole("button", { name: "Auswahl speichern" })).toBeDisabled();
    await consent.check();
    await card.getByRole("button", { name: "Auswahl speichern" }).click();
    await expect(card.getByRole("status")).toContainText("Einwilligung ist gespeichert");
    await page.reload();
    await expect(consent).toBeChecked();
    await card.getByRole("button", { name: "Einwilligung widerrufen" }).click();
    await expect(consent).not.toBeChecked();
    await expect(card.getByRole("status")).toContainText("widerrufen");
    const { data, error } = await adminClient.from("admin_contact_events").select("enabled,source,consent_text")
      .eq("email", env.adminEmail).order("id");
    expect(error).toBeNull();
    expect(data?.map(row => row.enabled)).toEqual([true, false]);
    expect(data?.[0].consent_text).toContain("Nichtnutzung");
    const exported = await page.request.get("/api/v1/my-data/export");
    expect(exported.status()).toBe(200);
    expect(await exported.text()).toContain("# E-Mail-Einwilligungen");
  });

  test("keeps a failed selection retryable without falsely reporting success", async ({ page }) => {
    await loginAs(page, env.adminEmail);
    await page.goto("/app/settings");
    const card = page.getByTestId("contact-preferences");
    await card.getByRole("checkbox").check();
    await page.route("**/api/v1/settings/contact", route => route.request().method() === "PATCH"
      ? route.fulfill({ status: 503, json: { data: null, error: "Speichern fehlgeschlagen." } }) : route.continue());
    await card.getByRole("button", { name: "Auswahl speichern" }).click();
    await expect(card.getByRole("alert")).toContainText("Speichern fehlgeschlagen");
    await expect(card.getByRole("checkbox")).toBeChecked();
    await expect(card.getByRole("status")).toHaveCount(0);
  });

  test("does not invite employees or trust forged request identities", async ({ page }) => {
    await loginAs(page, env.employeeEmail);
    await page.goto("/app/settings");
    const status = await page.request.get("/api/v1/settings/contact");
    expect((await status.json()).data).toMatchObject({ enabled: false, canEnable: false });
    await expect(page.getByTestId("contact-preferences")).toHaveCount(0);
    const denied = await page.request.patch("/api/v1/settings/contact", { data: {
      enabled: true, version: "admin-checkin-v1", source: "settings",
    } });
    expect(denied.status()).toBe(403);
    const forged = await page.request.patch("/api/v1/settings/contact", { data: {
      enabled: true, version: "admin-checkin-v1", source: "settings", userId: "someone-else",
    } });
    expect(forged.status()).toBe(400);
  });
});
