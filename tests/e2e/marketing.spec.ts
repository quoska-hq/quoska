import { test, expect } from "@playwright/test";

const PUBLIC_PAGES = [
  ["/", "Digitale Zeiterfassung für kleine Betriebe"],
  ["/funktionen", "Funktionen der digitalen Zeiterfassung"],
  ["/preise", "Preise der Zeiterfassung"],
  ["/sicherheit", "Sicherheit und Datenschutz"],
  ["/digitale-zeiterfassung", "Digitale Zeiterfassung einfach einführen"],
  ["/zeiterfassung-kleinbetriebe", "Zeiterfassung für Kleinbetriebe"],
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
    await expect(page.getByRole("link", { name: "Open Source auf GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/quoska-hq/quoska",
    );
  });
});
