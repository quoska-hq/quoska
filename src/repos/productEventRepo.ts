import type Database from "better-sqlite3";
import { getSiteAnalyticsDb } from "@/config/server/site-analytics-db";
import type { ActionCount, ProductOverview } from "@/types/product-analytics";

type Sqlite = Database.Database;
export function recordProductAction(row: ActionCount, db: Sqlite = getSiteAnalyticsDb()): void {
  db.prepare(`INSERT INTO product_action_counts(day,action,outcome,tenant_key,count)
    VALUES (@day,@action,@outcome,@tenantKey,@count)
    ON CONFLICT(day,action,outcome,tenant_key) DO UPDATE SET
    count = CASE WHEN excluded.action = 'app_open' THEN 1 ELSE MIN(count + excluded.count, 1000000) END`).run(row);
}
export function getProductActions(db: Sqlite = getSiteAnalyticsDb()): ActionCount[] {
  return db.prepare(`SELECT day,action,outcome,tenant_key AS tenantKey,count
    FROM product_action_counts ORDER BY day DESC`).all() as ActionCount[];
}
export function saveProductSnapshot(summary: ProductOverview, db: Sqlite = getSiteAnalyticsDb()): void {
  // Daily aggregate history contains neither account nor tenant identifiers.
  const data = { at: summary.at, totals: summary.totals, weeks: summary.weeks, cohorts: summary.cohorts };
  db.prepare(`INSERT INTO product_snapshots(day,summary) VALUES (?,?)
    ON CONFLICT(day) DO UPDATE SET summary=excluded.summary`).run(summary.today, JSON.stringify(data));
}
export function getProductHistory(db: Sqlite = getSiteAnalyticsDb()): { day: string; companies: number; usableAccounts: number }[] {
  return db.prepare(`SELECT day, json_extract(summary,'$.totals.companies') AS companies,
    json_extract(summary,'$.totals.usableAccounts') AS usableAccounts FROM product_snapshots ORDER BY day DESC LIMIT 14`).all() as { day: string; companies: number; usableAccounts: number }[];
}
export function getOperations(db: Sqlite = getSiteAnalyticsDb()): { at: string; data: string } | null {
  return db.prepare("SELECT at,data FROM product_operations WHERE id=1").get() as { at: string; data: string } | undefined ?? null;
}
