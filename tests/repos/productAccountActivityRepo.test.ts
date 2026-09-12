import Database from "better-sqlite3";
import { afterEach, expect, it } from "vitest";
import { initializeSiteAnalyticsSchema } from "@/config/server/site-analytics-db";
import { recordAccountActivity, getAccountActivity } from "@/repos/productAccountActivityRepo";
import { pruneSiteAnalytics } from "@/repos/siteAnalyticsRepo";

const databases: Database.Database[] = [];
const database = () => { const db = new Database(":memory:"); databases.push(db); initializeSiteAnalyticsSchema(db); return db; };
afterEach(() => { for (const db of databases.splice(0)) db.close(); });
const identity = { tenantKey: "company-hash", employeeKey: "actor-hash" };

it("keeps each account's latest activity and successful action without an event history", () => {
  const db = database();
  recordAccountActivity({ ...identity, at: "2026-09-12T09:00:00.000Z", action: "clock_in" }, db);
  recordAccountActivity({ ...identity, at: "2026-09-12T11:00:00.000Z" }, db);
  recordAccountActivity({ ...identity, at: "2026-09-12T10:00:00.000Z", action: "clock_pause" }, db);
  recordAccountActivity({ ...identity, at: "2026-09-12T08:00:00.000Z", action: "clock_out" }, db);
  expect(getAccountActivity(db)).toEqual([{ ...identity, lastActiveAt: "2026-09-12T11:00:00.000Z", lastActionAt: "2026-09-12T10:00:00.000Z", lastAction: "clock_pause" }]);
  recordAccountActivity({ ...identity, employeeKey: "other-actor", at: "2026-09-12T12:00:00.000Z" }, db);
  recordAccountActivity({ ...identity, tenantKey: "other-company", at: "2026-09-12T12:00:00.000Z" }, db);
  expect(getAccountActivity(db)).toHaveLength(3);
});

it("expires inactive accounts and expired actions on accounts still being used", () => {
  const db = database();
  recordAccountActivity({ ...identity, at: "2026-01-01T09:00:00.000Z", action: "clock_in" }, db);
  recordAccountActivity({ ...identity, at: "2026-09-12T10:00:00.000Z" }, db);
  recordAccountActivity({ ...identity, employeeKey: "old-actor", at: "2026-01-01T09:00:00.000Z" }, db);
  expect(pruneSiteAnalytics("2026-03-01T00:00:00.000Z", db)).toBe(1);
  expect(getAccountActivity(db)).toEqual([{ ...identity, lastActiveAt: "2026-09-12T10:00:00.000Z", lastActionAt: null, lastAction: null }]);
  initializeSiteAnalyticsSchema(db);
  expect(getAccountActivity(db)).toHaveLength(1);
});
