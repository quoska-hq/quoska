import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { MarketingPageShell, SectionHeading } from "@/components/marketing/page-shell";
import { PricingSection } from "@/components/marketing/sections/pricing";

export const metadata: Metadata = {
  title: "Kostenlose Zeiterfassung bis 3 Personen – Preise",
  description:
    "Quoska kostet ab 0 Euro: kostenlos bis 3 Personen, danach transparente Flatrates nach Teamgröße statt Preis pro Mitarbeiter.",
  alternates: { canonical: "/preise" },
};

const INCLUDED = [
  "Arbeitszeit und Pausen erfassen",
  "Korrekturen mit Aktivitätsverlauf",
  "Urlaub und Krankheit verwalten",
  "Cockpit, Projekte und CSV-Export",
  "Rollen für Mitarbeitende und Verantwortliche",
  "Updates und Hosting inklusive",
] as const;

export default function PricesPage() {
  return (
    <MarketingPageShell
      eyebrow="Preise"
      title="Kostenlose Zeiterfassung für kleine Teams. Feste Preise beim Wachsen."
      intro="Bis zu drei aktive Personen nutzen Quoska kostenlos und ohne Kreditkarte. Darüber gelten feste Preisstufen nach Teamgröße — alle Tarife enthalten dieselben Produktfunktionen."
    >
      <PricingSection />
      <section className="border-t border-slate-900/10 bg-[#f5f3ee]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <SectionHeading eyebrow="In jedem Tarif" title="Kein abgespecktes Kernprodukt.">
            <p>
              Free eignet sich für Kleinstteams und zum Kennenlernen. Beim Wechsel
              wächst lediglich das Personenlimit; die Arbeitsabläufe bleiben gleich.
            </p>
          </SectionHeading>
          <ul className="grid border-l border-t border-slate-900/15 bg-white sm:grid-cols-2">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-3 border-b border-r border-slate-900/15 p-5 text-sm leading-6 text-slate-700">
                <Check className="mt-1 size-4 shrink-0 text-[#5145ad]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="border-t border-slate-900/10 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6">
          <div className="grid gap-6 md:grid-cols-3">
            <PriceNote title="Monatlich kündbar">Das Vertragsverhältnis kann gemäß AGB monatlich beendet werden.</PriceNote>
            <PriceNote title="Free ohne Kreditkarte">Für den kostenlosen Tarif ist keine Zahlungsmethode nötig.</PriceNote>
            <PriceNote title="Kleinunternehmerregelung">Gemäß § 19 UStG wird derzeit keine Umsatzsteuer ausgewiesen.</PriceNote>
          </div>
          <Link
            href="/zeiterfassung-kleinbetriebe"
            className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-slate-950 hover:text-[#5145ad]"
          >
            Zeiterfassung für Kleinbetriebe ansehen
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </section>
    </MarketingPageShell>
  );
}

function PriceNote({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="border-t-2 border-slate-950 pt-5">
      <h2 className="font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{children}</p>
    </article>
  );
}
