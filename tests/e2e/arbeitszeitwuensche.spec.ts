import { test, expect } from "@playwright/test";

test("work-time preferences article exposes its sources and usable conversation template", async ({ page, request }) => {
  await page.goto("/arbeitszeitwuensche");
  await page.getByRole("link", { name: "Gesprächsvorlage herunterladen" }).click();
  await expect(page).toHaveURL(/#gespraechsvorlage$/);
  const download = page.getByRole("link", { name: "Gesprächsvorlage als CSV" });
  const href = await download.getAttribute("href");
  expect(href).toBe("/vorlagen/arbeitszeitwuensche-gespraech.csv");
  const csv = await request.get(href!);
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain("Frage;Notiz");
  await expect(page.locator("#quelle-destatis a")).toHaveAttribute("href", /destatis\.de\/DE\/Presse/);
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const article = blocks.map(block => JSON.parse(block)).find(block => block["@type"] === "Article");
  expect(article.mainEntityOfPage).toMatch(/\/arbeitszeitwuensche$/);
  expect(article.datePublished).toBe("2026-09-07");
  await page.goto("/ueberstundenrechner");
  await page.getByRole("link", { name: "Arbeitszeitwünsche von Mitarbeitenden besprechen" }).click();
  await expect(page).toHaveURL(/\/arbeitszeitwuensche$/);
});
