import type Database from "better-sqlite3";
import { getSiteAnalyticsDb } from "@/config/server/site-analytics-db";
import type { AccountActivity, ProductAction } from "@/types/product-analytics";

// Only the latest server timestamps and an action category, never interaction
// contents, URLs, IPs, names or a per-person event history.
export function recordAccountActivity(
  row: { tenantKey: string; employeeKey: string; at: string; action?: ProductAction },
  db: Database.Database = getSiteAnalyticsDb(),
): void {
  db.prepare(`INSERT INTO product_account_activity
    (tenant_key, employee_key, last_active_at, last_action_at, last_action)
    VALUES (@tenantKey, @employeeKey, @at, @actionAt, @action)
    ON CONFLICT (tenant_key, employee_key) DO UPDATE SET
      last_active_at = MAX(last_active_at, excluded.last_active_at),
      last_action = CASE WHEN excluded.last_action_at IS NOT NULL
        AND (last_action_at IS NULL OR excluded.last_action_at >= last_action_at)
        THEN excluded.last_action ELSE last_action END,
      last_action_at = CASE WHEN excluded.last_action_at IS NOT NULL
        AND (last_action_at IS NULL OR excluded.last_action_at >= last_action_at)
        THEN excluded.last_action_at ELSE last_action_at END
  `).run({ ...row, actionAt: row.action ? row.at : null, action: row.action ?? null });
}

export function getAccountActivity(db: Database.Database = getSiteAnalyticsDb()): AccountActivity[] {
  return db.prepare(`SELECT tenant_key AS tenantKey, employee_key AS employeeKey,
    last_active_at AS lastActiveAt, last_action_at AS lastActionAt, last_action AS lastAction
    FROM product_account_activity`).all() as AccountActivity[];
}
