import { createHmac } from "node:crypto";
import geoip from "geoip-lite";
import { serverEnv } from "@/config/env";
import { isSiteAnalyticsEnabled } from "@/config/server/site-analytics-access";
import { analyticsRetentionCutoff } from "@/config/server/site-analytics-time";
import { pruneSiteAnalytics } from "@/repos/siteAnalyticsRepo";
import type {
  AnalyticsDevice,
  SiteAnalyticsEventInput,
  SiteAnalyticsPageview,
} from "@/types/site-analytics";

const PRIVATE_ROUTE_PREFIXES = [
  "/_next", "/api", "/app", "/auth", "/setup", "/login",
  "/register", "/forgot-password", "/icons", "/product",
];

const BOT_PATTERN = /bot|crawler|spider|headless|preview|facebookexternalhit|slurp/i;

export function isTrackablePublicPath(pathname: string): boolean {
  if (!pathname.startsWith("/") || pathname.length > 180) return false;
  return !PRIVATE_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isLikelyBot(userAgent: string): boolean {
  return !userAgent || BOT_PATTERN.test(userAgent);
}

export function extractClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  const candidate = forwarded?.split(",").at(-1)?.trim()
    ?? headers.get("x-real-ip")?.trim();
  if (!candidate || candidate.length > 64) return null;
  return candidate.replace(/^\[|\]$/g, "");
}

export function buildSitePageview(params: {
  input: SiteAnalyticsEventInput;
  ip: string;
  userAgent: string;
  nowIso: string;
}): SiteAnalyticsPageview | null {
  const secret = serverEnv.ANALYTICS_HASH_SECRET;
  if (!secret) return null;

  const path = normalizePath(params.input.path);
  if (!path || !isTrackablePublicPath(path)) return null;

  // Rotate the pseudonym every day so visits cannot be linked across days.
  const visitorHash = digest(
    secret,
    `${params.nowIso.slice(0, 10)}|${params.ip}|${params.userAgent}`,
  );
  const minute = params.nowIso.slice(0, 16);
  const location = geoip.lookup(params.ip);
  const referrerHost = normalizeReferrer(params.input.referrer);

  return {
    occurredAt: params.nowIso,
    eventKey: digest(secret, `${visitorHash}|${path}|${minute}`),
    visitorHash,
    path,
    referrerHost,
    countryCode: normalizeCode(location?.country, 2),
    regionCode: normalizeCode(location?.region, 3),
    device: deviceFromUserAgent(params.userAgent),
    utmSource: normalizeText(params.input.utmSource, 80),
    utmMedium: normalizeText(params.input.utmMedium, 80),
    utmCampaign: normalizeText(params.input.utmCampaign, 120),
  };
}

export function pruneExpiredSiteAnalytics(nowIso: string): number {
  if (!isSiteAnalyticsEnabled()) return 0;
  return pruneSiteAnalytics(analyticsRetentionCutoff(nowIso));
}

function normalizePath(value: string): string | null {
  try {
    const url = new URL(value, serverEnv.NEXT_PUBLIC_APP_URL);
    const pathname = decodeURIComponent(url.pathname).replace(/\/{2,}/g, "/");
    if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
    return pathname;
  } catch {
    return null;
  }
}

function normalizeReferrer(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const referrer = new URL(value);
    const ownHost = new URL(serverEnv.NEXT_PUBLIC_APP_URL).hostname;
    if (referrer.hostname === ownHost || referrer.hostname === `www.${ownHost}`) {
      return "Intern";
    }
    return normalizeText(referrer.hostname.replace(/^www\./, ""), 120);
  } catch {
    return null;
  }
}

function normalizeText(value: string | undefined, maxLength: number): string | null {
  const normalized = [...(value?.trim() ?? "")]
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join("");
  return normalized ? normalized.slice(0, maxLength) : null;
}

function normalizeCode(value: string | undefined, maxLength: number): string | null {
  const normalized = value?.trim().toUpperCase();
  return normalized && /^[A-Z0-9-]+$/.test(normalized)
    ? normalized.slice(0, maxLength)
    : null;
}

function deviceFromUserAgent(userAgent: string): AnalyticsDevice {
  if (/ipad|tablet|kindle|silk/i.test(userAgent)) return "tablet";
  if (/mobile|iphone|ipod|android/i.test(userAgent)) return "mobile";
  return "desktop";
}

function digest(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("hex").slice(0, 32);
}
