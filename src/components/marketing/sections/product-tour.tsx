import Link from "next/link";
import { ArrowUpRight, Clock3, History, LayoutDashboard } from "lucide-react";
import { DeviceLaptop } from "@/components/marketing/device-laptop";
import { DevicePhone } from "@/components/marketing/device-phone";

const CAPABILITIES = [
  {
    icon: Clock3,
    title: "Einfach stempeln",
    body: "Ein Klick für Arbeitsbeginn, Pause und Feierabend — auch im mobilen Browser.",
  },
  {
    icon: LayoutDashboard,
    title: "Früh sehen, was fehlt",
    body: "Offene Korrekturen, Abweichungen und Projektzeiten erscheinen direkt im Cockpit.",
  },
  {
    icon: History,
    title: "Änderungen nachvollziehen",
    body: "Korrekturen laufen über Anträge. Der ursprüngliche Eintrag und sein Verlauf bleiben sichtbar.",
  },
] as const;

export function ProductTourSection() {
  return (
    <section id="produkt" className="bg-white">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24 lg:py-28">
        <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5145ad]">
              Kein Marketing-Mock-up
            </p>
            <h2 className="mt-4 max-w-xl font-serif text-4xl leading-tight tracking-[-0.035em] text-slate-950 sm:text-5xl">
              So sieht Quoska wirklich aus.
            </h2>
          </div>
          <p className="max-w-xl leading-7 text-slate-700 lg:justify-self-end">
            Die Oberfläche bleibt bewusst ruhig: Mitarbeitende erfassen ihren
            Tag, Verantwortliche sehen Aufgaben und Entwicklungen ohne sich
            durch Tabellen zu arbeiten.
          </p>
        </div>

        <div
          data-testid="product-showcase"
          className="mt-12 overflow-hidden border border-slate-900/15 bg-[#f5f3ee] px-2 pb-8 pt-10 sm:px-8 sm:pb-10 sm:pt-12 lg:px-10 lg:pb-12 lg:pt-14"
        >
          <div className="relative mx-auto min-h-[19rem] max-w-[72rem] sm:min-h-[34rem] lg:min-h-[44rem]">
            <div className="absolute left-1/2 top-1/2 h-64 w-4/5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#6658d3]/10 blur-3xl" />
            <DeviceLaptop
              src="/product/activity-log.png"
              alt="Filterbarer Quoska Aktivitätsverlauf auf dem Laptop"
              sizes="(max-width: 640px) 360px, (max-width: 1024px) 720px, 910px"
              className="absolute left-1/2 top-[3%] z-0 w-[98%] -translate-x-1/2 sm:top-[2%] sm:w-[94%] lg:w-[94%]"
            />
            <DevicePhone
              src="/product/mobile-cockpit.png"
              alt="Quoska Cockpit auf dem Smartphone mit offenen Aufgaben und Kennzahlen"
              sizes="(max-width: 640px) 105px, (max-width: 1024px) 175px, 220px"
              className="absolute bottom-0 right-[2%] z-20 w-[28%] rotate-[2deg] sm:right-[1%] sm:w-[23%] lg:right-[2%] lg:w-[22%]"
            />
          </div>
          <p className="relative z-30 mx-auto mt-7 max-w-2xl text-center text-sm leading-6 text-slate-600">
            Cockpit und Aktivitätsverlauf — echte Quoska-Ansichten auf Laptop
            und Smartphone.
          </p>
        </div>

        <div className="mt-14 grid border-l border-t border-slate-900/15 md:grid-cols-3">
          {CAPABILITIES.map(({ icon: Icon, title, body }) => (
            <article key={title} className="border-b border-r border-slate-900/15 p-6 sm:p-7">
              <Icon className="size-5 text-[#5145ad]" />
              <h3 className="mt-5 font-semibold text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
            </article>
          ))}
        </div>

        <Link
          href="/funktionen"
          className="mt-8 inline-flex items-center gap-2 border-b border-slate-400 pb-1 text-sm font-semibold text-slate-900 hover:border-[#5145ad] hover:text-[#5145ad]"
        >
          Alle Funktionen ansehen
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
