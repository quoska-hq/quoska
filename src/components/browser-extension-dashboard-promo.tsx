"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Puzzle, ShieldCheck } from "lucide-react";
import { getChromeWebStoreUrl } from "@/config/browser-extension-store";
import type { ApiResponse } from "@/types/api";
import type { BrowserExtensionConnection } from "@/types/browser-extension";

const QUERY_KEY = ["browserExtensionConnections"] as const;

export function BrowserExtensionDashboardPromo() {
  const connections = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const response = await fetch("/api/v1/browser-extension/connections");
      const json: ApiResponse<BrowserExtensionConnection[]> = await response.json();
      if (!response.ok || !json.data) {
        throw new Error(json.error ?? "Browser-Verbindungen konnten nicht geladen werden.");
      }
      return json.data;
    },
  });

  if (!connections.data || connections.data.length > 0) return null;

  return (
    <section
      aria-labelledby="browser-extension-promo-title"
      className="border border-[#6658d3]/30 bg-[#eeebff] p-5 sm:flex sm:items-center sm:justify-between sm:gap-8"
    >
      <div className="flex gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center bg-[#6658d3] text-white">
          <Puzzle className="size-5" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5145ad]">
            Neu für Chrome
          </p>
          <h2
            id="browser-extension-promo-title"
            className="mt-1 text-base font-semibold text-slate-950"
          >
            Stempeln, ohne Quoska offen zu halten.
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Arbeitszeit und Pausen direkt über die Browserleiste erfassen – ohne
            Zugriff auf deinen Browserverlauf.
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <ShieldCheck className="size-3.5" />
            Verbindung jederzeit widerrufbar
          </p>
        </div>
      </div>
      <div className="mt-5 flex shrink-0 flex-wrap items-center gap-4 sm:mt-0 sm:flex-col sm:items-end sm:gap-2">
        <a
          href={getChromeWebStoreUrl("dashboard")}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center justify-center gap-2 bg-slate-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-[#5145ad]"
        >
          In Chrome hinzufügen
          <ArrowUpRight className="size-4" />
        </a>
        <Link
          href="/browser-erweiterung"
          className="text-xs font-semibold text-slate-600 hover:text-[#5145ad]"
        >
          Mehr erfahren
        </Link>
      </div>
    </section>
  );
}
