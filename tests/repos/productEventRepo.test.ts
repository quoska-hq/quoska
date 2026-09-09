import Database from "better-sqlite3";
import { expect, it } from "vitest";
import { initializeSiteAnalyticsSchema } from "@/config/server/site-analytics-db";
import { recordProductAction, getProductActions } from "@/repos/productEventRepo";
import { pruneSiteAnalytics } from "@/repos/siteAnalyticsRepo";
it("deduplicates company presence, counts failures and expires old diagnostics", () => {
  const db = new Database(":memory:");
  initializeSiteAnalyticsSchema(db);
  const presence = { day: "2026-09-09", action: "app_open", outcome: "ok", tenantKey: "hash", count: 1 };
  recordProductAction(presence, db); recordProductAction(presence, db);
  const error = { ...presence, day: "2026-01-01", action: "clock_in", outcome: "error" };
  recordProductAction(error, db); recordProductAction(error, db);
  expect(getProductActions(db).map(r => r.count)).toEqual([1,2]);
  pruneSiteAnalytics("2026-03-01T00:00:00Z", db);
  expect(getProductActions(db)).toEqual([presence]);
  db.close();
});
