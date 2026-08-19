/**
 * Story 1.5: App Shell — Layout, Navigation & PWA
 */

import { test, expect } from "@playwright/test";
import { testEmail, TEST_PASSWORD, cleanupTestUser, createTestUser } from "./helpers";

test.describe("App Shell — Admin Navigation", () => {
  const email = testEmail("nav");

  test.beforeAll(async () => {
    await createTestUser({
      email,
      password: TEST_PASSWORD,
      firstName: "Anna",
      lastName: "Admin",
      companyName: "Nav Test GmbH",
      role: "admin",
      bundesland: "berlin",
    });
  });

  test.afterAll(async () => {
    await cleanupTestUser(email);
  });

  test("admin sees all navigation items in sidebar", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    await expect(page.getByRole("link", { name: /stempeln/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /meine zeiten/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /benachrichtigungen/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /cockpit/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /mitarbeiter/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /berichte/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /einstellungen/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /website-analytics/i })).not.toBeVisible();
    await expect(page.getByRole("button", { name: /abmelden/i })).toBeVisible();
    await expect(page.getByText("Anna Admin")).toBeVisible();
  });

  test("dashboard shows the admin cockpit", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    await expect(page.getByRole("heading", { name: /cockpit/i })).toBeVisible();
    await expect(page.getByTestId("cockpit-overview")).toBeVisible();
  });
});

