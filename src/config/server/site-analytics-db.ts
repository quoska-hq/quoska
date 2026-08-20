import Database from "better-sqlite3";
import { chmodSync, mkdirSync } from "node:fs";
import path from "node:path";
import { serverEnv } from "@/config/env";

let analyticsDb: Database.Database | null = null;

export function initializeSiteAnalyticsSchema(db: Database.Database): void {
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_pageviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      occurred_at TEXT NOT NULL,
      event_key TEXT NOT NULL UNIQUE,
      visitor_hash TEXT NOT NULL,
      path TEXT NOT NULL,
      referrer_host TEXT,
      country_code TEXT,
      region_code TEXT,
      device TEXT NOT NULL CHECK (device IN ('desktop', 'tablet', 'mobile')),
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_site_pageviews_occurred_at
      ON site_pageviews (occurred_at);
    CREATE INDEX IF NOT EXISTS idx_site_pageviews_visitor
      ON site_pageviews (visitor_hash, occurred_at);

    CREATE TABLE IF NOT EXISTS free_tool_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      occurred_at TEXT NOT NULL,
      event_key TEXT NOT NULL UNIQUE,
      visitor_hash TEXT NOT NULL,
      event TEXT NOT NULL CHECK (event IN (
        'free_tool_view', 'free_tool_calculate', 'free_tool_export',
        'free_tool_product_click', 'free_tool_signup_start'
      )),
      tool TEXT NOT NULL CHECK (tool IN (
        'arbeitszeitrechner', 'stundenzettel', 'ueberstundenrechner',
        'monatsarbeitszeit-rechner'
      )),
      format TEXT CHECK (format IS NULL OR format IN ('csv', 'pdf', 'print')),
      placement TEXT CHECK (
        placement IS NULL OR placement IN ('result', 'product_bridge', 'footer')
      )
    );

    CREATE INDEX IF NOT EXISTS idx_free_tool_events_occurred_at
      ON free_tool_events (occurred_at);
    CREATE INDEX IF NOT EXISTS idx_free_tool_events_funnel
      ON free_tool_events (tool, event, occurred_at);
  `);
}

export function getSiteAnalyticsDb(): Database.Database {
  if (analyticsDb) return analyticsDb;

  const dbPath = serverEnv.ANALYTICS_DB_PATH ?? "/tmp/quoska-site-analytics.sqlite";
  if (dbPath !== ":memory:") {
    mkdirSync(path.dirname(dbPath), { recursive: true, mode: 0o700 });
  }

  const db = new Database(dbPath);
  if (dbPath !== ":memory:") {
    chmodSync(dbPath, 0o600);
    db.pragma("journal_mode = WAL");
  }
  initializeSiteAnalyticsSchema(db);
  analyticsDb = db;
  return db;
}
