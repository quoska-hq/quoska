"use client";
import { useEffect } from "react";
export function ProductActivity() {
  useEffect(() => {
    const record = () => {
      if (document.visibilityState !== "visible" || navigator.doNotTrack === "1") return;
      void fetch("/api/v1/product-activity", { method: "POST", keepalive: true }).catch(() => undefined);
    };
    record();
    const timer = setInterval(record, 30 * 60 * 1000);
    document.addEventListener("visibilitychange", record);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", record); };
  }, []);
  return null;
}
