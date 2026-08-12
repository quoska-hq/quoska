import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeviceLaptop } from "@/components/marketing/device-laptop";
import { DevicePhone } from "@/components/marketing/device-phone";

const PRODUCT_FACTS = [
  "Bis 3 Personen kostenlos",
  "Server-Zeitstempel",
  "Korrekturen mit Verlauf",
  "Datenbank in Frankfurt",
] as const;

export function HeroSection() {
  return (
    <section className="overflow-hidden border-b border-slate-900/10">
      <div className="mx-auto max-w-[92rem] px-5 pb-12 pt-14 sm:px-6 sm:pb-16 sm:pt-20 lg:pb-20 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[0.68fr_1.32fr] lg:gap-6 xl:gap-10">
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
    <div className="relative mx-auto min-h-[21rem] w-full max-w-[60rem] sm:min-h-[32rem] lg:-mr-5 lg:min-h-[39rem] xl:-mr-8 xl:min-h-[42rem]">
      <div className="absolute left-1/2 top-[45%] h-64 w-4/5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#6658d3]/15 blur-3xl" />
      <DeviceLaptop
        src="/product/cockpit.png"
        alt="Quoska Cockpit mit offenen Aufgaben und Arbeitszeitauswertung auf dem Laptop"
        priority
        sizes="(max-width: 640px) 360px, (max-width: 1024px) 700px, 800px"
        className="absolute left-0 top-[8%] z-0 w-[96%] sm:top-[5%]"
      />
      <DevicePhone
        src="/product/mobile-clock.png"
        alt="Mobile Stempeluhr von Quoska mit Tagesfortschritt und Pause"
        priority
        sizes="(max-width: 640px) 120px, 205px"
        className="absolute bottom-[3%] right-[1.5%] z-10 w-[32%] rotate-[2deg] sm:bottom-[1%] sm:right-[1%] sm:w-[28%]"
      />
      <div className="absolute bottom-[2%] left-[5%] z-20 w-max border border-slate-900/15 bg-white px-4 py-3 shadow-[0_14px_35px_rgba(15,23,42,0.12)] sm:bottom-[5%] sm:left-[9%]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5145ad]">
          Echtes Produkt
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-900">
          Auf jedem Gerät startklar
        </p>
      </div>
    </div>
  );
}
