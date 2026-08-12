import { afterEach, describe, expect, it, vi } from "vitest";
import { isSiteAnalyticsAdmin, isSiteAnalyticsEnabled } from "@/config/server/site-analytics-access";
import {
  buildSitePageview,
  extractClientIp,
  isLikelyBot,
  isTrackablePublicPath,
} from "@/services/siteAnalyticsService";

describe("site analytics privacy and normalization", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("only enables the owner dashboard when both secret and whitelist exist", () => {
    vi.stubEnv("ANALYTICS_HASH_SECRET", "a".repeat(32));
    vi.stubEnv("ANALYTICS_ADMIN_EMAILS", "owner@example.com, second@example.com");

    expect(isSiteAnalyticsEnabled()).toBe(true);
    expect(isSiteAnalyticsAdmin("OWNER@example.com")).toBe(true);
    expect(isSiteAnalyticsAdmin("customer@example.com")).toBe(false);
  });

  it("excludes product, authentication, API and asset routes", () => {
    expect(isTrackablePublicPath("/")).toBe(true);
    expect(isTrackablePublicPath("/funktionen")).toBe(true);
    expect(isTrackablePublicPath("/app/clock")).toBe(false);
    expect(isTrackablePublicPath("/api/health")).toBe(false);
    expect(isTrackablePublicPath("/login")).toBe(false);
    expect(isTrackablePublicPath("/product/mobile-clock.png")).toBe(false);
  });

  it("creates a pseudonymous, deduplicated pageview without retaining the IP", () => {
    vi.stubEnv("ANALYTICS_HASH_SECRET", "b".repeat(32));
    const pageview = buildSitePageview({
      input: {
        path: "/preise/?ignored=yes",
        referrer: "https://www.google.com/search?q=zeiterfassung",
        utmSource: "newsletter",
        utmCampaign: "August Start",
      },
      ip: "8.8.8.8",
      userAgent: "Mozilla/5.0 (iPhone; Mobile)",
      nowIso: "2026-08-12T20:15:42.000Z",
    });

    expect(pageview).toMatchObject({
      path: "/preise",
      referrerHost: "google.com",
      countryCode: "US",
      device: "mobile",
      utmSource: "newsletter",
      utmCampaign: "August Start",
    });
    expect(pageview?.visitorHash).toHaveLength(32);
    expect(JSON.stringify(pageview)).not.toContain("8.8.8.8");
  });

  it("uses the proxy-appended client address and filters obvious bots", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.8, 203.0.113.7",
    });
    expect(extractClientIp(headers)).toBe("203.0.113.7");
    expect(isLikelyBot("Googlebot/2.1")).toBe(true);
    expect(isLikelyBot("Mozilla/5.0 Firefox/142")).toBe(false);
  });
});
