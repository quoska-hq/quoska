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
  ["/alternativen", "Zeiterfassungssoftware im Vergleich"],
  ["/alternativen/clockodo", "Clockodo-Alternative"],
  ["/alternativen/clockin", "clockin-Alternative"],
  ["/alternativen/crewmeister", "Crewmeister-Alternative"],
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

  test("sitemap contains only direct canonical responses", async ({ request }) => {
    for (const [path] of PUBLIC_PAGES) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), `${path} must not redirect`).toBe(200);
    }
  });

  test("every internal footer link resolves and its fragment exists", async ({ page, request }) => {
    await page.goto("/preise");
    const links = await page.locator("footer a").evaluateAll((elements) =>
      elements
        .map((element) => ({
          label: element.textContent?.trim().replace(/\s+/g, " ") ?? "",
          href: element.getAttribute("href") ?? "",
        }))
        .filter((link) => link.href.startsWith("/")),
    );

    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const url = new URL(link.href, "http://localhost");
      const response = await request.get(url.pathname, { maxRedirects: 0 });
      expect(response.status(), `${link.label} (${link.href}) must resolve directly`).toBe(200);

      if (url.hash) {
        await page.goto(`${url.pathname}${url.hash}`);
        await expect(page.locator(url.hash), `${link.href} must target an existing element`).toHaveCount(1);
      }
    }

    await page.goto("/preise");
    await page.getByRole("link", { name: "Alternativen", exact: true }).click();
    await expect(page).toHaveURL(/\/alternativen$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("robots.txt permits AI crawlers without exposing private routes", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    const robots = await response.text();

    for (const crawler of [
      "OAI-SearchBot",
      "ChatGPT-User",
      "GPTBot",
      "Claude-SearchBot",
      "Claude-User",
      "PerplexityBot",
      "Perplexity-User",
      "Google-Extended",
    ]) {
      expect(robots).toContain(`User-Agent: ${crawler}`);
    }
    expect(robots).toContain("User-Agent: *");
    expect(robots).toContain("Allow: /");
    expect(robots).toContain("Disallow: /app/");
    expect(robots).toContain("Disallow: /api/");
    expect(robots).toContain("Disallow: /setup");
    expect(robots).toMatch(/Sitemap: https?:\/\/[^/]+\/sitemap\.xml/);
  });

  test("llms.txt summarizes the product, current prices, and canonical pages", async ({ request }) => {
    const response = await request.get("/llms.txt");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/plain");
    const body = await response.text();

    expect(body).toContain("Team Founder: 9 EUR pro Monat statt 19 EUR");
    expect(body).toContain("Business Founder: 59 EUR pro Monat statt 69 EUR");
    expect(body).toContain("Pro Founder: 99 EUR pro Monat statt 129 EUR");
    expect(body).toMatch(/- Preise: https?:\/\/[^/]+\/preise/);
    expect(body).toMatch(/- Alternativen und Vergleiche: https?:\/\/[^/]+\/alternativen/);
  });

  test("pricing communicates the capped Founder offer and standard prices", async ({ page }) => {
    await page.goto("/preise");
    const businessCard = page.locator("article").filter({
      has: page.getByRole("heading", { name: "Business", exact: true }),
    });
    const proCard = page.locator("article").filter({
      has: page.getByRole("heading", { name: "Pro", exact: true }),
    });
    await expect(page.getByText("Founder-Preis", { exact: true })).toHaveCount(3);
    await expect(page.getByText(/statt 19 € · erste 100 Unternehmen/)).toBeVisible();
    await expect(businessCard).toContainText("59 €");
    await expect(businessCard).toContainText("69 €");
    await expect(proCard).toContainText("99 €");
    await expect(proCard).toContainText("129 €");
    await expect(page.getByText("Zeiterfassung und Pausen", { exact: true })).toHaveCount(4);

    await page.setViewportSize({ width: 390, height: 844 });
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  });

  test("alternative pages expose transparent sources and structured data", async ({ page }) => {
    for (const competitor of ["clockodo", "clockin", "crewmeister"]) {
      await page.goto(`/alternativen/${competitor}`);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(/Alternative/i);
      await expect(page.getByText(/zuletzt am 20\. August 2026/i)).toBeVisible();
      await expect(page.getByRole("heading", { name: "Offizielle Quellen" })).toBeVisible();
      const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(jsonLd.join("\n")).toContain("BreadcrumbList");
      expect(jsonLd.join("\n")).toContain("WebPage");
    }
  });

  test("all public JSON-LD blocks contain valid JSON", async ({ page }) => {
    for (const [path] of PUBLIC_PAGES) {
      await page.goto(path);
      const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(blocks.length, `${path} should expose structured data`).toBeGreaterThan(0);
      for (const block of blocks) {
        expect(() => JSON.parse(block), `${path} contains invalid JSON-LD`).not.toThrow();
      }
    }
  });

  test("alternative pages do not overflow a phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of [
      "/alternativen",
      "/alternativen/clockodo",
      "/alternativen/clockin",
      "/alternativen/crewmeister",
    ]) {
      await page.goto(path);
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content, `${path} overflows horizontally`).toBeLessThanOrEqual(
        dimensions.viewport,
      );
    }
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
      .poll(async () =>
        (await page.locator('script[type="application/ld+json"]').allTextContents()).join("\n"),
      )
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
      .poll(async () =>
        (await page.locator('script[type="application/ld+json"]').allTextContents()).join("\n"),
      )
      .toContain("FAQPage");
  });
});
