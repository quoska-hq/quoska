"use client";
export function reportAuthOutcome(action: "login" | "signup", outcome: "ok" | "rejected" | "network") {
  if (typeof navigator === "undefined" || navigator.doNotTrack === "1") return;
  void fetch("/api/auth-observation", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, outcome }), keepalive: true, credentials: "omit" }).catch(() => undefined);
}
