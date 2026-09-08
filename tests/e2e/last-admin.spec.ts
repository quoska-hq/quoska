import { test, expect } from "@playwright/test";
import { adminClient, cleanupTestUser, createTestUser, testEmail, TEST_PASSWORD } from "./helpers";

test("last admin cannot demote themselves and retains project access", async ({ page }) => {
  const email = testEmail("last-admin");
  const setup = await createTestUser({ email, password: TEST_PASSWORD, firstName: "Only", lastName: "Admin", companyName: "Admin Guard Test", role: "admin" });
  try {
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /anmelden/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/);
    const { data: employee } = await adminClient.from("employees").select("id").eq("tenant_id", setup.tenantId).single();
    const response = await page.request.patch(`/api/v1/employees/${employee!.id}`, { data: { role: "employee" } });
    expect(response.status()).toBe(409);
    expect((await response.json()).error).toContain("Mindestens ein aktiver Admin");
    const project = await page.request.post("/api/v1/projects", { data: { name: "Still manageable" } });
    expect(project.status()).toBe(201);
  } finally {
    await cleanupTestUser(email);
  }
});
