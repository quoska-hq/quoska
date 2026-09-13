import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { isSiteAnalyticsEnabled } from "@/config/server/site-analytics-access";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { productDay } from "@/config/server/product-analytics-time";
import { productTenantKey, productEmployeeKey } from "@/config/server/product-analytics-key";
import { getNowIso } from "@/config/server/timestamps";
import { recordProductAction } from "@/repos/productEventRepo";
import { recordAccountActivity } from "@/repos/productAccountActivityRepo";

export async function POST(request: Request) {
  if (!isSiteAnalyticsEnabled() || request.headers.get("sec-gpc") === "1" || request.headers.get("dnt") === "1") return new NextResponse(null, { status: 204 });
  if (request.headers.get("sec-fetch-site") === "cross-site") return new NextResponse(null, { status: 403 });
  const auth = await getEmployeeFromAuth(await createClient());
  if (!auth.data) return new NextResponse(null, { status: 401 });
  try {
    // Identity and timestamp come exclusively from authenticated server state.
    const at = getNowIso();
    const tenantKey = productTenantKey(auth.data.tenantId);
    recordProductAction({ day: productDay(at), action: "app_open", outcome: "ok", tenantKey, count: 1 });
    recordAccountActivity({ tenantKey, employeeKey: productEmployeeKey(auth.data.employeeId), at });
  } catch { console.warn("product_presence_unavailable"); }
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
