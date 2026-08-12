import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/config/supabase/server";
import { analyticsPeriodStart } from "@/config/server/site-analytics-time";
import { isSiteAnalyticsAdmin } from "@/config/server/site-analytics-access";
import { getNowIso, getTodayDate } from "@/config/server/timestamps";
import { SiteAnalyticsDashboard } from "@/components/site-analytics-dashboard";
import { getSiteAnalyticsSummary } from "@/repos/siteAnalyticsRepo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Website-Analytics",
  robots: { index: false, follow: false },
};

export default async function SiteAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSiteAnalyticsAdmin(user.email)) notFound();

  const requestedDays = (await searchParams).days;
  const days: 7 | 30 | 90 = requestedDays === "7" || requestedDays === "90"
    ? Number(requestedDays) as 7 | 90
    : 30;
  const nowIso = getNowIso();
  const summary = getSiteAnalyticsSummary(
    days,
    analyticsPeriodStart(nowIso, days),
    nowIso,
    getTodayDate(),
  );

  return <SiteAnalyticsDashboard summary={summary} />;
}
