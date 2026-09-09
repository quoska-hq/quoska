import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { isSiteAnalyticsEnabled } from "@/config/server/site-analytics-access";
import { getNowIso } from "@/config/server/timestamps";
import { getProductOverview } from "@/services/productAnalyticsService";
import { saveProductSnapshot } from "@/repos/productEventRepo";
export async function POST(request: Request) {
  if (!isAuthorizedCronRequest(request)) return new NextResponse(null, { status: 401 });
  if (!isSiteAnalyticsEnabled()) return new NextResponse(null, { status: 204 });
  try {
    const summary = await getProductOverview(getNowIso());
    saveProductSnapshot(summary);
    return NextResponse.json({ data: { date: summary.today, saved: true }, error: null });
  } catch {
    return NextResponse.json({ data: null, error: "Produktbericht konnte nicht vollständig erstellt werden." }, { status: 503 });
  }
}
