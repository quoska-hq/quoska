import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { isSiteAnalyticsEnabled } from "@/config/server/site-analytics-access";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { productDay } from "@/config/server/product-analytics-time";
import { productTenantKey } from "@/config/server/product-analytics-key";
import { getNowIso } from "@/config/server/timestamps";
import { recordProductAction } from "@/repos/productEventRepo";

export async function POST(request: Request) {
  if (!isSiteAnalyticsEnabled()) return new NextResponse(null, { status: 204 });
  if (request.headers.get("sec-fetch-site") === "cross-site") return new NextResponse(null, { status: 403 });
  const auth = await getEmployeeFromAuth(await createClient());
  if (!auth.data) return new NextResponse(null, { status: 401 });
  try {
    // No body or client-supplied identity; at most one presence record per company/day.
    recordProductAction({ day: productDay(getNowIso()), action: "app_open", outcome: "ok",
      tenantKey: productTenantKey(auth.data.tenantId), count: 1 });
  } catch { console.warn("product_presence_unavailable"); }
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
