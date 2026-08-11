import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { MarketingPageShell, SectionHeading } from "@/components/marketing/page-shell";

export const metadata: Metadata = {
  title: "Zeiterfassung für Kleinbetriebe",
  description:
    "Einfache Zeiterfassung für Kleinbetriebe und kleine Teams: kostenlos bis 3 Personen, feste Monatspreise und kein aufwendiges Einführungsprojekt.",
  alternates: { canonical: "/zeiterfassung-kleinbetriebe" },
};

const NEEDS = [
  "Mitarbeitende verstehen die Stempeluhr ohne Schulung",
  "Teilzeit und unterschiedliche Wochentage lassen sich abbilden",
  "Vergessene Buchungen werden sauber korrigiert",
  "Verantwortliche erkennen Handlungsbedarf rechtzeitig",
  "Der Preis bleibt mit wachsendem Team kalkulierbar",
] as const;

export default function SmallBusinessPage() {
  return (
    <MarketingPageShell
      eyebrow="Für Kleinbetriebe"
      title="Zeiterfassung für kleine Teams, nicht für IT-Abteilungen."
      intro="Kleinbetriebe brauchen eine verlässliche Arbeitszeiterfassung, aber selten ein monatelanges Softwareprojekt. Quoska ist für kurze Wege, klare Rollen und einen direkten Start im Browser gebaut."
    >
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <SectionHeading eyebrow="Worauf es ankommt" title="Alltagstauglich vor funktionsreich.">
            <p>
              Das beste System hilft nicht, wenn Zeiten später trotzdem in Tabellen
              nachgearbeitet werden. Für kleine Betriebe zählen verständliche Abläufe,
              sichtbare Ausnahmen und ein Preis, der planbar bleibt.
            </p>
          </SectionHeading>
          <ul className="border-t border-slate-900/15">
            {NEEDS.map((item) => (
              <li key={item} className="flex gap-3 border-b border-slate-900/15 py-5 text-sm leading-6 text-slate-700">
                <Check className="mt-0.5 size-4 shrink-0 text-[#5145ad]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-y border-slate-900/10 bg-[#e7e3da]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
          <div className="grid gap-6 md:grid-cols-3">
            <Benefit number="01" title="Schneller Start">Betrieb anlegen, Arbeitsmodell wählen und Mitarbeitende per E-Mail einladen.</Benefit>
            <Benefit number="02" title="Ein gemeinsamer Ablauf">Stempeln, Abwesenheiten und Korrekturen laufen in derselben Oberfläche.</Benefit>
            <Benefit number="03" title="Planbare Flatrate">Kostenlos bis 3 Personen, danach feste Stufen statt Einzelpreis pro Kopf.</Benefit>
          </div>
          <div className="mt-10 flex flex-wrap gap-6">
            <Link href="/preise" className="inline-flex items-center gap-2 font-semibold text-slate-950 hover:text-[#5145ad]">Preise vergleichen <ArrowUpRight className="size-4" /></Link>
            <Link href="/funktionen" className="inline-flex items-center gap-2 font-semibold text-slate-950 hover:text-[#5145ad]">Funktionen ansehen <ArrowUpRight className="size-4" /></Link>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}

function Benefit({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <article className="border-t-2 border-slate-950 pt-6">
      <span className="font-mono text-xs text-[#5145ad]">{number}</span>
      <h2 className="mt-8 text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-slate-700">{children}</p>
    </article>
  );
}
