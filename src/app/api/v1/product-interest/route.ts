import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/config/supabase/server";
import { isSiteAnalyticsEnabled } from "@/config/server/site-analytics-access";
import { productDay } from "@/config/server/product-analytics-time";
import { productTenantKey } from "@/config/server/product-analytics-key";
import { getNowIso } from "@/config/server/timestamps";
import { recordProductAction } from "@/repos/productEventRepo";

const schema = z.object({ action: z.enum(["upgrade_view", "checkout_cancelled"]) }).strict();
export async function POST(request: Request) {
  if (!isSiteAnalyticsEnabled() || request.headers.get("dnt") === "1" || request.headers.get("sec-gpc") === "1") return new NextResponse(null, { status: 204 });
  if (request.headers.get("sec-fetch-site") === "cross-site") return new NextResponse(null, { status: 403 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse(null, { status: 401 });
  const { data: employee } = await supabase.from("employees").select("tenant_id,role").eq("user_id", user.id).is("deleted_at", null).single();
  if (employee?.role !== "admin") return new NextResponse(null, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  try {
    // Unverified browser interest only; never a payment or reliable abandonment.
    recordProductAction({ day: productDay(getNowIso()), action: parsed.data.action, outcome: "ok", tenantKey: productTenantKey(employee.tenant_id), count: 1 });
  } catch { console.warn("product_interest_unavailable"); }
  return new NextResponse(null, { status: 204 });
}
