"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
export function ProductActivity() {
  const pathname = usePathname();
  const nextReportAt = useRef(0);
  useEffect(() => {
    const record = () => {
      if (document.visibilityState !== "visible" || navigator.doNotTrack === "1"
        || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
      const now = performance.now();
      if (now < nextReportAt.current) return;
      nextReportAt.current = now + 60_000;
      void fetch("/api/v1/product-activity", { method: "POST", keepalive: true }).catch(() => undefined);
    };
    const interact = (event: Event) => { if (event.isTrusted) record(); };
    record();
    // No periodic heartbeat: an idle visible tab must not appear continually active.
    const events = ["pointerdown", "keydown", "wheel", "touchstart"];
    for (const event of events) document.addEventListener(event, interact, { passive: true, capture: true });
    document.addEventListener("visibilitychange", record);
    window.addEventListener("focus", record);
    return () => {
      for (const event of events) document.removeEventListener(event, interact, { capture: true });
      document.removeEventListener("visibilitychange", record);
      window.removeEventListener("focus", record);
    };
  }, [pathname]);
  return null;
}
