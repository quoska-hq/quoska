/**
 * Story 1.3: Authentication — Register, Login, Logout
 */

import { test, expect } from "@playwright/test";
import {
  adminClient,
  testEmail,
  TEST_PASSWORD,
  cleanupTestUser,
  createTestUser,
} from "./helpers";

test.describe("Authentication", () => {
  const email = testEmail("auth");
  const password = TEST_PASSWORD;

  test.afterAll(async () => {
    await cleanupTestUser(email);
  });

  test("register page loads with correct German text", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /account erstellen/i })).toBeVisible();
    await expect(page.getByLabel("Vorname")).not.toBeVisible();
    await expect(page.getByLabel("Firmenname")).not.toBeVisible();
    await expect(page.getByLabel("E-Mail")).toBeVisible();
    await expect(page.getByLabel("Passwort")).toBeVisible();
    await expect(page.getByRole("button", { name: /weiter zur einrichtung/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /anmelden/i })).toBeVisible();
  });

  test("can register a new company and redirect to setup", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(password);
    await page.getByRole("button", { name: /weiter zur einrichtung/i }).click();

    await expect(page).toHaveURL(/\/setup/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Dein Profil" })).toBeVisible();
    await expect(page.getByLabel("Vorname")).toHaveValue("");
  });

  test("register shows validation errors for empty fields", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("button", { name: /weiter zur einrichtung/i }).click();

    await expect(page.getByText("Ungültige E-Mail-Adresse")).toBeVisible();
  });

  test("login page loads with German text", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("E-Mail")).toBeVisible();
    await expect(page.getByLabel("Passwort")).toBeVisible();
    await expect(page.getByRole("button", { name: /anmelden/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /registrieren/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /passwort vergessen/i })).toBeVisible();
  });

  test("password reset request does not reveal whether an account exists", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByLabel("E-Mail").fill(testEmail("unknown-recovery"));
    await page.getByRole("button", { name: /reset-link senden/i }).click();

    await expect(
      page.getByText(/falls für diese adresse ein konto besteht/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("recovery token is consumed only after confirmation and sets a new password", async ({ page }) => {
    const recoveryEmail = testEmail("recovery");
    const newPassword = "new-testpass456";

    await createTestUser({
      email: recoveryEmail,
      password,
      firstName: "Recovery",
      lastName: "Tester",
      companyName: "Recovery Test Co",
    });

    try {
      const { data, error } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email: recoveryEmail,
      });
      expect(error).toBeNull();
      const properties = data.properties;
      expect(properties).not.toBeNull();
      if (!properties) throw new Error("Supabase did not return recovery link properties");
      expect(properties.hashed_token).toBeTruthy();

      const confirmUrl = `/auth/confirm?token_hash=${encodeURIComponent(properties.hashed_token)}&type=recovery&next=/auth/set-password`;
      await page.goto(confirmUrl);
      await expect(page.getByRole("heading", { name: /neues passwort anlegen/i })).toBeVisible();

      // A mailbox scanner may GET the link more than once. Neither GET nor a
      // reload may consume the token before the human confirms the form.
      await page.reload();
      await page.getByRole("button", { name: /weiter zum neuen passwort/i }).click();

      await expect(page).toHaveURL(/\/auth\/set-password/, { timeout: 10_000 });
      await page.getByLabel("Neues Passwort").fill(newPassword);
      await page.getByLabel("Passwort wiederholen").fill(newPassword);
      await page.getByRole("button", { name: /passwort speichern/i }).click();

      await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
    } finally {
      await cleanupTestUser(recoveryEmail);
    }
  });

  test("can log in with valid credentials and see dashboard", async ({ page }) => {
    // Create a fully set-up user first
    const loginEmail = testEmail("login");
    await createTestUser({
      email: loginEmail,
      password,
      firstName: "Login",
      lastName: "Tester",
      companyName: "Login Test Co",
    });

    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(loginEmail);
    await page.getByLabel("Passwort").fill(password);
    await page.getByRole("button", { name: /anmelden/i }).click();

    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Cockpit" })).toBeVisible();

    await cleanupTestUser(loginEmail);
  });

  test("login shows error for wrong password", async ({ page }) => {
    const wrongEmail = testEmail("wrong");
    await createTestUser({
      email: wrongEmail,
      password,
      firstName: "Wrong",
      lastName: "Pass",
      companyName: "Wrong Pass Co",
    });

    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(wrongEmail);
    await page.getByLabel("Passwort").fill("wrongpassword");
    await page.getByRole("button", { name: /anmelden/i }).click();

    // Generic error — no hint which field is wrong
    await expect(page.getByText(/falsch/i)).toBeVisible({ timeout: 5_000 });

    await cleanupTestUser(wrongEmail);
  });

  test("login shows error for non-existent user", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill("nonexistent@quoska.dev");
    await page.getByLabel("Passwort").fill("something123");
    await page.getByRole("button", { name: /anmelden/i }).click();

    await expect(page.getByText(/falsch/i)).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Middleware route protection", () => {
  test("unauthenticated /app/dashboard redirects to /login", async ({ page }) => {
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });

  test("unauthenticated /setup without a draft redirects to registration", async ({ page }) => {
    await page.goto("/setup");
    await expect(page).toHaveURL(/\/register/, { timeout: 5_000 });
  });

  test("redirect includes redirect param", async ({ page }) => {
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/login\?redirect=/, { timeout: 5_000 });
  });
});

test.describe("Logout", () => {
  const email = testEmail("logout");

  test.beforeAll(async () => {
    await createTestUser({
      email,
      password: TEST_PASSWORD,
      firstName: "Logout",
      lastName: "Tester",
      companyName: "Logout Co",
    });
  });

  test.afterAll(async () => {
    await cleanupTestUser(email);
  });

  test("can log out via sidebar", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 });

    await page.getByRole("button", { name: /abmelden/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

    // Protected routes should now redirect
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
