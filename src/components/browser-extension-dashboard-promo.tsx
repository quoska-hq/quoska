"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Puzzle, ShieldCheck, X } from "lucide-react";
import type { ApiResponse } from "@/types/api";
import type { BrowserExtensionPromotionStatus } from "@/types/browser-extension";

const QUERY_KEY = ["browserExtensionPromotion"] as const;

export function BrowserExtensionDashboardPromo() {
  const [closed, setClosed] = useState(false);
  const promotion = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const response = await fetch("/api/v1/browser-extension/promotion");
      const json: ApiResponse<BrowserExtensionPromotionStatus> = await response.json();
      if (!response.ok || !json.data) {
        throw new Error(json.error ?? "Browser-Erweiterungshinweis konnte nicht geladen werden.");
      }
      return json.data;
    },
  });

  function dismiss() {
    setClosed(true);
    void fetch("/api/v1/browser-extension/promotion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }).catch(() => undefined);
  }

  if (closed || !promotion.data?.eligible) return null;

  return (
    <aside
      aria-labelledby="browser-extension-promo-title"
      data-testid="browser-extension-promo"
      className="fixed inset-x-3 bottom-20 z-30 border border-[#6658d3]/35 bg-[#f7f5ff] shadow-[0_18px_55px_rgba(38,31,90,0.20)] sm:inset-x-auto sm:right-5 sm:w-[22rem] md:bottom-5 md:right-6"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Hinweis zur Chrome-Erweiterung dauerhaft schließen"
        className="absolute right-2 top-2 inline-flex size-8 items-center justify-center text-slate-400 transition-colors hover:bg-white hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6658d3]"
      >
        <X className="size-4" />
      </button>

      <Link
        href="/browser-erweiterung"
        className="group block p-5 pr-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6658d3]"
      >
        <div className="flex items-start gap-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center bg-[#6658d3] text-white">
            <Puzzle className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5145ad]">
              Quoska für Chrome
            </p>
            <h2
              id="browser-extension-promo-title"
              className="mt-1 text-base font-semibold leading-snug text-slate-950"
            >
              Stempeln, ohne den Quoska-Tab zu suchen.
            </h2>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Arbeitszeit, Pausen und Tagesfortschritt direkt in der Browserleiste –
          ohne Zugriff auf deinen Browserverlauf.
        </p>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#6658d3]/15 pt-3">
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <ShieldCheck className="size-3.5" />
            Sicher &amp; widerrufbar
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#5145ad] group-hover:text-slate-950">
            Vorteile ansehen
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </aside>
  );
}
