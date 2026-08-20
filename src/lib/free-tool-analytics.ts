import type { FreeToolEventInput } from "@/types/free-tools";

export function trackFreeToolEvent(input: FreeToolEventInput): void {
  if (typeof window === "undefined" || navigator.doNotTrack === "1") return;
  void fetch("/api/site-analytics/collect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    credentials: "omit",
    keepalive: true,
  }).catch(() => undefined);
}
