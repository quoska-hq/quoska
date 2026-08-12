import type Database from "better-sqlite3";
import { getSiteAnalyticsDb } from "@/config/server/site-analytics-db";
import type {
  AnalyticsCount,
  AnalyticsDailyPoint,
  SiteAnalyticsPageview,
  SiteAnalyticsSummary,
} from "@/types/site-analytics";

type Sqlite = Database.Database;

interface TotalRow {
  pageviews: number;
  visitors: number;
  direct: number;
}

interface TodayRow {
  pageviews: number;
  visitors: number;
}

export function recordSitePageview(
  pageview: SiteAnalyticsPageview,
  db: Sqlite = getSiteAnalyticsDb(),
): boolean {
  const result = db.prepare(`
    INSERT OR IGNORE INTO site_pageviews (
      occurred_at, event_key, visitor_hash, path, referrer_host,
      country_code, region_code, device,
      utm_source, utm_medium, utm_campaign
    ) VALUES (
      @occurredAt, @eventKey, @visitorHash, @path, @referrerHost,
      @countryCode, @regionCode, @device,
      @utmSource, @utmMedium, @utmCampaign
    )
  `).run(pageview);
  return result.changes === 1;
}

export function getSiteAnalyticsSummary(
  days: 7 | 30 | 90,
  fromIso: string,
  toIso: string,
  today: string,
  db: Sqlite = getSiteAnalyticsDb(),
): SiteAnalyticsSummary {
  const totals = db.prepare(`
    SELECT
      COUNT(*) AS pageviews,
      COUNT(DISTINCT visitor_hash) AS visitors,
      SUM(CASE WHEN referrer_host IS NULL AND utm_source IS NULL THEN 1 ELSE 0 END) AS direct
    FROM site_pageviews
    WHERE occurred_at >= ? AND occurred_at <= ?
  `).get(fromIso, toIso) as TotalRow;

  const todayTotals = db.prepare(`
    SELECT COUNT(*) AS pageviews, COUNT(DISTINCT visitor_hash) AS visitors
    FROM site_pageviews
    WHERE substr(occurred_at, 1, 10) = ?
  `).get(today) as TodayRow;

  const daily = db.prepare(`
    WITH RECURSIVE calendar(date) AS (
      VALUES(date(?))
      UNION ALL
      SELECT date(date, '+1 day') FROM calendar WHERE date < date(?)
    ), totals AS (
      SELECT
        substr(occurred_at, 1, 10) AS date,
        COUNT(*) AS pageviews,
        COUNT(DISTINCT visitor_hash) AS visitors
      FROM site_pageviews
      WHERE occurred_at >= ? AND occurred_at <= ?
      GROUP BY date
    )
    SELECT
      calendar.date,
      COALESCE(totals.pageviews, 0) AS pageviews,
      COALESCE(totals.visitors, 0) AS visitors
    FROM calendar
    LEFT JOIN totals ON totals.date = calendar.date
    ORDER BY calendar.date ASC
  `).all(fromIso, toIso, fromIso, toIso) as AnalyticsDailyPoint[];

  const pageviews = totals.pageviews ?? 0;
  const visitors = totals.visitors ?? 0;

  return {
    days,
    from: fromIso.slice(0, 10),
    to: toIso.slice(0, 10),
    pageviews,
    visitors,
    viewsPerVisitor: visitors > 0 ? pageviews / visitors : 0,
    directShare: pageviews > 0 ? ((totals.direct ?? 0) / pageviews) * 100 : 0,
    todayPageviews: todayTotals.pageviews ?? 0,
    todayVisitors: todayTotals.visitors ?? 0,
    daily,
    pages: topCounts(db, "path", fromIso, toIso),
    sources: sourceCounts(db, fromIso, toIso),
    regions: regionCounts(db, fromIso, toIso),
    devices: topCounts(db, "device", fromIso, toIso),
    campaigns: topCounts(db, "utm_campaign", fromIso, toIso, true),
  };
}

export function pruneSiteAnalytics(
  cutoffIso: string,
  db: Sqlite = getSiteAnalyticsDb(),
): number {
  return db.prepare("DELETE FROM site_pageviews WHERE occurred_at < ?")
    .run(cutoffIso).changes;
}

function topCounts(
  db: Sqlite,
  column: "path" | "device" | "utm_campaign",
  fromIso: string,
  toIso: string,
  omitEmpty = false,
): AnalyticsCount[] {
  const emptyFilter = omitEmpty ? `AND ${column} IS NOT NULL AND ${column} != ''` : "";
  return db.prepare(`
    SELECT COALESCE(NULLIF(${column}, ''), 'Unbekannt') AS label, COUNT(*) AS count
    FROM site_pageviews
    WHERE occurred_at >= ? AND occurred_at <= ? ${emptyFilter}
    GROUP BY label
    ORDER BY count DESC, label ASC
    LIMIT 8
  `).all(fromIso, toIso) as AnalyticsCount[];
}

function sourceCounts(db: Sqlite, fromIso: string, toIso: string): AnalyticsCount[] {
  return db.prepare(`
    SELECT
      COALESCE(NULLIF(utm_source, ''), NULLIF(referrer_host, ''), 'Direkt') AS label,
      COUNT(*) AS count
    FROM site_pageviews
    WHERE occurred_at >= ? AND occurred_at <= ?
    GROUP BY label
    ORDER BY count DESC, label ASC
    LIMIT 8
  `).all(fromIso, toIso) as AnalyticsCount[];
}

function regionCounts(db: Sqlite, fromIso: string, toIso: string): AnalyticsCount[] {
  return db.prepare(`
    SELECT
      CASE
        WHEN country_code IS NULL THEN 'Unbekannt'
        WHEN region_code IS NULL OR region_code = '' THEN country_code
        ELSE country_code || '-' || region_code
      END AS label,
      COUNT(*) AS count
    FROM site_pageviews
    WHERE occurred_at >= ? AND occurred_at <= ?
    GROUP BY label
    ORDER BY count DESC, label ASC
    LIMIT 8
  `).all(fromIso, toIso) as AnalyticsCount[];
}
