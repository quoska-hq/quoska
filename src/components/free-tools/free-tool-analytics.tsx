"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { trackFreeToolEvent } from "@/lib/free-tool-analytics";
import type { FreeToolEventInput, FreeToolId } from "@/types/free-tools";

export function FreeToolViewTracker({ tool }: { tool: FreeToolId }) {
  useEffect(() => {
    trackFreeToolEvent({ event: "free_tool_view", tool });
  }, [tool]);
  return null;
}

export function TrackedToolLink({
  tool,
  placement,
  href,
  signup = false,
  className,
  children,
}: {
  tool: FreeToolId;
  placement: NonNullable<FreeToolEventInput["placement"]>;
  href: string;
  signup?: boolean;
  className?: string;
  children: ReactNode;
}) {
  function trackClick() {
    trackFreeToolEvent({ event: "free_tool_product_click", tool, placement });
    if (signup) {
      trackFreeToolEvent({ event: "free_tool_signup_start", tool, placement });
    }
  }

  return (
    <Link href={href} className={className} onClick={trackClick}>
      {children}
    </Link>
  );
}

export function ToolResultCta({
  tool,
  employerCopy = false,
}: {
  tool: FreeToolId;
  employerCopy?: boolean;
}) {
  return (
    <aside className="mt-6 border-l-4 border-[#6658d3] bg-[#efede7] p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
      <div>
        <p className="font-semibold text-slate-950">
          {employerCopy
            ? "Raus aus dem Stundenzettel."
            : "Berechnest du das regelmäßig?"}
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Mit Quoska erfasst ihr Arbeitszeiten, Pausen und Überstunden fortlaufend –
          kostenlos für bis zu drei Personen.
        </p>
      </div>
      <TrackedToolLink
        tool={tool}
        placement="result"
        href="/register"
        signup
        className="mt-4 inline-flex shrink-0 items-center gap-2 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5145ad] sm:mt-0"
      >
        Kostenlos starten <ArrowRight className="size-4" />
      </TrackedToolLink>
    </aside>
  );
}

export function ToolProductBridge({
  tool,
  title,
  children,
}: {
  tool: FreeToolId;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-[#e7e3da]">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-end lg:py-20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5145ad]">Wenn aus einmal regelmäßig wird</p>
          <h2 className="mt-4 max-w-3xl font-serif text-4xl leading-tight tracking-[-0.035em] text-slate-950">{title}</h2>
          <div className="mt-5 max-w-2xl leading-7 text-slate-700">{children}</div>
        </div>
        <TrackedToolLink tool={tool} placement="product_bridge" href="/zeiterfassung-kleinbetriebe" className="inline-flex items-center gap-2 border border-slate-950 bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-950 hover:text-white">
          Quoska kennenlernen <ArrowRight className="size-4" />
        </TrackedToolLink>
      </div>
    </section>
  );
}

export function FreeToolFinalCta({ tool }: { tool: FreeToolId }) {
  return (
    <section className="bg-[#151618] text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-end lg:py-20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a99ff3]">Digitale Zeiterfassung</p>
          <h2 className="mt-4 max-w-3xl font-serif text-4xl leading-tight tracking-[-0.035em]">Arbeitszeit nicht immer wieder neu rechnen.</h2>
          <p className="mt-5 max-w-xl leading-7 text-slate-300">Quoska führt Arbeitszeiten, Pausen, Korrekturen und Monatsauswertungen an einem Ort zusammen.</p>
        </div>
        <TrackedToolLink tool={tool} placement="footer" href="/register" signup className="inline-flex items-center gap-2 bg-[#a99ff3] px-6 py-4 font-semibold text-slate-950 hover:bg-white">
          Kostenlos starten <ArrowRight className="size-4" />
        </TrackedToolLink>
      </div>
    </section>
  );
}
