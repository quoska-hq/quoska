import { test, expect } from "@playwright/test";
import {
  adminClient,
  testEmail,
  TEST_PASSWORD,
} from "../../scripts/e2e-helpers";
import { planningFixture } from "../fixtures/planning";
import {
  login,
  createOwner,
  cleanup,
  updateEmployeeDuringSetup,
} from "./helpers/planning-module";

test.describe("Optional planning module", () => {
  test("keeps navigation simple until activation and guides an empty setup", async ({
    page,
  }) => {
    const owner = await createOwner();
    try {
      await login(page, owner.email);
      await page.goto("/app/settings");
      await expect(
        page.getByText("Nicht aktiviert", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Dienstplanung", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("link", { name: "Meine Dienste", exact: true }),
      ).toHaveCount(0);
      await page
        .getByRole("button", { name: "Dienstplanung aktivieren", exact: true })
        .click();
      await page.waitForURL(/\/app\/planning$/);
      await expect(
        page.getByText("Einrichtung · Schritt 1 von 4", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Dienstplanung", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Meine Dienste", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", {
          name: "Einrichtung speichern",
          exact: true,
        }),
      ).toHaveCount(0);
      await page.getByRole("button", { name: "Weiter", exact: true }).click();
      await expect(
        page
          .getByRole("region", { name: "Dienstplanung einrichten" })
          .getByRole("alert"),
      ).toContainText("mindestens eine Filiale und eine Kompetenz");
      await page
        .getByRole("textbox", { name: "Neue Filiale" })
        .fill("Marktstraße");
      await page
        .getByRole("button", { name: "Filiale hinzufügen", exact: true })
        .click();
      await page
        .getByRole("textbox", { name: "Neue Kompetenz" })
        .fill("Verkauf");
      await page
        .getByRole("button", { name: "Kompetenz hinzufügen", exact: true })
        .click();
      await page.getByRole("button", { name: "Weiter", exact: true }).click();
      await expect(
        page
          .getByRole("region", { name: "Dienstplanung einrichten" })
          .getByRole("alert"),
      ).toContainText("örtlichen Feiertage");
      await page
        .getByRole("checkbox", { name: /Örtliche Feiertage geprüft/ })
        .check();
      await page.getByRole("button", { name: "Weiter", exact: true }).click();
      await expect(
        page.getByText("Einrichtung · Schritt 2 von 4", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(/Module Fixture · .* Sollstunden/),
      ).toBeVisible();
      await page.getByRole("button", { name: "Zurück", exact: true }).click();
      await expect(
        page.getByText("Marktstraße", { exact: true }),
      ).toBeVisible();
      await expect(page.getByText("Verkauf", { exact: true })).toBeVisible();
      const persisted = (
        await (await page.request.get("/api/v1/planning")).json()
      ).data;
      expect(persisted.state.config.locations).toHaveLength(0);
      await page.goto("/app/clock");
      await expect(
        page.getByRole("button", { name: "Stempeln", exact: true }),
      ).toBeVisible();
    } finally {
      await cleanup(owner.tenantId, owner.userId);
    }
  });

  test("saves all setup steps and preserves plans when toggled on desktop and mobile", async ({
    page,
    browser,
  }) => {
    test.setTimeout(60000);
    const owner = await createOwner();
    let employeeUserId: string | undefined;
    try {
      await login(page, owner.email);
      await page.goto("/app/settings");
      await page
        .getByRole("button", { name: "Dienstplanung aktivieren", exact: true })
        .click();
      await page.waitForURL(/\/app\/planning$/);
      let snapshot = (await (await page.request.get("/api/v1/planning")).json())
        .data;
      const manager = snapshot.context.employees.find(
        (e: { id: string }) => e.id,
      );
      const config = planningFixture().state.config;
      config.firstMonth = snapshot.context.today.slice(0, 7) + "-01";
      config.profiles = [{ ...config.profiles[0], employeeId: manager.id }];
      expect(
        (
          await page.request.post("/api/v1/planning", {
            data: { action: "configure", config, version: snapshot.version },
          })
        ).ok(),
      ).toBe(true);
      snapshot = (await (await page.request.get("/api/v1/planning")).json())
        .data;
      expect(
        (
          await page.request.post("/api/v1/planning", {
            data: { action: "initialize", version: snapshot.version },
          })
        ).ok(),
      ).toBe(true);
      await page.reload();
      await page
        .getByRole("button", { name: "Einrichtung", exact: true })
        .click();
      for (let step = 1; step <= 3; step++) {
        await expect(
          page.getByText(`Einrichtung · Schritt ${step} von 4`, {
            exact: true,
          }),
        ).toBeVisible();
        await page.getByRole("button", { name: "Weiter", exact: true }).click();
      }
      await expect(
        page.getByText("Einrichtung · Schritt 4 von 4", { exact: true }),
      ).toBeVisible();
      await updateEmployeeDuringSetup(page, owner.userId);
      await expect(
        page.getByRole("button", {
          name: "Einrichtung speichern",
          exact: true,
        }),
      ).toBeEnabled();
      await page
        .getByRole("button", { name: "Einrichtung speichern", exact: true })
        .click();
      await expect(
        page.getByText("Gespeichert.", { exact: true }),
      ).toBeVisible();
      const periods = (
        await (await page.request.get("/api/v1/planning")).json()
      ).data.state.periods;
      expect(periods).toHaveLength(3);
      const employeeEmail = testEmail("planning-module-employee");
      const auth = await adminClient.auth.admin.createUser({
        email: employeeEmail,
        password: TEST_PASSWORD,
        email_confirm: true,
      });
      employeeUserId = auth.data.user!.id;
      await adminClient.from("employees").insert({
        tenant_id: owner.tenantId,
        user_id: employeeUserId,
        email: employeeEmail,
        first_name: "Employee",
        last_name: "Fixture",
        role: "employee",
      });
      await adminClient.rpc("set_employee_claims", {
        user_uuid: employeeUserId,
      });
      const context = await browser.newContext({
        baseURL: new URL(page.url()).origin,
      });
      try {
        const staff = await context.newPage();
        await login(staff, employeeEmail);
        await staff.goto("/app/settings");
        await expect(
          staff.getByRole("link", { name: "Meine Dienste", exact: true }),
        ).toBeVisible();
        await expect(
          staff.getByRole("button", { name: "Modul deaktivieren" }),
        ).toHaveCount(0);
        const status = (
          await (await staff.request.get("/api/v1/modules/planning")).json()
        ).data;
        expect(
          (
            await staff.request.post("/api/v1/modules/planning", {
              data: { enabled: false, version: status.version },
            })
          ).status(),
        ).toBe(403);
        await page.goto("/app/settings");
        await page
          .getByRole("button", { name: "Modul deaktivieren", exact: true })
          .click();
        await page
          .getByRole("button", {
            name: "Dienstplanung deaktivieren",
            exact: true,
          })
          .click();
        await expect(
          page.getByText("Nicht aktiviert", { exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("link", { name: "Meine Dienste", exact: true }),
        ).toHaveCount(0);
        expect(
          (await staff.request.get("/api/v1/planning/mine")).status(),
        ).toBe(403);
        expect(
          (await staff.request.get("/api/v1/planning/swaps")).status(),
        ).toBe(403);
        await staff.reload();
        await expect(
          staff.getByRole("link", { name: "Meine Dienste", exact: true }),
        ).toHaveCount(0);
        const retained = (
          await (await page.request.get("/api/v1/planning")).json()
        ).data.state.periods;
        expect(retained).toEqual(periods);
        await page.setViewportSize({ width: 390, height: 844 });
        await page
          .getByRole("button", { name: "Mehr Navigation öffnen" })
          .click();
        await expect(
          page
            .getByRole("dialog")
            .getByRole("link", { name: "Dienstplanung", exact: true }),
        ).toHaveCount(0);
        await page
          .getByRole("button", { name: "Menü schließen", exact: true })
          .click();
        await page
          .getByRole("button", {
            name: "Dienstplanung aktivieren",
            exact: true,
          })
          .click();
        await page.waitForURL(/\/app\/planning$/);
        await page
          .getByRole("button", { name: "Mehr Navigation öffnen" })
          .click();
        await expect(
          page
            .getByRole("dialog")
            .getByRole("link", { name: "Dienstplanung", exact: true }),
        ).toBeVisible();
        await expect(
          page
            .getByRole("dialog")
            .getByRole("link", { name: "Meine Dienste", exact: true }),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "Menü schließen", exact: true })
          .click();
        await expect(
          page
            .getByTestId("mobile-bottom-nav")
            .getByRole("link", { name: "Stempeln", exact: true }),
        ).toBeVisible();
        expect(
          (await (await page.request.get("/api/v1/planning")).json()).data.state
            .periods,
        ).toEqual(periods);
      } finally {
        await context.close();
      }
    } finally {
      await cleanup(owner.tenantId, owner.userId);
      if (employeeUserId)
        await adminClient.auth.admin.deleteUser(employeeUserId);
    }
  });
});
