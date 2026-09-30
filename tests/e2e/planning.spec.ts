import { test, expect } from "@playwright/test";
import {
  adminClient,
  createTestUser,
  testEmail,
  TEST_PASSWORD,
} from "./helpers";
import { planningFixture } from "../fixtures/planning";
import { formatDateFullDE } from "../../src/config/client/date-utils";
import { planningAddMonths } from "../../src/config/client/planning-calendar";
import type { PlanningSwapData } from "../../src/types/planning-client";

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
      const month = planningAddMonths(
        snapshot.context.today.slice(0, 7) + "-01",
        1,
      );
      config.firstMonth = month;
      expect(
        (
          await page.request.post("/api/v1/planning", {
            data: { action: "configure", version: snapshot.version, config },
          })
        ).ok(),
      ).toBe(true);
      snapshot = (await (await page.request.get("/api/v1/planning")).json())
        .data;
      const generate = await page.request.post("/api/v1/planning", {
        data: { action: "initialize", version: snapshot.version },
      });
      expect(generate.ok()).toBe(true);
      snapshot = (await (await page.request.get("/api/v1/planning")).json())
        .data;
      expect(snapshot.state.periods).toHaveLength(3);
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
      for (const nextMonth of [
        planningAddMonths(month, 1),
        planningAddMonths(month, 2),
        month,
      ]) {
        snapshot = (await (await page.request.get("/api/v1/planning")).json())
          .data;
        expect(
          (
            await page.request.post("/api/v1/planning", {
              data: {
                action: "publish",
                version: snapshot.version,
                month: nextMonth,
                status: nextMonth === month ? "fixed" : "announced",
              },
            })
          ).ok(),
        ).toBe(true);
      }
      await page.reload();
      await page
        .getByRole("button", { name: formatDateFullDE(month), exact: true })
        .click();
      await expect(
        page.getByText("Verbindlich", { exact: false }).first(),
      ).toBeVisible();
      await page.getByRole("button", { name: "Nächste Woche", exact: true }).click();
      await expect(page.getByRole("button", { name: /06:00–12:00/ }).first()).toBeVisible();
      const screenshot = test.info().outputPath("planning-manager.png");
      await page.screenshot({
        path: screenshot,
        fullPage: true,
      });
      await test.info().attach("Dienstplanung", {
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
        const swapData = (
          await (await staffPage.request.get("/api/v1/planning/swaps")).json()
        ).data as PlanningSwapData;
        const source = swapData.options.find((s) => s.employeeId === staffId)!;
        const target = swapData.options.find(
          (s) => s.employeeId === managerId && s.date !== source.date,
        )!;
        expect(source).toBeTruthy();
        expect(target).toBeTruthy();
        const requested = await staffPage.request.post(
          "/api/v1/planning/swaps",
          { data: { action: "request", source: source.id, target: target.id } },
        );
        expect(requested.status()).toBe(201);
        const swapId = (await requested.json()).data.id;
        expect(
          (
            await staffPage.request.post("/api/v1/planning/swaps", {
              data: { action: "approve", id: swapId },
            })
          ).status(),
        ).toBe(403);
        expect(
          (
            await page.request.post("/api/v1/planning/swaps", {
              data: { action: "accept", id: swapId },
            })
          ).ok(),
        ).toBe(true);
        expect(
          (
            await page.request.post("/api/v1/planning/swaps", {
              data: { action: "approve", id: swapId },
            })
          ).ok(),
        ).toBe(true);
        const swapped = (
          await (await staffPage.request.get("/api/v1/planning/mine")).json()
        ).data;
        const ownIds = swapped.periods.flatMap(
          (p: { shifts: { id: string }[] }) => p.shifts.map((s) => s.id),
        );
        expect(ownIds).toContain(target.id);
        expect(ownIds).not.toContain(source.id);
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
