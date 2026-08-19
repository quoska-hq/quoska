import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  Check,
  MousePointerClick,
  Users,
} from "lucide-react";
import {
  MarketingPageShell,
  SectionHeading,
} from "@/components/marketing/page-shell";
import { site } from "@/lib/site";

const PAGE_PATH = "/projektzeiterfassung";

export const metadata: Metadata = {
  title: "Projektzeiterfassung für kleine Teams",
  description:
    "Projektzeiten direkt beim Stempeln zuordnen, Mitarbeitende Projekten zuweisen und Stunden nach Projekt und Kunde auswerten — ohne getrennte Stundenzettel.",
  alternates: { canonical: PAGE_PATH },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Quoska Projektzeiterfassung",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  inLanguage: "de-DE",
  url: `${site.url}${PAGE_PATH}`,
  description:
    "Projektzeiterfassung für kleine Teams mit Projektzuordnung in der Stempeluhr und projektbezogenen Berichten.",
  isPartOf: { "@id": `${site.url}/#website` },
};

const STEPS = [
  {
    icon: BriefcaseBusiness,
    number: "01",
    title: "Projekt anlegen",
    body: "Projektname, Kunde und Farbe bilden den gemeinsamen Bezug für Team und Bericht.",
  },
  {
    icon: Users,
    number: "02",
    title: "Team zuordnen",
    body: "Verantwortliche legen fest, welche Mitarbeitenden ein aktives Projekt auswählen können.",
  },
  {
    icon: MousePointerClick,
    number: "03",
    title: "Beim Stempeln wählen",
    body: "Das Projekt wird vor Arbeitsbeginn ausgewählt oder einem laufenden Eintrag nachträglich zugeordnet.",
  },
] as const;

export default function ProjectTimeTrackingPage() {
  return (
    <MarketingPageShell
      eyebrow="Projektzeiterfassung"
      title="Projektzeiten dort erfassen, wo der Arbeitstag beginnt."
      intro="Quoska verbindet die Stempeluhr mit Projekten und Kunden. Mitarbeitende wählen ihr zugeordnetes Projekt beim Einstempeln; Verantwortliche sehen die Verteilung anschließend im Cockpit und Projektbericht."
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
          <SectionHeading eyebrow="Ablauf" title="Drei Schritte statt zweiter Stundenzettel.">
            <p>
              Die Projektzuordnung ist Teil derselben Erfassung, in der auch
              Arbeitsbeginn, Pause und Feierabend entstehen.
            </p>
          </SectionHeading>
          <div className="mt-12 grid border-l border-t border-slate-900/15 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, number, title, body }) => (
              <article key={number} className="border-b border-r border-slate-900/15 p-7">
                <div className="flex items-center justify-between">
                  <Icon className="size-5 text-[#5145ad]" />
                  <span className="font-mono text-xs text-slate-500">{number}</span>
                </div>
                <h2 className="mt-8 text-lg font-semibold text-slate-950">{title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-900/10 bg-[#e7e3da]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:gap-16">
          <SectionHeading eyebrow="Auswertung" title="Stunden nach Projekt sichtbar machen.">
            <p>
              Das Cockpit zeigt Projektanteile im gewählten Zeitraum. Der
              Projektbericht ergänzt Gesamtzeit, Zahl der Einträge und beteiligte
              Mitarbeitende; Zeiten ohne Projekt bleiben als eigene Position
              erkennbar.
            </p>
            <ul className="mt-7 space-y-3 text-sm">
              {[
                "Projekt und Kunde gemeinsam benennen",
                "Aktive und inaktive Projekte getrennt verwalten",
                "Mitarbeitende gezielt Projekten zuweisen",
                "Projektzeiten nach Zeitraum und Team auswerten",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <Check className="mt-1 size-4 shrink-0 text-[#5145ad]" />
                  {item}
                </li>
              ))}
            </ul>
          </SectionHeading>
          <div className="border border-slate-900/20 bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.10)]">
            <Image
              src="/product/cockpit.png"
              alt="Quoska Cockpit mit Projektanteilen, Arbeitszeiten und offenen Aufgaben"
              width={1440}
              height={960}
              unoptimized
              sizes="(max-width: 1024px) 100vw, 760px"
              className="h-auto w-full border border-slate-900/10"
            />
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
          <SectionHeading eyebrow="Ein System" title="Projektzeit bleibt Arbeitszeit.">
            <p>
              Eine Projektzuordnung ändert nicht den zugrunde liegenden
              Zeitnachweis. Pausen, Korrekturen und serverseitige Zeitstempel
              bleiben Teil desselben Eintrags.
            </p>
          </SectionHeading>
          <div className="mt-12 grid gap-px border border-slate-900/15 bg-slate-900/15 md:grid-cols-3">
            <Feature
              icon={BarChart3}
              title="Cockpit und Bericht"
              body="Projektanteile und aggregierte Stunden stehen Verantwortlichen ohne separate Tabelle zur Verfügung."
            />
            <Feature
              icon={Users}
              title="Passende Auswahl"
              body="Mitarbeitende sehen in der Stempeluhr nur die Projekte, denen sie zugeordnet wurden."
            />
            <Feature
              icon={BriefcaseBusiness}
              title="Saubere Historie"
              body="Wird ein Projekt später deaktiviert, bleiben bereits erfasste Zeitbezüge für Auswertungen erhalten."
            />
          </div>
          <div className="mt-8 flex flex-wrap gap-6 text-sm font-semibold">
            <Link href="/funktionen" className="inline-flex items-center gap-2 text-slate-950 hover:text-[#5145ad]">
              Alle Funktionen <ArrowUpRight className="size-4" />
            </Link>
            <Link href="/zeiterfassung-kleinbetriebe" className="inline-flex items-center gap-2 text-slate-950 hover:text-[#5145ad]">
              Zeiterfassung für Kleinbetriebe <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof BarChart3;
  title: string;
  body: string;
}) {
  return (
    <article className="bg-white p-7">
      <Icon className="size-5 text-[#5145ad]" />
      <h2 className="mt-6 font-semibold text-slate-950">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
    </article>
  );
}
