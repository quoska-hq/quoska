import { NextResponse } from "next/server";
import { getNowIso } from "@/config/server/timestamps";
import { isSiteAnalyticsEnabled } from "@/config/server/site-analytics-access";
import { recordSitePageview } from "@/repos/siteAnalyticsRepo";
import {
  buildSitePageview,
  extractClientIp,
  isLikelyBot,
} from "@/services/siteAnalyticsService";
import type { SiteAnalyticsEventInput } from "@/types/site-analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const response = new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });

  try {
    if (!isSiteAnalyticsEnabled()) return response;
    if ((Number(request.headers.get("content-length")) || 0) > 2_048) return response;
    if (request.headers.get("sec-gpc") === "1") return response;

    const userAgent = request.headers.get("user-agent") ?? "";
    if (isLikelyBot(userAgent)) return response;

    const ip = extractClientIp(request.headers);
    if (!ip) return response;

    const input = await request.json() as SiteAnalyticsEventInput;
    if (!input || typeof input.path !== "string") return response;

    const pageview = buildSitePageview({ input, ip, userAgent, nowIso: getNowIso() });
    if (pageview) recordSitePageview(pageview);
  } catch (error) {
    console.error(
      "Site analytics collection failed:",
      error instanceof Error ? error.message : "unknown error",
    );
  }

  return response;
}
