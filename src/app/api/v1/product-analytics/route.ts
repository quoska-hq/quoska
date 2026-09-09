import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { isSiteAnalyticsAdmin } from "@/config/server/site-analytics-access";
import { getNowIso } from "@/config/server/timestamps";
import { getProductOverview } from "@/services/productAnalyticsService";
export async function GET() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user || !isSiteAnalyticsAdmin(user.email)) return new NextResponse(null, { status: 404 });
  try {
    return NextResponse.json(await getProductOverview(getNowIso()), { headers: { "Cache-Control": "private, no-store", "Content-Disposition": 'attachment; filename="produktbericht.json"' } });
  } catch {
    return NextResponse.json({ error: "Produktdaten nicht vollständig verfügbar." }, { status: 503 });
  }
}
