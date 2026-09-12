import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { adminClient, TEST_PASSWORD } from "./helpers";
import { setupProjectAssignmentEnv, teardownProjectAssignmentEnv, loginAs, type ProjectAssignmentEnv } from "./project-assignment-fixtures";

const invitation = (page: Page) => page.getByTestId("feedback-invitation");

test.describe("Feedback and one-time invitation", () => {
  let env: ProjectAssignmentEnv;
  let userIds: string[];
  let adminUserId: string;

  test.beforeAll(async () => {
    env = await setupProjectAssignmentEnv("feedback");
    const { data } = await adminClient.from("employees").select("email,user_id").eq("tenant_id", env.tenantId);
    userIds = data!.map((employee) => employee.user_id);
    adminUserId = data!.find((employee) => employee.email === env.adminEmail)!.user_id;
  });
  test.beforeEach(async () => {
    await adminClient.from("feedback_messages").delete().eq("tenant_id", env.tenantId);
    await adminClient.from("feedback_prompt_state").delete().in("user_id", userIds);
  });
  test.afterAll(async () => { await teardownProjectAssignmentEnv(env); });

  async function makeEligible(userId = adminUserId) {
    const yesterday = new Date(Date.now() - 86_400_000).toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
    const { error } = await adminClient.from("feedback_prompt_state").upsert({ user_id: userId, active_days: 2, last_active_date: yesterday, handled_at: null });
    if (error) throw error;
  }
  async function visitRecorded() {
    await expect.poll(async () => {
      const { data } = await adminClient.from("feedback_prompt_state").select("active_days").eq("user_id", adminUserId).maybeSingle();
      return data?.active_days;
    }).toBe(3);
  }

  test("provides permanent feedback for employees on desktop, mobile and in settings", async ({ page }, testInfo) => {
    await loginAs(page, env.employeeEmail);
    await page.locator("aside").getByRole("link", { name: "Hilfe & Feedback" }).click();
    await expect(page.getByRole("heading", { name: "Hilfe & Feedback" })).toBeVisible();
    await expect(page.getByTestId("feedback-inbox")).toHaveCount(0);
    await page.getByRole("radio", { name: "Funktionswunsch" }).check();
    await page.getByLabel("Deine Nachricht").fill("Ich wünsche mir eine Monatsansicht für meine Projekte.");
    await page.getByRole("button", { name: "Nachricht senden" }).click();
    await expect(page.getByText("Danke für deine Rückmeldung!")).toBeVisible();
    const { data } = await adminClient.from("feedback_messages").select("sender_email,category,message").eq("tenant_id", env.tenantId).single();
    expect(data).toMatchObject({ sender_email: env.employeeEmail, category: "feature", message: "Ich wünsche mir eine Monatsansicht für meine Projekte." });
    const exported = await page.request.get("/api/v1/my-data/export");
    expect(exported.status()).toBe(200);
    expect(await exported.text()).toContain(data!.message);
    await page.setViewportSize({ width: 375, height: 900 });
    await page.getByRole("button", { name: "Mehr Navigation öffnen" }).click();
    await page.getByTestId("mobile-more-menu").getByRole("link", { name: "Hilfe & Feedback" }).click();
    await expect(page.getByTestId("mobile-more-menu")).toBeHidden();
    await page.reload();
    await expect(page.getByTestId("feedback-form")).toBeVisible();
    await page.getByRole("radio", { name: "Fehler melden" }).check();
    await page.getByLabel("Deine Nachricht").fill("Beim Wechsel zum Bericht fehlen mir die Filter.");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("feedback-mobile.png"), fullPage: true });
    await page.goto("/app/settings");
    await page.getByRole("link", { name: "Nachricht schreiben" }).click();
    await expect(page).toHaveURL(/\/app\/help$/);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: testInfo.outputPath("feedback-desktop.png"), fullPage: true });
  });

  test("keeps the text on failed submit and uses the same request ID on retry", async ({ page }) => {
    await loginAs(page, env.adminEmail);
    await page.goto("/app/help");
    const ids: string[] = [];
    await page.route("**/api/v1/feedback", async (route) => {
      ids.push(route.request().postDataJSON().id);
      if (ids.length === 1) await route.fulfill({ status: 503, json: { data: null, error: "Bitte erneut versuchen." } });
      else await route.continue();
    });
    await page.getByLabel("Deine Nachricht").fill("Eine Rückmeldung, die beim ersten Versuch erhalten bleiben muss.");
    await page.getByRole("button", { name: "Nachricht senden" }).click();
    await expect(page.getByTestId("feedback-form").getByRole("alert")).toContainText("Bitte erneut versuchen");
    await expect(page.getByLabel("Deine Nachricht")).toHaveValue("Eine Rückmeldung, die beim ersten Versuch erhalten bleiben muss.");
    await page.getByRole("button", { name: "Nachricht senden" }).click();
    await expect(page.getByText("Danke für deine Rückmeldung!")).toBeVisible();
    expect(ids[0]).toBe(ids[1]);
  });

  test("counts distinct days and allows only one claim across tabs or devices", async ({ page, browser }) => {
    await makeEligible();
    await loginAs(page, env.adminEmail);
    await visitRecorded();
    const visits = await Promise.all(Array.from({ length: 3 }, () => page.request.post("/api/v1/feedback/prompt", { data: { action: "visit" } })));
    for (const response of visits) expect((await response.json()).data.eligible).toBe(true);
    const context = await browser.newContext({ storageState: await page.context().storageState() });
    try {
      const [a, b] = await Promise.all([
        page.request.post("/api/v1/feedback/prompt", { data: { action: "claim" } }),
        context.request.post(`${test.info().project.use.baseURL}/api/v1/feedback/prompt`, { data: { action: "claim" } }),
      ]);
      expect([(await a.json()).data.claimed, (await b.json()).data.claimed].filter(Boolean)).toHaveLength(1);
      const next = await context.request.post(`${test.info().project.use.baseURL}/api/v1/feedback/prompt`, { data: { action: "visit" } });
      expect((await next.json()).data.eligible).toBe(false);
    } finally { await context.close(); }
    await visitRecorded();
  });

  test("shows the invitation once, delays it during editing and never reopens it after closing", async ({ page }, testInfo) => {
    await makeEligible();
    await page.clock.install();
    await loginAs(page, env.adminEmail);
    await visitRecorded();
    // An existing employee dialog must not be covered by the invitation.
    await page.getByRole("button", { name: "Lukas Mitarbeiter öffnen" }).click();
    await page.clock.fastForward(31_000);
    await expect(invitation(page)).toBeHidden();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.clock.fastForward(16_000);
    await expect(invitation(page)).toBeVisible();
    await invitation(page).screenshot({ path: testInfo.outputPath("feedback-invitation.png") });
    await page.getByRole("button", { name: "Feedback-Hinweis schließen" }).click();
    await page.reload();
    await page.clock.fastForward(60_000);
    await expect(invitation(page)).toBeHidden();
    const response = await page.request.post("/api/v1/feedback/prompt", { data: { action: "claim" } });
    expect((await response.json()).data.claimed).toBe(false);
  });

  test("deduplicates submissions, enforces the rate limit and rejects forged identity", async ({ page }) => {
    await loginAs(page, env.adminEmail);
    const message = { id: randomUUID(), category: "feedback", message: "Eine hilfreiche Rückmeldung für das Team.", page: "/app/help" };
    const [a, b] = await Promise.all([page.request.post("/api/v1/feedback", { data: message }), page.request.post("/api/v1/feedback", { data: message })]);
    expect(a.status()).toBe(200); expect(b.status()).toBe(200);
    const conflict = await page.request.post("/api/v1/feedback", { data: { ...message, message: "Ein veränderter Inhalt mit derselben ID." } });
    expect(conflict.status()).toBe(409);
    const forged = await page.request.post("/api/v1/feedback", { data: { ...message, sender_email: "victim@example.test", employee_id: env.employeeEmpId } });
    expect(forged.status()).toBe(400);
    const responses = await Promise.all(Array.from({ length: 6 }, () => page.request.post("/api/v1/feedback", { data: { ...message, id: randomUUID() } })));
    expect(responses.filter((response) => response.status() === 200)).toHaveLength(4);
    expect(responses.filter((response) => response.status() === 429)).toHaveLength(2);
    const { count } = await adminClient.from("feedback_messages").select("id", { head: true, count: "exact" }).eq("tenant_id", env.tenantId);
    expect(count).toBe(5);
    expect((await page.request.post("/api/v1/feedback", { data: { ...message, id: randomUUID(), page: "/app/help?token=secret" } })).status()).toBe(400);
  });

  test("protects personal feedback from other employees and company admins", async ({ page }) => {
    await loginAs(page, env.employeeEmail);
    const id = randomUUID();
    const response = await page.request.post("/api/v1/feedback", { data: { id, category: "bug", message: "Private Rückmeldung an das Quoska-Team.", page: "/app/clock" } });
    expect(response.status()).toBe(200);
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    await client.auth.signInWithPassword({ email: env.adminEmail, password: TEST_PASSWORD });
    const read = await client.from("feedback_messages").select("message").eq("id", id);
    expect(read.error).toBeNull(); expect(read.data).toEqual([]);
    const insert = await client.from("feedback_messages").insert({ id: randomUUID() });
    expect(insert.error?.code).toBe("42501");
    const prompt = await client.from("feedback_prompt_state").update({ handled_at: null }).in("user_id", userIds);
    expect(prompt.error?.code).toBe("42501");
    await client.auth.signOut();
    const unauthorized = await client.rpc("feedback_prompt", { p_action: "visit" });
    expect(unauthorized.error).not.toBeNull();
  });

  test("delivers a real notification to the local mail catcher", async ({ page }) => {
    test.skip(!process.env.FEEDBACK_SMTP_HOST, "SMTP integration requires an explicitly configured local catcher.");
    await loginAs(page, env.adminEmail);
    const id = randomUUID();
    await page.request.post("/api/v1/feedback", { data: { id, category: "feature", message: `Lokaler Mailtest ${id}`, page: "/app/help" } });
    await expect.poll(async () => {
      const { data } = await adminClient.from("feedback_messages").select("delivery_status").eq("id", id).single();
      return data?.delivery_status;
    }).toBe("sent");
    const response = await fetch(`http://127.0.0.1:54324/api/v1/search?query=${encodeURIComponent(id)}`);
    const result = await response.json();
    expect(result.messages).toHaveLength(1);
    const mail = await (await fetch(`http://127.0.0.1:54324/api/v1/message/${result.messages[0].ID}`)).json();
    expect(mail.Text).toContain(`Lokaler Mailtest ${id}`);
    expect(mail.ReplyTo[0].Address).toBe(env.adminEmail);
  });
});
