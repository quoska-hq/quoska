import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initializeSiteAnalyticsSchema } from "@/config/server/site-analytics-db";
import {
  getSiteAnalyticsSummary,
  pruneSiteAnalytics,
  recordFreeToolEvent,
  recordSitePageview,
} from "@/repos/siteAnalyticsRepo";
import type { SiteAnalyticsPageview } from "@/types/site-analytics";
import type { FreeToolAnalyticsEvent } from "@/types/free-tools";

describe("site analytics repository", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    initializeSiteAnalyticsSchema(db);
  });

  afterEach(() => db.close());

  it("summarizes visitors, referrers, pages, regions and empty days", () => {
    add({ eventKey: "one", visitorHash: "visitor-a", path: "/", occurredAt: "2026-08-11T10:00:00.000Z" });
    add({ eventKey: "two", visitorHash: "visitor-a", path: "/preise", occurredAt: "2026-08-12T10:00:00.000Z", referrerHost: "google.com" });
    add({ eventKey: "three", visitorHash: "visitor-b", path: "/", occurredAt: "2026-08-12T11:00:00.000Z", utmSource: "linkedin", device: "mobile" });

    const summary = getSiteAnalyticsSummary(
      7,
      "2026-08-06T00:00:00.000Z",
      "2026-08-12T23:59:59.999Z",
      "2026-08-12",
      db,
    );

    expect(summary).toMatchObject({
      pageviews: 3,
      visitors: 2,
      todayPageviews: 2,
      todayVisitors: 2,
      viewsPerVisitor: 1.5,
    });
    expect(summary.daily).toHaveLength(7);
    expect(summary.daily[0]).toEqual({ date: "2026-08-06", pageviews: 0, visitors: 0 });
    expect(summary.pages[0]).toEqual({ label: "/", count: 2 });
    expect(summary.sources.map((row) => row.label)).toEqual(["Direkt", "google.com", "linkedin"]);
    expect(summary.regions[0]).toEqual({ label: "DE-NI", count: 3 });
  });

  it("deduplicates the same visitor, page and minute using its event key", () => {
    expect(add({ eventKey: "same" })).toBe(true);
    expect(add({ eventKey: "same" })).toBe(false);
    const count = db.prepare("SELECT COUNT(*) AS count FROM site_pageviews").get() as { count: number };
    expect(count.count).toBe(1);
  });

  it("deletes events older than the retention cutoff", () => {
    add({ eventKey: "old", occurredAt: "2026-01-01T00:00:00.000Z" });
    add({ eventKey: "recent", occurredAt: "2026-08-01T00:00:00.000Z" });
    addToolEvent({ eventKey: "old-tool", occurredAt: "2026-01-02T00:00:00.000Z" });
    expect(pruneSiteAnalytics("2026-02-01T00:00:00.000Z", db)).toBe(2);
  });

  it("summarizes tool usage and conversion events separately", () => {
    addToolEvent({ eventKey: "view", event: "free_tool_view" });
    addToolEvent({ eventKey: "calculate", event: "free_tool_calculate" });
    addToolEvent({ eventKey: "signup", event: "free_tool_signup_start" });
    const summary = getSiteAnalyticsSummary(
      7,
      "2026-08-06T00:00:00.000Z",
      "2026-08-12T23:59:59.999Z",
      "2026-08-12",
      db,
    );
    expect(summary.toolActivity).toHaveLength(3);
    expect(summary.toolConversions).toEqual([
      { label: "arbeitszeitrechner · free_tool_signup_start", count: 1 },
    ]);
  });

  function add(overrides: Partial<SiteAnalyticsPageview>): boolean {
    return recordSitePageview({
      occurredAt: "2026-08-12T10:00:00.000Z",
      eventKey: "default-key",
      visitorHash: "visitor-a",
      path: "/",
      referrerHost: null,
      countryCode: "DE",
      regionCode: "NI",
      device: "desktop",
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      ...overrides,
    }, db);
  }

  function addToolEvent(overrides: Partial<FreeToolAnalyticsEvent>): boolean {
    return recordFreeToolEvent({
      occurredAt: "2026-08-12T10:00:00.000Z",
      eventKey: "tool-key",
      visitorHash: "visitor-a",
      event: "free_tool_calculate",
      tool: "arbeitszeitrechner",
      format: null,
      placement: null,
      ...overrides,
    }, db);
  }
});
