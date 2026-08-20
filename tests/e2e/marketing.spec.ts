import { test, expect } from "@playwright/test";

const PUBLIC_PAGES = [
  ["/", "Digitale Zeiterfassung für kleine Betriebe"],
  ["/funktionen", "Funktionen der digitalen Zeiterfassung"],
  ["/preise", "Kostenlose Zeiterfassung bis 3 Personen"],
  ["/sicherheit", "Sicherheit und Datenschutz"],
  ["/digitale-zeiterfassung", "Digitale Zeiterfassung einführen"],
  ["/zeiterfassung-kleinbetriebe", "Zeiterfassung für Kleinbetriebe"],
  ["/open-source-zeiterfassung", "Open-Source-Zeiterfassung"],
  [
    "/arbeitszeiterfassung-pflicht-kleinbetriebe",
    "Arbeitszeiterfassung: Pflicht für Kleinbetriebe 2026",
  ],
  ["/arbeitszeitnachweis", "Arbeitszeitnachweis 2026"],
  ["/pausenregelung-arbeitszeit", "Pausenregelung Arbeitszeit"],
  ["/projektzeiterfassung", "Projektzeiterfassung für kleine Teams"],
  ["/arbeitszeitrechner", "Arbeitszeitrechner: Netto-Arbeitszeit"],
  ["/stundenzettel", "Stundenzettel kostenlos"],
  ["/ueberstundenrechner", "Überstundenrechner"],
  ["/monatsarbeitszeit-rechner", "Monatsarbeitszeit-Rechner"],
] as const;

test.describe("Marketing and SEO", () => {
  test("public pages have unique indexable metadata", async ({ page }) => {
    for (const [path, title] of PUBLIC_PAGES) {
      await page.goto(path);
      await expect(page).toHaveTitle(new RegExp(title));
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index, follow/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${path === "/" ? "" : path}$`));
    }
  });

  test("auth and setup routes are excluded from indexing", async ({ page, request }) => {
    for (const path of ["/login", "/register", "/forgot-password", "/setup", "/auth/set-password"]) {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
    }

    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const [path] of PUBLIC_PAGES) {
      const expectedPath = path === "/" ? "</loc>" : `${path}</loc>`;
      expect(sitemap).toContain(expectedPath);
    }
    expect(sitemap).not.toContain("/register</loc>");
    expect(sitemap).not.toContain("/login</loc>");
  });

  test("landing page presents real product proof and an accessible primary message", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: /digitale zeiterfassung\. ohne theater/i })).toBeVisible();
    await expect(page.getByRole("img", { name: /quoska cockpit/i }).first()).toBeVisible();
    await expect(page.getByRole("img", { name: /mobile stempeluhr/i }).first()).toBeVisible();
    await expect(page.getByText("Datenbank in Frankfurt").first()).toBeVisible();
    await expect(
      page.locator('a[href="/zeiterfassung-kleinbetriebe"]').filter({
        hasText: "Zeiterfassung für Kleinbetriebe",
      }),
    ).toBeVisible();
    await expect(
      page.locator('a[href="/open-source-zeiterfassung"]').filter({
        hasText: "Open-Source-Zeiterfassung",
      }).first(),
    ).toBeVisible();
    await expect(
      page.locator('a[href="/arbeitszeiterfassung-pflicht-kleinbetriebe"]').filter({
        hasText: "Pflicht zur Arbeitszeiterfassung",
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Open Source auf GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/quoska-hq/quoska",
    );
  });

  test("legal guide identifies its legal status, limitations, and primary sources", async ({ page }) => {
    await page.goto("/arbeitszeiterfassung-pflicht-kleinbetriebe");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /arbeitszeiterfassung für kleinbetriebe/i,
      }),
    ).toBeVisible();
    await expect(page.getByText(/keine rechtsberatung für den einzelfall/i)).toBeVisible();
    await expect(page.getByText(/noch nicht zwingend sein/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /BAG, 1 ABR 22\/21/i }).first()).toHaveAttribute(
      "href",
      "https://www.bundesarbeitsgericht.de/entscheidung/1-abr-22-21/",
    );
    await expect
      .poll(() => page.locator('script[type="application/ld+json"]').textContent())
      .toContain("FAQPage");
  });

  test("supporting guides cite primary sources and explain their limits", async ({ page }) => {
    await page.goto("/arbeitszeitnachweis");
    await expect(page.getByText(/keine rechtsberatung für den einzelfall/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /§ 16 ArbZG/i })).toHaveAttribute(
      "href",
      "https://www.gesetze-im-internet.de/arbzg/__16.html",
    );

    await page.goto("/pausenregelung-arbeitszeit");
    await expect(page.getByText(/ist keine rechtsberatung/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /§ 4 Arbeitszeitgesetz/i })).toHaveAttribute(
      "href",
      "https://www.gesetze-im-internet.de/arbzg/__4.html",
    );
    await expect
      .poll(() => page.locator('script[type="application/ld+json"]').textContent())
      .toContain("FAQPage");
  });
});
