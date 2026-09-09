import { NextResponse } from "next/server";
import { z } from "zod";
import { createHmac } from "node:crypto";
import { serverEnv } from "@/config/env";
import { isSiteAnalyticsEnabled } from "@/config/server/site-analytics-access";
import { getNowIso } from "@/config/server/timestamps";
import { productDay } from "@/config/server/product-analytics-time";
import { recordProductAction } from "@/repos/productEventRepo";
import { extractClientIp, isLikelyBot } from "@/services/siteAnalyticsService";

const schema = z.object({ action: z.enum(["login", "signup"]), outcome: z.enum(["ok", "rejected", "network"]) }).strict();
const limits = new Map<string, number>();
let minute = "";
export async function POST(request: Request) {
  const empty = () => new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  if (!isSiteAnalyticsEnabled() || request.headers.get("sec-gpc") === "1" || request.headers.get("dnt") === "1") return empty();
  if (request.headers.get("sec-fetch-site") === "cross-site") return empty();
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(serverEnv.NEXT_PUBLIC_APP_URL).origin) return empty();
  const ua = request.headers.get("user-agent") ?? "";
  const ip = extractClientIp(request.headers);
  if (!ip || isLikelyBot(ua)) return empty();
  const now = getNowIso();
  if (minute !== now.slice(0,16)) { limits.clear(); minute = now.slice(0,16); }
  const key = createHmac("sha256", serverEnv.ANALYTICS_HASH_SECRET!).update(ip).digest("hex");
  if (limits.size >= 1000 || (limits.get(key) ?? 0) >= 10) return empty();
  limits.set(key, (limits.get(key) ?? 0) + 1);
  try {
    const reader = request.body?.getReader();
    if (!reader) return empty();
    let size = 0, text = "";
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 256) { await reader.cancel(); return empty(); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    const parsed = schema.safeParse(JSON.parse(text));
    if (parsed.success) recordProductAction({ day: productDay(now), action: "browser_" + parsed.data.action,
      outcome: parsed.data.outcome, tenantKey: "", count: 1 });
  } catch { /* Optional, unverified diagnostic signal. */ }
  return empty();
}
