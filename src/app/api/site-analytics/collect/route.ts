import { NextResponse } from "next/server";
import { getNowIso } from "@/config/server/timestamps";
import { isSiteAnalyticsEnabled } from "@/config/server/site-analytics-access";
import { recordFreeToolEvent, recordSitePageview } from "@/repos/siteAnalyticsRepo";
import {
  buildFreeToolEvent,
  buildSitePageview,
  extractClientIp,
  isLikelyBot,
} from "@/services/siteAnalyticsService";
import type { SiteAnalyticsEventInput } from "@/types/site-analytics";
import type { FreeToolEventInput } from "@/types/free-tools";

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

    const input = await request.json() as Partial<SiteAnalyticsEventInput & FreeToolEventInput>;
    const nowIso = getNowIso();
    if (typeof input.path === "string") {
      const pageview = buildSitePageview({
        input: input as SiteAnalyticsEventInput,
        ip,
        userAgent,
        nowIso,
      });
      if (pageview) recordSitePageview(pageview);
    } else if (typeof input.event === "string" && typeof input.tool === "string") {
      const toolEvent = buildFreeToolEvent({
        input: input as FreeToolEventInput,
        ip,
        userAgent,
        nowIso,
      });
      if (toolEvent) recordFreeToolEvent(toolEvent);
    }
  } catch (error) {
    console.error(
      "Site analytics collection failed:",
      error instanceof Error ? error.message : "unknown error",
    );
  }

  return response;
}
