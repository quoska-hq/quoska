import { test, expect } from "@playwright/test";
import {
  adminClient,
  createTestUser,
  testEmail,
  TEST_PASSWORD,
} from "./helpers";
import { planningFixture } from "../fixtures/planning";
import { formatDateFullDE } from "../../src/config/client/date-utils";
import { planningAddDays } from "../../src/config/client/planning-calendar";

test.describe("Integrated planning", () => {
  test("manager configures, computes, publishes and an employee sees only published own duties", async ({
    page,
    browser,
  }) => {
    test.setTimeout(120000);
    const email = testEmail("planning"),
      employeeEmail = testEmail("planning-staff");
    const { tenantId, userId } = await createTestUser({
      email,
      password: TEST_PASSWORD,
      firstName: "Plan",
      lastName: "Fixture",
      companyName: "Plan fixture",
      bundesland: "berlin",
    });
    const staffAuth = await adminClient.auth.admin.createUser({
      email: employeeEmail,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    const staffUserId = staffAuth.data.user!.id;
    const staff = await adminClient
      .from("employees")
      .insert({
        tenant_id: tenantId,
        user_id: staffUserId,
        first_name: "Staff",
        last_name: "Fixture",
        email: employeeEmail,
        role: "employee",
        bundesland: "berlin",
      })
      .select("id")
      .single();
    await adminClient.rpc("set_employee_claims", { user_uuid: staffUserId });
    const manager = await adminClient
      .from("employees")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("email", email)
      .single();
    const staffId = staff.data!.id as string,
      managerId = manager.data!.id as string;
    const config = planningFixture().state.config;
    config.templates[0].days = [1, 2, 3, 4, 5];
    config.demands[0].days = [1, 2, 3, 4, 5];
    config.profiles = [managerId, staffId].map((employeeId) => ({
      ...config.profiles[0],
      employeeId,
    }));
    await page.goto("/login");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByLabel("Passwort", { exact: true }).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Anmelden", exact: true }).click();
    await page.waitForURL(/\/app\//);
    try {
      await page.goto("/app/planning");
      await expect(
        page.getByRole("heading", { name: "Dienstplanung", exact: true }),
      ).toBeVisible();
      let snapshot = (await (await page.request.get("/api/v1/planning")).json())
        .data;
      expect(
        (
          await page.request.post("/api/v1/planning", {
            data: { action: "configure", version: snapshot.version, config },
          })
        ).ok(),
      ).toBe(true);
      snapshot = (await (await page.request.get("/api/v1/planning")).json())
        .data;
      const month =
        planningAddDays(snapshot.context.today, 1).slice(0, 7) + "-01";
      const generate = await page.request.post("/api/v1/planning", {
        data: { action: "generate", version: snapshot.version, month },
      });
      expect(generate.ok()).toBe(true);
      snapshot = (await (await page.request.get("/api/v1/planning")).json())
        .data;
      expect(
        (
          await page.request.post("/api/v1/planning", {
            data: {
              action: "publish",
              version: snapshot.version,
              month,
              status: "announced",
            },
          })
        ).status(),
      ).toBe(400);
      const job = await page.request.post("/api/v1/planning", {
        data: { action: "optimize", version: snapshot.version, month },
      });
      expect(job.ok()).toBe(true);
      const jobId = (await job.json()).data.jobId;
      await expect
        .poll(
          async () => {
            snapshot = (
              await (await page.request.get("/api/v1/planning")).json()
            ).data;
            return snapshot.jobs.find((j: { id: string }) => j.id === jobId)
              ?.status;
          },
          { timeout: 80000, intervals: [1000] },
        )
        .toBe("completed");
      expect(
        (
          await page.request.post("/api/v1/planning", {
            data: { action: "apply", version: snapshot.version, jobId },
          })
        ).ok(),
      ).toBe(true);
      snapshot = (await (await page.request.get("/api/v1/planning")).json())
        .data;
      expect(
        (
          await page.request.post("/api/v1/planning", {
            data: {
              action: "publish",
              version: snapshot.version,
              month,
              status: "announced",
            },
          })
        ).ok(),
      ).toBe(true);
      await page.reload();
      await page
        .getByRole("button", { name: formatDateFullDE(month), exact: true })
        .click();
      await expect(
        page.getByText("Angekündigt", { exact: false }).first(),
      ).toBeVisible();
      const screenshot = test.info().outputPath("planning-manager.png");
      await page.screenshot({
        path: screenshot,
        fullPage: true,
      });
      await test
        .info()
        .attach("Dienstplanung", {
          path: screenshot,
          contentType: "image/png",
        });
      const staffContext = await browser.newContext({
        baseURL: new URL(page.url()).origin,
        timezoneId: "Europe/Berlin",
      });
      const staffPage = await staffContext.newPage();
      try {
        await staffPage.goto("/login");
        await staffPage.getByLabel("E-Mail").fill(employeeEmail);
        await staffPage
          .getByLabel("Passwort", { exact: true })
          .fill(TEST_PASSWORD);
        await staffPage
          .getByRole("button", { name: "Anmelden", exact: true })
          .click();
        await staffPage.waitForURL(/\/app\//);
        await staffPage.goto("/app/my-shifts");
        await expect(
          staffPage.getByRole("heading", {
            name: "Meine Dienste",
            exact: true,
          }),
        ).toBeVisible();
        const personal = (
          await (await staffPage.request.get("/api/v1/planning/mine")).json()
        ).data;
        const duties = personal.periods.flatMap(
          (p: { shifts: { employeeId: string }[] }) => p.shifts,
        );
        expect(duties.length).toBeGreaterThan(0);
        expect(
          duties.every((s: { employeeId: string }) => s.employeeId === staffId),
        ).toBe(true);
        expect((await staffPage.request.get("/api/v1/planning")).status()).toBe(
          403,
        );
        expect(
          (
            await staffPage.request.post("/api/v1/planning/mine", {
              data: { preferredDays: [1, 3] },
            })
          ).ok(),
        ).toBe(true);
      } finally {
        await staffContext.close();
      }
    } finally {
      await adminClient
        .from("employees")
        .update({ deleted_at: "2050-01-01T00:00:00Z" })
        .eq("tenant_id", tenantId);
      await adminClient
        .from("planning_workspaces")
        .update({ deleted_at: "2050-01-01T00:00:00Z" })
        .eq("tenant_id", tenantId);
      await adminClient.auth.admin.deleteUser(staffUserId);
      await adminClient.auth.admin.deleteUser(userId);
    }
  });
});
