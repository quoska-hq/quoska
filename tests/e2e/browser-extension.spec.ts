import { createHash, randomBytes } from "node:crypto";
import { test, expect } from "@playwright/test";
import {
  adminClient,
  cleanupTestUser,
  createTestUser,
  testEmail,
  TEST_PASSWORD,
} from "./helpers";

const EXTENSION_ID = "abcdefghijklmnopabcdefghijklmnop";
const REDIRECT_URI = `https://${EXTENSION_ID}.chromiumapp.org/connected`;

function secret(): string {
  return randomBytes(32).toString("base64url");
}

function challenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

test.describe("Browser extension API cycle", () => {
  const email = testEmail("browser-extension");

  test.beforeAll(async () => {
    await createTestUser({
      email,
      password: TEST_PASSWORD,
      firstName: "Berta",
      lastName: "Browser",
      companyName: "Extension E2E GmbH",
      role: "admin",
      bundesland: "berlin",
    });
  });

  test.afterAll(async () => {
    await cleanupTestUser(email);
  });

  test("authorizes, clocks a full cycle, lists and revokes the connection", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/);

    const verifier = secret();
    const state = secret();
    const origin = new URL(page.url()).origin;
    const authorizeResponse = await page.request.post(
      "/api/v1/browser-extension/authorize",
      {
        form: {
          redirect_uri: REDIRECT_URI,
          state,
          code_challenge: challenge(verifier),
        },
        headers: { Origin: origin },
        maxRedirects: 0,
      },
    );
    expect(authorizeResponse.status()).toBe(303);
    const callback = new URL(authorizeResponse.headers().location);
    expect(callback.origin).toBe(`https://${EXTENSION_ID}.chromiumapp.org`);
    expect(callback.searchParams.get("state")).toBe(state);
    const code = callback.searchParams.get("code");
    expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const tokenResponse = await page.request.post(
      "/api/v1/browser-extension/token",
      { data: { code, codeVerifier: verifier, redirectUri: REDIRECT_URI } },
    );
    expect(tokenResponse.status()).toBe(201);
    const tokenPayload = await tokenResponse.json();
    const accessToken = tokenPayload.data?.accessToken as string;
    expect(accessToken).toMatch(/^qbe_[A-Za-z0-9_-]{43}$/);
    const bearer = { Authorization: `Bearer ${accessToken}` };

    const initialStatus = await page.request.get(
      "/api/v1/browser-extension/status",
      { headers: bearer },
    );
    expect(initialStatus.status()).toBe(200);
    const initialStatusPayload = await initialStatus.json();
    expect(initialStatusPayload.data.activeEntry).toBeNull();
    expect(initialStatusPayload.data.todayWorkedSeconds).toBeGreaterThanOrEqual(0);
    expect(initialStatusPayload.data.todayTargetMinutes).toBeGreaterThanOrEqual(0);

    const clockIn = await page.request.post("/api/v1/browser-extension/clock", {
      headers: bearer,
      data: { action: "clock-in", notes: "E2E Browser-Erweiterung" },
    });
    expect(clockIn.status()).toBe(200);
    expect((await clockIn.json()).data.activeEntry.status).toBe("running");

    const pause = await page.request.post("/api/v1/browser-extension/clock", {
      headers: bearer,
      data: { action: "pause" },
    });
    expect(pause.status()).toBe(200);
    const paused = await pause.json();
    expect(paused.data.activeEntry.status).toBe("paused");
    await adminClient
      .from("break_sessions")
      .update({
        break_start: new Date(Date.now() - 16 * 60_000).toISOString(),
      })
      .eq("id", paused.data.activeBreak.id);

    const resume = await page.request.post("/api/v1/browser-extension/clock", {
      headers: bearer,
      data: { action: "resume" },
    });
    expect(resume.status()).toBe(200);
    expect((await resume.json()).data.activeEntry.status).toBe("running");

    const clockOut = await page.request.post("/api/v1/browser-extension/clock", {
      headers: bearer,
      data: { action: "clock-out" },
    });
    expect(clockOut.status()).toBe(200);
    expect((await clockOut.json()).data.activeEntry).toBeNull();

    await page.goto("/app/settings");
    await expect(page.getByText("Quoska Browser-Erweiterung · Berta Browser")).toBeVisible();
    await page.getByRole("button", { name: "Verbindung widerrufen" }).click();
    await expect(page.getByText("Noch keine Browser-Erweiterung verbunden.")).toBeVisible();

    const revokedStatus = await page.request.get(
      "/api/v1/browser-extension/status",
      { headers: bearer },
    );
    expect(revokedStatus.status()).toBe(401);
  });
});
