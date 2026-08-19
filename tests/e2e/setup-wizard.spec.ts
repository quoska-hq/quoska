/**
 * Founder onboarding: identity, company defaults and contractual schedule.
 */

import { test, expect, type Page } from "@playwright/test";
import { testEmail, TEST_PASSWORD, cleanupTestUser, adminClient } from "./helpers";

test.describe("Setup Wizard", () => {
  const createdEmails: string[] = [];

  test.afterEach(async () => {
    for (const email of createdEmails.splice(0)) {
      await cleanupTestUser(email);
    }
  });

  async function registerFounder(
    page: Page,
    email: string,
  ) {
    createdEmails.push(email);
    await page.goto("/register");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /weiter zur einrichtung/i }).click();
    await expect(page).toHaveURL(/\/setup/, { timeout: 15_000 });
  }

  test("completes onboarding without an Admin placeholder or team invites", async ({ page }) => {
    const email = testEmail("setup");
    await registerFounder(page, email);

    // Access credentials are the only fields on registration; identity starts here.
    await expect(page.getByRole("heading", { name: "Dein Profil" })).toBeVisible();
    await expect(page.getByLabel("Vorname")).toHaveValue("");
    await page.getByLabel("Vorname").fill("Erika");
    await page.getByLabel("Nachname").fill("Gründerin");
    await page.getByLabel("Eintrittsdatum").fill("2026-01-15");
    await page.getByLabel("Überstunden-Startsaldo").fill("2.5");
    await page.getByRole("button", { name: "Weiter" }).click();

    // Company state becomes the founder and future employee default.
    await page.getByLabel("Firmenname").fill("Setup Wizard GmbH");
    await page.getByLabel("Bundesland").click();
    await page.getByRole("option", { name: /nordrhein-westfalen/i }).click();
    await expect(page.getByLabel("Bundesland")).toContainText("Nordrhein-Westfalen");
    await page.getByRole("button", { name: "Weiter" }).click();

    // A four-day week is a first-class contractual schedule.
    await expect(page.getByRole("heading", { name: "Deine Arbeitswoche" })).toBeVisible();
    await page.getByRole("button", { name: "32 Std. · 4 Tage" }).click();
    await expect(page.getByText("32 Std./Woche")).toBeVisible();
    await page.getByRole("button", { name: "Weiter" }).click();

    // Invitations are explicitly optional.
    await expect(page.getByText(/diesen schritt überspringen/i)).toBeVisible();
    await page.getByRole("button", { name: /ohne einladungen weiter/i }).click();

    // Review makes the important defaults visible before persisting setup_complete.
    await expect(page.getByRole("heading", { name: "Alles richtig?" })).toBeVisible();
    await expect(page.getByText("Erika Gründerin")).toBeVisible();
    await expect(page.getByText("15.01.2026")).toBeVisible();
    await expect(page.getByText("+2,5 Std.")).toBeVisible();
    await expect(page.getByText("Nordrhein-Westfalen")).toBeVisible();
    await expect(page.getByText("32 Std./Woche")).toBeVisible();
    await expect(page.getByText(/keine.*kann später erfolgen/i)).toBeVisible();
    await page.getByRole("button", { name: /einrichtung abschließen/i }).click();

    await expect(page.getByRole("heading", { name: "Alles eingerichtet!" })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /dashboard/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    const { data: employee, error } = await adminClient
      .from("employees")
      .select("first_name, last_name, bundesland, target_hours_week, work_schedule, employment_start_date, initial_overtime_minutes, tenant_id, tenants(setup_complete, bundesland, default_work_schedule)")
      .eq("email", email)
      .is("deleted_at", null)
      .single();

    expect(error).toBeNull();
    expect(employee).toMatchObject({
      first_name: "Erika",
      last_name: "Gründerin",
      bundesland: "nordrhein-westfalen",
      target_hours_week: 32,
      work_schedule: { friday: 0, monday: 480 },
      employment_start_date: "2026-01-15",
      initial_overtime_minutes: 150,
    });
    const tenant = employee!.tenants as unknown as {
      setup_complete: boolean;
      bundesland: string;
      default_work_schedule: { friday: number };
    };
    expect(tenant.setup_complete).toBe(true);
    expect(tenant.bundesland).toBe("nordrhein-westfalen");
    expect(tenant.default_work_schedule.friday).toBe(0);
  });

  test("requires a Bundesland before continuing", async ({ page }) => {
    const email = testEmail("valsetup");
    await registerFounder(page, email);

    await page.getByLabel("Vorname").fill("Vali");
    await page.getByLabel("Nachname").fill("Dierung");
    await page.getByRole("button", { name: "Weiter" }).click();
    await page.getByLabel("Firmenname").fill("Validation Co");
    await page.getByRole("button", { name: "Weiter" }).click();

    await expect(page.getByText(/bundesland ist erforderlich/i)).toBeVisible();
    await expect(page.getByLabel("Bundesland")).toBeVisible();
  });

  test("shows the free-plan team limit after profile, company and schedule", async ({ page }) => {
    const email = testEmail("limit");
    await registerFounder(page, email);

    await page.getByLabel("Vorname").fill("Limit");
    await page.getByLabel("Nachname").fill("Test");
    await page.getByRole("button", { name: "Weiter" }).click();
    await page.getByLabel("Firmenname").fill("Limit Co");
    await page.getByLabel("Bundesland").click();
    await page.getByRole("option", { name: /bayern/i }).click();
    await page.getByRole("button", { name: "Weiter" }).click();
    await page.getByRole("button", { name: "Weiter" }).click();

    await expect(page.getByText(/max.*2 weitere/i)).toBeVisible();
  });

  test("accepts hours and minutes while rejecting an impossible one-day week", async ({ page }) => {
    const email = testEmail("custom-schedule");
    await registerFounder(page, email);

    await page.getByLabel("Vorname").fill("Minna");
    await page.getByLabel("Nachname").fill("Minute");
    await page.getByRole("button", { name: "Weiter" }).click();
    await page.getByLabel("Firmenname").fill("Minutengenau GmbH");
    await page.getByLabel("Bundesland").click();
    await page.getByRole("option", { name: /berlin/i }).click();
    await page.getByRole("button", { name: "Weiter" }).click();

    await page.getByRole("button", { name: "Individuell" }).click();
    for (const day of ["Dienstag", "Mittwoch", "Donnerstag", "Freitag"]) {
      await page.getByRole("button", { name: `${day} auswählen` }).click();
    }
    await expect(page.getByText(/höchstens 10 stunden/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Weiter" })).toBeDisabled();

    for (const day of ["Dienstag", "Mittwoch", "Donnerstag", "Freitag"]) {
      await page.getByRole("button", { name: `${day} auswählen` }).click();
    }
    await page.getByLabel("Wochenstunden").fill("33");
    await page.getByLabel("Wochenminuten").fill("45");

    await expect(page.getByText("33 Std. 45 Min./Woche")).toBeVisible();
    await page.getByRole("button", { name: /tage einzeln anpassen/i }).click();
    await expect(page.getByLabel("Montag Stunden")).toHaveValue("6");
    await expect(page.getByLabel("Montag Minuten")).toHaveValue("45");
    await expect(page.getByRole("button", { name: "Weiter" })).toBeEnabled();
  });

  test("keeps an unverified onboarding draft out of the dashboard", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("quoska:onboarding-draft:v1", JSON.stringify({
        version: 1,
        email: "unverified@example.com",
        profile: { firstName: "", lastName: "" },
        company: { companyName: "", bundesland: "" },
        schedule: {
          monday: 480, tuesday: 480, wednesday: 480, thursday: 480,
          friday: 480, saturday: 0, sunday: 0,
        },
        invites: [],
        step: "profile",
        awaitingVerification: false,
      }));
    });

    await page.goto("/setup");
    await page.getByLabel("Vorname").fill("Una");
    await page.getByLabel("Nachname").fill("Bestätigt");
    await page.getByRole("button", { name: "Weiter" }).click();
    await page.getByLabel("Firmenname").fill("Entwurf GmbH");
    await page.getByLabel("Bundesland").click();
    await page.getByRole("option", { name: /hamburg/i }).click();
    await page.getByRole("button", { name: "Weiter" }).click();
    await page.getByRole("button", { name: "Weiter" }).click();
    await page.getByRole("button", { name: /ohne einladungen weiter/i }).click();
    await page.getByRole("button", { name: /einrichtung abschließen/i }).click();

    await expect(page.getByRole("heading", { name: /e-mail bestätigen/i })).toBeVisible();
    await expect(page).toHaveURL(/\/setup/);
    const awaitingVerification = await page.evaluate(() => {
      const draft = window.localStorage.getItem("quoska:onboarding-draft:v1");
      return draft ? JSON.parse(draft).awaitingVerification : false;
    });
    expect(awaitingVerification).toBe(true);
  });
});
