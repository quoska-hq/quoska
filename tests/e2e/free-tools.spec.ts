import { expect, test } from "@playwright/test";

test.describe("free working-time tools", () => {
  test("Arbeitszeitrechner handles normal and explicit overnight shifts privately", async ({ page }) => {
    const toolPayloads: unknown[] = [];
    await page.route("**/api/site-analytics/collect", async (route) => {
      const payload = route.request().postDataJSON() as { event?: string };
      if (payload.event) toolPayloads.push(payload);
      await route.fulfill({ status: 204 });
    });
    await page.goto("/arbeitszeitrechner");

    await page.getByRole("button", { name: "Arbeitszeit berechnen" }).click();
    const result = page.locator('section[aria-live="polite"]');
    await expect(result).toContainText("08:00");
    await expect(result).toContainText("8,00");

    await page.getByLabel("Arbeitsbeginn").fill("22:00");
    await page.getByLabel("Arbeitsende").fill("06:30");
    await page.getByRole("button", { name: "Arbeitszeit berechnen" }).click();
    await expect(page.getByText("Das Ende liegt vor dem Beginn. Aktiviere „Ende am Folgetag“."))
      .toBeVisible();
    await page.getByText("Ende am Folgetag", { exact: true }).click();
    await page.getByRole("button", { name: "Arbeitszeit berechnen" }).click();
    await expect(result).toContainText("08:00");

    expect(toolPayloads.some((payload) => JSON.stringify(payload).includes("22:00"))).toBe(false);
    expect(toolPayloads.some((payload) => JSON.stringify(payload).includes("06:30"))).toBe(false);
  });

  test("Stundenzettel totals rows and provides local CSV and print exports", async ({ page }) => {
    await page.goto("/stundenzettel");
    await page.getByLabel("Unternehmen").fill("Musterbetrieb");
    await page.getByLabel("Mitarbeitende Person").fill("Erika Beispiel");
    await page.getByLabel("Beginn Sa, 01.08.").fill("08:00");
    await page.getByLabel("Ende Sa, 01.08.").fill("16:30");
    await page.getByLabel("Pause Sa, 01.08.").fill("30");
    await expect(page.getByLabel("Beginn Sa, 01.08.")).toHaveCSS("color", "rgb(23, 24, 27)");

    const result = page.locator('section[aria-live="polite"]');
    await expect(result).toContainText("08:00");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "CSV herunterladen" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("stundenzettel-2026-08-erika-beispiel.csv");

    await page.evaluate(() => {
      window.print = () => document.body.setAttribute("data-print-called", "true");
    });
    await page.getByRole("button", { name: "PDF / Drucken" }).click();
    await expect(page.locator("body")).toHaveAttribute("data-print-called", "true");

    await page.emulateMedia({ media: "print" });
    const printSheet = page.locator("[data-timesheet-print-sheet]");
    await expect(page.locator("[data-timesheet-screen]")).toBeHidden();
    await expect(printSheet).toBeVisible();
    await expect(printSheet.getByText("Musterbetrieb", { exact: true })).toBeVisible();
    await expect(printSheet.getByText("Erika Beispiel", { exact: true })).toBeVisible();
    await expect(printSheet.getByText("08:00", { exact: true }).first()).toBeVisible();
    await expect(printSheet.getByText("16:30", { exact: true })).toBeVisible();
    await expect(printSheet).toContainText("Monatssumme: 08:00");
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.byteLength).toBeGreaterThan(10_000);
    expect(pdf.toString("latin1")).toMatch(/\/Type \/Pages\s*\/Count 1\b/);
  });

  test("Überstundenrechner combines target, actual and prior balance", async ({ page }) => {
    await page.goto("/ueberstundenrechner");
    await page.getByRole("button", { name: "Saldo berechnen" }).click();
    const result = page.locator('section[aria-live="polite"]');
    await expect(result).toContainText("+02:00");

    await page.getByLabel("Bisheriger Saldo").fill("-03:00");
    await page.getByRole("button", { name: "Saldo berechnen" }).click();
    await expect(result).toContainText("−01:00");
  });

  test("Monatsarbeitszeit applies state holidays and exact-date absences", async ({ page }) => {
    await page.goto("/monatsarbeitszeit-rechner");
    await page.getByLabel("Monat").selectOption("5");
    await page.getByRole("button", { name: "Monatsarbeitszeit berechnen" }).click();
    const result = page.locator('section[aria-live="polite"]');
    await expect(result).toContainText("144:00");
    await expect(result).toContainText("Christi Himmelfahrt");

    await page.getByRole("button", { name: "Abwesenheit hinzufügen" }).click();
    await page.getByLabel("Datum 1").fill("2026-05-04");
    await page.getByRole("button", { name: "Monatsarbeitszeit berechnen" }).click();
    await expect(result).toContainText("136:00");
    await expect(result).toContainText("08:00");
  });
});
