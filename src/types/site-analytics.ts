export type AnalyticsDevice = "desktop" | "tablet" | "mobile";

export interface SiteAnalyticsEventInput {
  path: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface SiteAnalyticsPageview {
  occurredAt: string;
  eventKey: string;
  visitorHash: string;
  path: string;
  referrerHost: string | null;
  countryCode: string | null;
  regionCode: string | null;
  device: AnalyticsDevice;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
}

export interface AnalyticsCount {
  label: string;
  count: number;
}

export interface AnalyticsDailyPoint {
  date: string;
  pageviews: number;
  visitors: number;
}

export interface SiteAnalyticsSummary {
  days: 7 | 30 | 90;
  from: string;
  to: string;
  pageviews: number;
  visitors: number;
  viewsPerVisitor: number;
  directShare: number;
  todayPageviews: number;
  todayVisitors: number;
  daily: AnalyticsDailyPoint[];
  pages: AnalyticsCount[];
  sources: AnalyticsCount[];
  regions: AnalyticsCount[];
  devices: AnalyticsCount[];
  campaigns: AnalyticsCount[];
}
