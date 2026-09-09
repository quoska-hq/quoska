import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/config/supabase/server";
import { isSiteAnalyticsAdmin } from "@/config/server/site-analytics-access";
import { getNowIso } from "@/config/server/timestamps";
import { getProductOverview } from "@/services/productAnalyticsService";
import { getOperations, getProductHistory } from "@/repos/productEventRepo";
import { ProductAnalyticsDashboard } from "@/components/product-analytics-dashboard";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Produktübersicht", robots: { index: false, follow: false } };
export default async function ProductAnalyticsPage() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user || !isSiteAnalyticsAdmin(user.email)) notFound();
  let summary, history, operations;
  try {
    summary = await getProductOverview(getNowIso());
    history = getProductHistory();
    operations = getOperations();
  } catch {
    return <div role="alert">Die Produktübersicht konnte nicht vollständig geladen werden. Bitte erneut versuchen. Unvollständige Daten werden nicht als Nullwerte angezeigt.</div>;
  }
  return <ProductAnalyticsDashboard summary={summary} history={history} operations={operations} />;
}
