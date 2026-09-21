"use client";

import { useEffect, useRef } from "react";

export function BillingInterest({ cancelled }: { cancelled: boolean }) {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
    const element = marker.current;
    if (!element) return;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      const actions = cancelled ? ["upgrade_view", "checkout_cancelled"] : ["upgrade_view"];
      for (const action of actions) void fetch("/api/v1/product-interest", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }), keepalive: true,
      }).catch(() => undefined);
      observer.disconnect();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [cancelled]);
  return <span ref={marker} className="block h-px" aria-hidden="true" />;
}