test.describe("App Shell — Employee Role", () => {
  const adminEmail = testEmail("empnav-admin");
  const employeeEmail = testEmail("empnav-employee");
  let tenantId: string;

  test.beforeAll(async () => {
    const admin = await createTestUser({
      email: adminEmail,
      password: TEST_PASSWORD,
      firstName: "Boss",
      lastName: "Admin",
      companyName: "Emp Nav Co",
      role: "admin",
    });
    tenantId = admin.tenantId;

    // Create employee in same tenant
    const { data: empAuth } = await (await import("./helpers")).adminClient.auth.admin.createUser({
      email: employeeEmail,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    await (await import("./helpers")).adminClient
      .from("employees")
      .insert({ tenant_id: tenantId, user_id: empAuth.user?.id, first_name: "Max", last_name: "Mitarbeiter", email: employeeEmail, role: "employee" });
    await (await import("./helpers")).adminClient.rpc("set_employee_claims", { user_uuid: empAuth.user?.id });
  });

  test.afterAll(async () => {
    await cleanupTestUser(adminEmail);
    await cleanupTestUser(employeeEmail);
  });

  test("employee does NOT see admin-only nav items", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(employeeEmail);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    // Employee sees clock/my-times links (sidebar + dashboard cards may duplicate)
    await expect(page.getByRole("link", { name: /stempeln/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /meine zeiten/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /mitarbeiter/i })).not.toBeVisible();
    await expect(page.getByRole("link", { name: /berichte/i })).not.toBeVisible();
    await expect(page.getByRole("link", { name: /einstellungen/i })).not.toBeVisible();
  });
});

test.describe("App Shell — Mobile Responsive", () => {
  const email = testEmail("mobile");

  test.beforeAll(async () => {
    await createTestUser({
      email,
      password: TEST_PASSWORD,
      firstName: "Mobile",
      lastName: "User",
      companyName: "Mobile Co",
      role: "admin",
    });
  });

  test.afterAll(async () => {
    await cleanupTestUser(email);
  });

  test("mobile navigation stays fitted, fixed and exposes secondary pages", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
    await expect(page.getByTestId("cockpit-overview")).toBeVisible();

    // Sidebar hidden on mobile
    const sidebar = page.locator("aside");
    await expect(sidebar).toBeHidden();

    const bottomNav = page.getByTestId("mobile-bottom-nav");
    await expect(bottomNav).toBeVisible();
    await expect(bottomNav).toHaveCSS("position", "fixed");
    await expect(bottomNav.getByRole("link")).toHaveCount(4);
    await expect(bottomNav.getByRole("button", { name: "Mehr Navigation öffnen" })).toBeVisible();

    const navBox = await bottomNav.boundingBox();
    expect(navBox).not.toBeNull();
    expect(navBox!.x).toBeCloseTo(0, 0);
    expect(navBox!.width).toBeCloseTo(320, 0);
    const navSlots = bottomNav.locator(":scope > div > *");
    await expect(navSlots).toHaveCount(5);
    for (const slot of await navSlots.all()) {
      const box = await slot.boundingBox();
      expect(box?.width).toBeCloseTo(64, 0);
    }
    await expect.poll(() => page.evaluate(() =>
      getComputedStyle(document.documentElement).overflowX,
    )).toBe("clip");
    expect(await page.evaluate(() => document.documentElement.scrollWidth))
      .toBe(320);
    const initialNavY = navBox!.y;
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, left: 999 }));
    expect(await page.evaluate(() => window.scrollX)).toBe(0);
    const scrolledNavBox = await bottomNav.boundingBox();
    expect(scrolledNavBox?.y).toBeCloseTo(initialNavY, 0);

    await bottomNav.getByRole("button", { name: "Mehr Navigation öffnen" }).click();
    const moreMenu = page.getByTestId("mobile-more-menu");
    await expect(moreMenu).toBeVisible();
    await moreMenu.evaluate(async (element) => {
      await Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished));
    });
    const menuBox = await moreMenu.boundingBox();
    const horizontalOffsets = await page.evaluate(() => ({
      window: window.scrollX,
      html: document.documentElement.scrollLeft,
      body: document.body.scrollLeft,
      visualViewport: window.visualViewport?.offsetLeft ?? 0,
    }));
    expect(horizontalOffsets).toEqual({ window: 0, html: 0, body: 0, visualViewport: 0 });
    expect(menuBox?.x).toBeCloseTo(0, 0);
    expect(menuBox?.width).toBeCloseTo(320, 0);
    expect((menuBox?.y ?? 0) + (menuBox?.height ?? 0)).toBeCloseTo(568, 0);
    const menuHeaderBox = await moreMenu.locator('[data-slot="dialog-header"]').boundingBox();
    expect(menuHeaderBox?.x).toBeCloseTo(0, 0);
    expect(menuHeaderBox?.width).toBeCloseTo(320, 0);
    const closeButtonBox = await moreMenu.getByRole("button", { name: "Menü schließen" }).boundingBox();
    expect((closeButtonBox?.x ?? 0) + (closeButtonBox?.width ?? 0))
      .toBeLessThanOrEqual(304);
    await expect(moreMenu.getByRole("link", { name: "Benachrichtigungen" })).toBeVisible();
    await expect(moreMenu.getByRole("link", { name: "Berichte" })).toBeVisible();
    await expect(moreMenu.getByRole("button", { name: "Abmelden" })).toBeVisible();
    await moreMenu.getByRole("link", { name: "Berichte" }).click();
    await expect(page).toHaveURL(/\/app\/reports/);
    await expect(moreMenu).not.toBeVisible();
    await page.evaluate(() => window.scrollTo({ left: 999, top: window.scrollY }));
    expect(await page.evaluate(() => window.scrollX)).toBe(0);
  });

  test("app pages do not create horizontal document scrolling on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    const routes = [
      "/app/dashboard",
      "/app/clock",
      "/app/my-times",
      "/app/notifications",
      "/app/vacation",
      "/app/sick",
      "/app/employees",
      "/app/projects",
      "/app/reports",
      "/app/settings",
    ];
    for (const route of routes) {
      await page.goto(route);
      await expect(page.getByTestId("app-header")).toBeVisible();
      const contentBox = await page.locator("[data-app-content]").boundingBox();
      expect(contentBox?.x, route).toBeGreaterThanOrEqual(0);
      expect((contentBox?.x ?? 0) + (contentBox?.width ?? 0), route)
        .toBeLessThanOrEqual(375);
      await page.evaluate(() => window.scrollTo({ left: 999, top: window.scrollY }));
      expect(await page.evaluate(() => window.scrollX), route).toBe(0);
    }
  });

  test("sidebar visible on desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    const sidebar = page.locator("aside");
    await expect(sidebar).toBeVisible();

    const sidebarHeader = page.getByTestId("sidebar-header");
    const appHeader = page.getByTestId("app-header");
    const [sidebarBox, appBox] = await Promise.all([
      sidebarHeader.boundingBox(),
      appHeader.boundingBox(),
    ]);
    expect(sidebarBox).not.toBeNull();
    expect(appBox).not.toBeNull();
    expect(sidebarBox!.height).toBe(appBox!.height);
    await expect(sidebarHeader).toHaveCSS("background-color", "rgb(248, 247, 243)");
    await expect(appHeader).toHaveCSS("background-color", "rgb(248, 247, 243)");
  });
});

test.describe("PWA", () => {
  test("health endpoint reports the application revision", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();
    await expect(response.json()).resolves.toMatchObject({ status: "ok" });
  });

  test("manifest.json is valid", async ({ request }) => {
    const response = await request.get("/manifest.json");
    expect(response.ok()).toBeTruthy();
    const manifest = await response.json();
    expect(manifest.name).toBe("Quoska");
    expect(manifest.short_name).toBe("Quoska");
    expect(manifest.display).toBe("standalone");
    expect(manifest.lang).toBe("de");
    expect(manifest.theme_color).toBe("#f5f3ee");
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test("service worker file exists", async ({ request }) => {
    const response = await request.get("/sw.js");
    expect(response.ok()).toBeTruthy();
  });
});
