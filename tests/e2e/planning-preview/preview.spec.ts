import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/preview/dienstplanung");
  await expect(
    page.getByRole("heading", { name: "Dienstplanung", exact: true }),
  ).toBeVisible();
});

test("offers a side-effect-free suggestion, applies it and protects a released month", async ({
  page,
}) => {
  const gaps = page.getByRole("button", { name: /^Offene Schicht/ });
  await expect(gaps).toHaveCount(2);
  await page
    .getByRole("button", { name: "Planungsvorschlag", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Verwerfen" })
    .click();
  await expect(gaps).toHaveCount(2);
  await page
    .getByRole("button", { name: "Monat freigeben", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Verbindlich freigeben" })
    .click();
  await expect(page.getByRole("alert")).toContainText("offenen Schichten");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Abbrechen" })
    .click();
  await page
    .getByRole("button", { name: "Planungsvorschlag", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Vorschlag übernehmen" })
    .click();
  await expect(gaps).toHaveCount(0);
  await page
    .getByRole("button", { name: "Monat freigeben", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Verbindlich freigeben" })
    .click();
  await expect(
    page.getByRole("button", { name: "November 2026, Verbindlich" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Planungsvorschlag", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Monatswechsel simulieren" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Nächsten Monat ergänzen" })
    .click();
  await expect(
    page.getByRole("button", { name: "Januar 2027, Entwurf" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Oktober 2026,/ }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "Meine Dienste" }).click();
  await expect(
    page.getByText("Für Januar wurde noch kein Plan angekündigt."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Monat ankündigen", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Monat ankündigen", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Januar 2027, Angekündigt" }),
  ).toBeVisible();
  await expect(
    page.getByText("Für Januar wurde noch kein Plan angekündigt."),
  ).toHaveCount(0);
});

test("filters branches and permits valid manual assignment with an explicit lock", async ({
  page,
}) => {
  await page.getByLabel("Filiale filtern").selectOption("markt");
  await expect(
    page.getByRole("button", { name: /Offene Schicht/ }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: /Offene Schicht/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading")).toHaveText(
    "Offene Schicht besetzen",
  );
  const employee = dialog.getByLabel("Mitarbeitende");
  const available = await employee
    .locator("option:not([disabled])")
    .nth(1)
    .getAttribute("value");
  await employee.selectOption(available!);
  await dialog
    .getByLabel("Zuordnung für automatische Vorschläge fixieren")
    .check();
  await dialog.getByRole("button", { name: "Änderung übernehmen" }).click();
  await expect(
    page.getByRole("button", { name: /Offene Schicht/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Oktober 2026, Verbindlich" }).click();
  await page
    .getByRole("button", { name: /Backstube, Am Marktplatz, 05.10.2026/ })
    .click();
  await expect(
    page.getByRole("dialog").getByLabel("Mitarbeitende"),
  ).toBeDisabled();
});

test("shows separate employee hours and changes both assignments in a valid swap", async ({
  page,
}) => {
  await page.getByRole("tab", { name: "Team & Regeln" }).click();
  await page.getByLabel("Team durchsuchen").fill("Anna");
  await expect(page.getByRole("cell", { name: /Anna Weber/ })).toBeVisible();
  await expect(page.getByRole("cell", { name: /Jonas Müller/ })).toHaveCount(0);
  await expect(
    page.getByRole("columnheader", { name: "Gleitzeit aktuell" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Meine Dienste" }).click();
  const before = await page.locator('[class*="agendaDate"]').allTextContents();
  await page
    .getByRole("button", { name: /^Tauschen/ })
    .first()
    .click();
  const select = page
    .getByRole("dialog")
    .getByLabel("Passenden Dienst auswählen");
  const option = await select.locator("option").nth(1).getAttribute("value");
  expect(option).toBeTruthy();
  await select.selectOption(option!);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Beispieltausch bestätigen" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Beispieltausch übernommen",
  );
  const after = await page.locator('[class*="agendaDate"]').allTextContents();
  expect(after.length).toBe(before.length);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("remains usable on a phone without overflowing the document or making data requests", async ({
  page,
}) => {
  const errors: string[] = [];
  const dataRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().includes("/api/")) dataRequests.push(request.url());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Dienstplanung", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.getByRole("tab", { name: "Meine Dienste" }).click();
  await expect(page.getByLabel("Mitarbeiteransicht wählen")).toBeVisible();
  await page
    .getByRole("button", { name: "Vorabversion · Beispieldaten" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "vollständige Optimierung",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Vorschau erkunden" })
    .click();
  await page
    .getByRole("button", { name: "Beispiel zurücksetzen", exact: true })
    .click();
  await expect(
    page.getByRole("tab", { name: "Dienstplan", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  expect(errors).toEqual([]);
  expect(dataRequests).toEqual([]);
});
