import { test, expect } from "@playwright/test";
import type { PlanningBoardData } from "../../src/types/planning-client";
import { cleanup, createOwner, login } from "./helpers/planning-module";
import { planningFixture } from "../fixtures/planning";

test("sets up a usable plan entirely through the guided interface", async ({
  page,
}) => {
  test.setTimeout(120000);
  const owner = await createOwner();
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, owner.email);
    await page.goto("/app/settings");
    await page
      .getByRole("button", { name: "Dienstplanung aktivieren", exact: true })
      .click();
    await page.waitForURL(/\/app\/planning$/);
    const setup = page.getByRole("region", {
      name: "Dienstplanung einrichten",
    });
    await setup
      .getByRole("textbox", { name: "Neue Filiale" })
      .fill("Marktstraße");
    await expect(
      setup.getByRole("button", { name: "Filiale hinzufügen" }),
    ).toBeDisabled();
    await setup
      .getByRole("combobox", { name: "Bundesland der Filiale" })
      .selectOption("berlin");
    await setup
      .getByRole("button", { name: "Filiale hinzufügen", exact: true })
      .click();
    await setup.getByRole("button", { name: "+ Verkauf", exact: true }).click();
    await setup
      .getByRole("checkbox", { name: /Örtliche Feiertage geprüft/ })
      .check();
    await setup.getByRole("button", { name: "Weiter", exact: true }).click();
    await setup
      .locator("summary")
      .filter({ hasText: /^Module Fixture/ })
      .click();
    await setup
      .getByRole("checkbox", { name: "Marktstraße", exact: true })
      .check();
    await setup.getByRole("checkbox", { name: "Verkauf", exact: true }).check();
    await setup
      .getByLabel("Module Fixture verfügbar von", { exact: true })
      .fill("06:00");
    await setup
      .getByLabel("Module Fixture verfügbar bis", { exact: true })
      .fill("18:00");
    await setup
      .getByRole("button", { name: "Zeiten übernehmen", exact: true })
      .click();
    await setup.getByRole("button", { name: "Weiter", exact: true }).click();
    await expect(setup.getByRole("alert")).toContainText(
      "Arbeitszeitregeln prüfen",
    );
    await setup
      .getByRole("combobox", { name: "Welche Regeln gelten für diese Person?" })
      .selectOption("adult_standard");
    await setup
      .getByRole("checkbox", { name: /Arbeitszeiten und gearbeitete Sonntage/ })
      .check();
    await setup
      .getByRole("checkbox", { name: /^Weitere Beschäftigungen geprüft/ })
      .check();
    await expect(
      setup.locator("summary").filter({ hasText: /^Module Fixture/ }),
    ).toContainText("Bereit für die Planung");
    await setup.getByRole("button", { name: "Weiter", exact: true }).click();
    await setup.getByRole("checkbox", { name: "Sa", exact: true }).uncheck();
    await setup
      .getByRole("button", { name: "Schicht hinzufügen", exact: true })
      .click();
    await expect(
      setup.getByRole("checkbox", {
        name: "Besetzung automatisch aus Schichten übernehmen",
        exact: true,
      }),
    ).toBeChecked();
    await expect(
      setup
        .locator("summary")
        .filter({ hasText: /Besetzung genauer festlegen/ }),
    ).toContainText("1 Zeiträume");
    await setup.getByRole("button", { name: "Weiter", exact: true }).click();
    await expect(
      setup.getByText("Einrichtung · Schritt 4 von 4", { exact: true }),
    ).toBeVisible();
    await setup.getByRole("button", { name: "Zurück", exact: true }).click();
    await expect(
      setup.getByRole("checkbox", {
        name: "Besetzung automatisch aus Schichten übernehmen",
        exact: true,
      }),
    ).toBeChecked();
    await setup
      .getByRole("button", { name: "Bearbeiten", exact: true })
      .click();
    await setup
      .getByRole("region", { name: "Wiederkehrende Schichten" })
      .getByLabel("Ende", { exact: true })
      .fill("11:00");
    await setup
      .getByRole("button", { name: "Schicht speichern", exact: true })
      .click();
    await setup.getByRole("button", { name: "Weiter", exact: true }).click();
    expect(
      (await (await page.request.get("/api/v1/planning")).json()).data.state
        .config.templates,
    ).toHaveLength(0);
    await setup
      .getByRole("button", { name: "Einrichtung speichern", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Jetzt euren ersten Plan anlegen",
        exact: true,
      }),
    ).toBeVisible();
    let snapshot: PlanningBoardData = (
      await (await page.request.get("/api/v1/planning")).json()
    ).data;
    expect(snapshot.state.config.templates).toHaveLength(1);
    expect(snapshot.state.config.demands).toHaveLength(1);
    expect(snapshot.state.config.demands[0].end).toBe("11:00");
    expect(snapshot.state.config.profiles[0].availability).toHaveLength(5);
    expect(snapshot.state.config.profiles[0].nightWorkConfirmed).toBe(false);
    const month = snapshot.state.config.firstMonth!;
    await page
      .getByRole("button", { name: "Drei Monate anlegen", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Optimieren", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Optimieren", exact: true }).click();
    await expect
      .poll(
        async () => {
          snapshot = (await (await page.request.get("/api/v1/planning")).json())
            .data;
          return snapshot.jobs[0]?.status;
        },
        { timeout: 80000, intervals: [1000] },
      )
      .toBe("completed");
    expect(["optimal", "feasible"]).toContain(snapshot.jobs[0].result?.status);
    await expect(
      page.getByText(/Vorschlag gefunden/, { exact: false }),
    ).toBeVisible({ timeout: 20000 });
    await page
      .locator("summary")
      .filter({ hasText: /Vorschlag ansehen/ })
      .click();
    await page
      .getByRole("button", {
        name: "Vorschlag prüfen & übernehmen",
        exact: true,
      })
      .click();
    await expect(
      page.locator("summary").filter({ hasText: /Vorschlag ansehen/ }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Verbindlich machen", exact: true })
      .click();
    await expect
      .poll(async () => {
        snapshot = (await (await page.request.get("/api/v1/planning")).json())
          .data;
        return snapshot.state.periods.find((period) => period.month === month)
          ?.status;
      })
      .toBe("fixed");
    expect(snapshot.state.periods).toHaveLength(3);
    expect(snapshot.state.periods[0].publishedShifts.length).toBeGreaterThan(0);
    expect(
      snapshot.issues.filter((issue) => issue.severity === "error"),
    ).toEqual([]);
  } finally {
    await cleanup(owner.tenantId, owner.userId);
  }
});

