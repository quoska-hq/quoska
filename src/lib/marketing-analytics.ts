"use client";

import type { MarketingEventInput, MarketingEventName, MarketingPlacement } from "@/types/site-analytics";

const STORAGE_KEY = "quoska-marketing-signup-source";

export function trackMarketingSignupStart(sourcePath: string, placement: MarketingPlacement): void {
  if (typeof window === "undefined" || navigator.doNotTrack === "1") return;
  const source = { sourcePath, placement };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(source));
  } catch {
    // Storage can be unavailable; event collection still works without it.
  }
  send({ marketingEvent: "marketing_signup_start", ...source });
}

export function trackMarketingSignupProgress(event: Exclude<MarketingEventName, "marketing_signup_start">): void {
  const source = readSource();
  if (!source) return;
  send({ marketingEvent: event, ...source });
  if (event === "marketing_setup_completed") {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing else depends on storage cleanup.
    }
  }
}

function readSource(): Pick<MarketingEventInput, "sourcePath" | "placement"> | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null") as Partial<MarketingEventInput> | null;
    return typeof value?.sourcePath === "string" && typeof value.placement === "string"
      ? { sourcePath: value.sourcePath, placement: value.placement as MarketingPlacement }
      : null;
  } catch {
    return null;
  }
}

function send(input: MarketingEventInput): void {
  if (typeof window === "undefined" || navigator.doNotTrack === "1") return;
  void fetch("/api/site-analytics/collect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    credentials: "omit",
    keepalive: true,
  }).catch(() => undefined);
}
