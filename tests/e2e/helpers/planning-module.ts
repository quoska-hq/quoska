import { expect, type Page } from "@playwright/test";
import {
  adminClient,
  createTestUser,
  testEmail,
  TEST_PASSWORD,
} from "../../../scripts/e2e-helpers";

export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await page.waitForURL(/\/app\//);
}
export async function createOwner() {
  const email = testEmail("planning-module");
  return {
    email,
    ...(await createTestUser({
      email,
      password: TEST_PASSWORD,
      firstName: "Module",
      lastName: "Fixture",
      companyName: "Module fixture",
      bundesland: "berlin",
    })),
  };
}
export async function cleanup(tenantId: string, userId: string) {
  await adminClient
    .from("employees")
    .update({ deleted_at: "2050-01-01T00:00:00Z" })
    .eq("tenant_id", tenantId);
  await adminClient
    .from("planning_workspaces")
    .update({ deleted_at: "2050-01-01T00:00:00Z" })
    .eq("tenant_id", tenantId);
  await adminClient.auth.admin.deleteUser(userId);
}

export async function updateEmployeeDuringSetup(page: Page, userId: string) {
  const changed = await adminClient
    .from("employees")
    .update({ last_name: "Changed" })
    .eq("user_id", userId);
  expect(changed.error).toBeNull();
  await page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/v1/planning" &&
      response.request().method() === "GET",
    { timeout: 20000 },
  );
}