test("keeps existing custom coverage and additional breaks when editing a shift", async ({
  page,
}) => {
  const owner = await createOwner();
  try {
    await login(page, owner.email);
    await page.goto("/app/settings");
    await page
      .getByRole("button", { name: "Dienstplanung aktivieren", exact: true })
      .click();
    await page.waitForURL(/\/app\/planning$/);
    const snapshot: PlanningBoardData = (
      await (await page.request.get("/api/v1/planning")).json()
    ).data;
    const config = planningFixture().state.config;
    config.firstMonth = snapshot.context.today.slice(0, 7) + "-01";
    config.profiles = [
      { ...config.profiles[0], employeeId: snapshot.context.employees[0].id },
    ];
    config.templates[0].breaks = [
      { offsetMinutes: 120, minutes: 15 },
      { offsetMinutes: 240, minutes: 15 },
    ];
    expect(
      (
        await page.request.post("/api/v1/planning", {
          data: { action: "configure", config, version: snapshot.version },
        })
      ).ok(),
    ).toBe(true);
    await page.reload();
    await page
      .getByRole("button", { name: "Einrichtung", exact: true })
      .click();
    const setup = page.getByRole("region", {
      name: "Dienstplanung einrichten",
    });
    await setup.getByRole("button", { name: "Weiter", exact: true }).click();
    await setup.getByRole("button", { name: "Weiter", exact: true }).click();
    await expect(
      setup.getByRole("checkbox", {
        name: "Besetzung automatisch aus Schichten übernehmen",
        exact: true,
      }),
    ).not.toBeChecked();
    await setup
      .getByRole("button", { name: "Bearbeiten", exact: true })
      .click();
    await setup
      .getByRole("region", { name: "Wiederkehrende Schichten" })
      .getByLabel("Ende", { exact: true })
      .fill("11:00");
    await setup
      .getByRole("button", { name: "Schicht speichern", exact: true })
      .click();
    await setup.getByRole("button", { name: "Weiter", exact: true }).click();
    await setup
      .getByRole("button", { name: "Einrichtung speichern", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Jetzt euren ersten Plan anlegen",
        exact: true,
      }),
    ).toBeVisible();
    const saved: PlanningBoardData = (
      await (await page.request.get("/api/v1/planning")).json()
    ).data;
    expect(saved.state.config.demands).toEqual(config.demands);
    expect(saved.state.config.templates[0].end).toBe("11:00");
    expect(saved.state.config.templates[0].breaks).toEqual(
      config.templates[0].breaks,
    );
  } finally {
    await cleanup(owner.tenantId, owner.userId);
  }
});
