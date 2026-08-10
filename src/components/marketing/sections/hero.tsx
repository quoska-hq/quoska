import Link from "next/link";
import { ArrowRight, Check, Coffee, History } from "lucide-react";
import { Button } from "@/components/ui/button";

const PRODUCT_FACTS = [
  "Server-Zeitstempel",
  "Pausenhinweise",
  "Korrekturverlauf",
  "CSV-Export",
] as const;

export function HeroSection() {
  return (
    <section className="border-b border-slate-900/10">
      <div className="mx-auto max-w-7xl px-5 pb-12 pt-16 sm:px-6 sm:pb-16 sm:pt-20 lg:pb-20 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6658d3]">
              Zeiterfassung für deutsche Betriebe
            </p>
            <h1 className="mt-5 font-serif text-5xl leading-[0.98] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-7xl">
              Arbeitszeit erfassen. Ohne Theater.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
              Quoska bringt Stempeluhr, Pausen, Korrekturen und Auswertungen an
              einen Ort. Mitarbeitende verstehen es sofort. Verantwortliche
              behalten den Überblick.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/register">
                <Button className="h-12 w-full rounded-none bg-slate-950 px-6 text-base text-white hover:bg-[#6658d3] sm:w-auto">
                  Kostenlos ausprobieren
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
              <Link
                href="/#features"
                className="inline-flex h-12 items-center justify-center border-b border-slate-400 px-1 text-sm font-semibold text-slate-800 transition-colors hover:border-[#6658d3] hover:text-[#6658d3]"
              >
                Produkt ansehen
              </Link>
            </div>

            <p className="mt-5 text-sm text-slate-500">
              Bis 3 Personen kostenlos · Keine Kreditkarte · Direkt im Browser
            </p>
          </div>

          <ProductPreview />
        </div>

        <ul className="mt-12 grid border-y border-slate-900/15 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
          {PRODUCT_FACTS.map((fact) => (
            <li
              key={fact}
              className="flex items-center gap-2 border-slate-900/15 py-4 text-sm font-medium text-slate-700 sm:border-r sm:px-5 sm:first:pl-0 sm:nth-2:border-r-0 lg:nth-2:border-r lg:last:border-r-0 lg:last:pr-0"
            >
              <Check className="size-4 shrink-0 text-[#6658d3]" />
              {fact}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ProductPreview() {
  return (
    <div className="border border-slate-900/20 bg-[#ebe8e0] p-2 sm:p-3">
      <div className="overflow-hidden border border-slate-900/15 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.10)]">
        <div className="flex h-11 items-center justify-between border-b border-slate-200 px-4">
          <div className="flex items-center gap-2">
            <span className="size-2 bg-[#6658d3]" />
            <span className="text-xs font-bold tracking-tight text-slate-900">QUOSKA</span>
          </div>
          <span className="text-[11px] text-slate-500">Bäckerei Hoffmann</span>
        </div>

        <div className="grid sm:grid-cols-[9rem_1fr]">
          <aside className="hidden border-r border-slate-200 bg-[#faf9f6] p-4 sm:block">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Übersicht
            </p>
            <div className="mt-4 space-y-3 text-xs text-slate-500">
              <p className="font-semibold text-slate-950">Stempeluhr</p>
              <p>Meine Zeiten</p>
              <p>Korrekturen</p>
              <p>Team</p>
              <p>Auswertungen</p>
            </div>
          </aside>

          <div className="p-5 sm:p-6 lg:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500">Guten Morgen, Anna.</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">
                  Stempeluhr
                </h2>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <span className="size-1.5 rounded-full bg-emerald-600" />
                Aktiv
              </span>
            </div>

            <div className="mt-7 border-y border-slate-200 py-6 text-center">
              <p className="font-mono text-4xl font-semibold tabular-nums tracking-tight text-slate-950 sm:text-5xl">
                06:24:51
              </p>
              <p className="mt-2 text-xs text-slate-500">Heute seit 08:02 Uhr</p>
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                className="mt-5 bg-slate-950 px-8 py-3 text-sm font-semibold text-white"
              >
                Ausstempeln
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="border border-slate-200 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <Coffee className="size-4 text-[#6658d3]" />
                  Pause erfasst
                </div>
                <p className="mt-2 text-xs text-slate-500">12:03–12:34 · 31 Min.</p>
              </div>
              <div className="border border-slate-200 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <History className="size-4 text-[#6658d3]" />
                  Letzte Änderung
                </div>
                <p className="mt-2 text-xs text-slate-500">Korrektur bestätigt</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
