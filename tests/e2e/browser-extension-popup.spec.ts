import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

for (const seconds of [30, 901]) {
  test(`extension popup resumes a ${seconds}-second pause with the appropriate confirmation`, async ({ page }) => {
    await page.route("**/extension-preview/**", async (route) => {
      const filename = new URL(route.request().url()).pathname.split("/").pop()!;
      if (["config.js", "api.js"].includes(filename)) return route.fulfill({ contentType: "text/javascript", body: "" });
      if (!["popup.html", "popup.css", "popup.js"].includes(filename)) return route.fulfill({ status: 404 });
      await route.fulfill({ contentType: filename.endsWith("html") ? "text/html" : filename.endsWith("css") ? "text/css" : "text/javascript", body: readFileSync(`browser-extension/src/${filename}`) });
    });
    await page.addInitScript(({ seconds }) => {
      const now = new Date();
      const status = {
        serverNow: now.toISOString(), employeeName: "Lokaler Test", projects: [],
        todayWorkedSeconds: 3600, todayTargetMinutes: 480,
        activeEntry: { status: "paused", clockIn: new Date(now.getTime() - 3600000).toISOString(), breakMinutes: 0 },
        activeBreak: { breakStart: new Date(now.getTime() - seconds * 1000).toISOString() },
      };
      Object.assign(window, {
        chrome: { runtime: { sendMessage: async () => ({ ok: true }) } },
        QuoskaApi: {
          appUrl: location.origin, getStoredToken: async () => "local-test", getStatus: async () => status,
          performAction: async () => { status.activeEntry.status = "running"; return { ...status, activeBreak: null }; },
        },
      });
    }, { seconds });
    await page.goto("/extension-preview/popup.html");
    await page.getByRole("button", { name: "Pause beenden", exact: true }).click();
    const dialog = page.getByRole("dialog");
    if (seconds < 900) {
      await expect(dialog).toContainText("zählt nicht zur gesetzlichen Mindestpause");
      await dialog.getByRole("button", { name: "Weiter pausieren" }).click();
      await expect(page.getByText("Pause läuft", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Pause beenden", exact: true }).click();
      await dialog.getByRole("button", { name: "Pause beenden", exact: true }).click();
    }
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Ausstempeln" })).toBeEnabled();
  });
}
