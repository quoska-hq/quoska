"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const PRIVATE_PREFIXES = [
  "/_next", "/api", "/app", "/auth", "/setup", "/login",
  "/register", "/forgot-password", "/icons", "/product",
];

export function SiteAnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isPublicPath(pathname) || navigator.doNotTrack === "1") return;

    const query = new URLSearchParams(window.location.search);
    const payload = {
      path: pathname,
      referrer: document.referrer || undefined,
      utmSource: query.get("utm_source") || undefined,
      utmMedium: query.get("utm_medium") || undefined,
      utmCampaign: query.get("utm_campaign") || undefined,
    };

    void fetch("/api/site-analytics/collect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "omit",
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}

function isPublicPath(pathname: string): boolean {
  return !PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
