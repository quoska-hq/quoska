import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const PRODUCT_FACTS = [
  "Bis 3 Personen kostenlos",
  "Server-Zeitstempel",
  "Korrekturen mit Verlauf",
  "Datenbank in Frankfurt",
] as const;

export function HeroSection() {
  return (
    <section className="overflow-hidden border-b border-slate-900/10">
      <div className="mx-auto max-w-7xl px-5 pb-12 pt-14 sm:px-6 sm:pb-16 sm:pt-20 lg:pb-20 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5145ad]">
              Für kleine Betriebe und Teams
            </p>
            <h1 className="mt-5 font-serif text-[2.85rem] leading-[0.98] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-[4.2rem]">
              Digitale Zeiterfassung. Ohne Theater.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-700">
              Arbeitszeit, Pausen und Korrekturen an einem Ort. Einfach fürs
              Team, klar für Verantwortliche.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/register">
                <Button className="h-12 w-full rounded-none bg-slate-950 px-6 text-base text-white hover:bg-[#5145ad] sm:w-auto">
                  Kostenlos mit dem Team starten
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
              <Link
                href="/#produkt"
                className="inline-flex h-12 items-center justify-center border-b border-slate-500 px-1 text-sm font-semibold text-slate-800 transition-colors hover:border-[#5145ad] hover:text-[#5145ad]"
              >
                Produkt ansehen
              </Link>
            </div>

            <p className="mt-5 text-sm text-slate-600">
              Keine Kreditkarte · In wenigen Minuten eingerichtet · Direkt im Browser
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
              <Check className="size-4 shrink-0 text-[#5145ad]" />
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
    <div className="relative hidden sm:block lg:-mr-24 xl:-mr-36">
      <div className="absolute -left-10 -top-10 size-44 rounded-full bg-[#6658d3]/10 blur-3xl" />
      <div className="relative border border-slate-900/20 bg-[#e7e3da] p-2 shadow-[0_28px_80px_rgba(15,23,42,0.14)] sm:p-3">
        <div className="overflow-hidden border border-slate-900/15 bg-white">
          <div className="flex h-10 items-center justify-between border-b border-slate-900/10 bg-[#faf9f6] px-3 sm:px-4">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="size-2 rounded-full bg-slate-300" />
              <span className="size-2 rounded-full bg-slate-300" />
              <span className="size-2 rounded-full bg-[#6658d3]" />
            </div>
            <span className="text-[10px] font-medium tracking-wide text-slate-600">
              quoska.de/app
            </span>
            <span className="w-9" aria-hidden="true" />
          </div>
          <Image
            src="/product/cockpit.png"
            alt="Quoska Cockpit mit Arbeitszeitverlauf, offenen Aufgaben und Projektauswertung"
            width={1440}
            height={960}
            unoptimized
            priority
            sizes="(max-width: 1024px) 100vw, 760px"
            className="h-auto w-full"
          />
        </div>
      </div>
      <div className="absolute -bottom-5 left-5 border border-slate-900/15 bg-white px-4 py-3 shadow-[0_14px_35px_rgba(15,23,42,0.12)] sm:left-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5145ad]">
          Echtes Produkt
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-900">
          Das Team auf einen Blick
        </p>
      </div>
    </div>
  );
}
