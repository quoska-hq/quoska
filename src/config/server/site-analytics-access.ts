import { serverEnv } from "@/config/env";

export function isSiteAnalyticsEnabled(): boolean {
  return Boolean(
    serverEnv.ANALYTICS_HASH_SECRET && serverEnv.ANALYTICS_ADMIN_EMAILS?.trim(),
  );
}

export function isSiteAnalyticsAdmin(email: string | null | undefined): boolean {
  if (!email || !isSiteAnalyticsEnabled()) return false;
  const normalized = email.trim().toLowerCase();
  return serverEnv.ANALYTICS_ADMIN_EMAILS?.split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalized) ?? false;
}
