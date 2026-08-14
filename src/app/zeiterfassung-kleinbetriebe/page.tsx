import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check, Monitor, Smartphone, Users } from "lucide-react";
import { MarketingPageShell, SectionHeading } from "@/components/marketing/page-shell";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Zeiterfassung für Kleinbetriebe – kostenlos bis 3 Personen",
  description:
    "Einfache Zeiterfassung für Kleinbetriebe: kostenlos bis 3 Personen, direkt im Browser, mit festen Monatspreisen und ohne aufwendiges Einführungsprojekt.",
  alternates: { canonical: "/zeiterfassung-kleinbetriebe" },
};

const NEEDS = [
  "Mitarbeitende verstehen die Stempeluhr ohne Schulung",
  "Teilzeit und unterschiedliche Wochentage lassen sich abbilden",
  "Vergessene Buchungen werden sauber korrigiert",
  "Verantwortliche erkennen Handlungsbedarf rechtzeitig",
  "Der Preis bleibt mit wachsendem Team kalkulierbar",
] as const;

const FAQ = [
  {
    q: "Ist die Zeiterfassung für Kleinbetriebe wirklich kostenlos?",
    a: "Ja. Im Free-Tarif können bis zu drei aktive Personen Quoska ohne Kreditkarte nutzen. Die Kernfunktionen sind nicht eingeschränkt. Für größere Teams gelten feste Preisstufen.",
  },
  {
    q: "Müssen Mitarbeitende eine App installieren?",
    a: "Nein. Quoska läuft direkt im Browser auf Computer, Tablet und Smartphone. Auf unterstützten Geräten kann die Web-Anwendung zusätzlich wie eine App zum Startbildschirm hinzugefügt werden.",
  },
  {
    q: "Lassen sich Teilzeit und unterschiedliche Arbeitstage abbilden?",
    a: "Ja. Individuelle Wochenpläne können verschiedene Sollzeiten und freie Wochentage abbilden. Feiertage werden passend zum hinterlegten Bundesland berücksichtigt.",
  },
  {
    q: "Was passiert bei einer vergessenen Buchung?",
    a: "Mitarbeitende reichen eine begründete Korrektur ein. Verantwortliche prüfen sie, und die Änderung bleibt mit altem und neuem Wert im Aktivitätsverlauf nachvollziehbar.",
  },
  {
    q: "Wo werden die Daten der Cloud-Version gespeichert?",
    a: "Die produktive Datenbank läuft in der Supabase-Projektregion Frankfurt am Main. Die Web-Anwendung wird auf einem Hetzner-Server in Nürnberg betrieben.",
  },
] as const;

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  url: `${site.url}/zeiterfassung-kleinbetriebe#fragen`,
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export default function SmallBusinessPage() {
  return (
    <MarketingPageShell
      eyebrow="Für Kleinbetriebe"
      title="Zeiterfassung für Kleinbetriebe, nicht für IT-Abteilungen."
      intro="Kleine Betriebe brauchen eine verlässliche Arbeitszeiterfassung, aber selten ein monatelanges Softwareprojekt. Quoska ist kostenlos für bis zu drei Personen und für einen direkten Start im Browser gebaut."
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <SectionHeading eyebrow="Worauf es ankommt" title="Alltagstauglich vor funktionsreich.">
            <p>
              Das beste System hilft nicht, wenn Zeiten später trotzdem in
              Tabellen nachgearbeitet werden. Für kleine Betriebe zählen
              verständliche Abläufe, sichtbare Ausnahmen und ein Preis, der
              planbar bleibt.
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
            <Benefit number="01" title="Schneller Start">
              Betrieb anlegen, Arbeitsmodell wählen und Mitarbeitende per
              E-Mail einladen.
            </Benefit>
            <Benefit number="02" title="Ein gemeinsamer Ablauf">
              Stempeln, Abwesenheiten und Korrekturen laufen in derselben
              Oberfläche.
            </Benefit>
            <Benefit number="03" title="Planbare Flatrate">
              Kostenlos bis 3 Personen, danach feste Stufen statt Einzelpreis
              pro Kopf.
            </Benefit>
          </div>
          <div className="mt-10 flex flex-wrap gap-6">
            <Link
              href="/preise"
              className="inline-flex items-center gap-2 font-semibold text-slate-950 hover:text-[#5145ad]"
            >
              Preise vergleichen <ArrowUpRight className="size-4" />
            </Link>
            <Link
              href="/funktionen"
              className="inline-flex items-center gap-2 font-semibold text-slate-950 hover:text-[#5145ad]"
            >
              Funktionen ansehen <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
            <SectionHeading
              eyebrow="Im Arbeitsalltag"
              title="Auf jedem vorhandenen Gerät erreichbar."
            >
              <p>
                Für eine browserbasierte Zeiterfassung muss der Betrieb keine
                neuen Terminals verteilen. Mitarbeitende öffnen Quoska auf
                einem vorhandenen Gerät und sehen dort die für ihre Rolle
                vorgesehenen Funktionen.
              </p>
            </SectionHeading>
            <div className="grid border-l border-t border-slate-900/15 sm:grid-cols-3">
              <Device
                icon={Monitor}
                title="Am Arbeitsplatz"
                body="Arbeitszeit und Pausen direkt am Computer erfassen."
              />
              <Device
                icon={Smartphone}
                title="Unterwegs"
                body="Die mobile Ansicht im Browser des Smartphones öffnen."
              />
              <Device
                icon={Users}
                title="Für Verantwortliche"
                body="Offene Korrekturen, Abwesenheiten und Berichte gemeinsam prüfen."
              />
            </div>
          </div>
          <div className="mt-10 flex flex-wrap gap-6 text-sm font-semibold">
            <Link
              href="/digitale-zeiterfassung"
              className="inline-flex items-center gap-2 text-slate-950 hover:text-[#5145ad]"
            >
              Zeiterfassung im Browser <ArrowUpRight className="size-4" />
            </Link>
            <Link
              href="/open-source-zeiterfassung"
              className="inline-flex items-center gap-2 text-slate-950 hover:text-[#5145ad]"
            >
              Open-Source-Betriebsmodelle <ArrowUpRight className="size-4" />
            </Link>
            <Link
              href="/arbeitszeiterfassung-pflicht-kleinbetriebe"
              className="inline-flex items-center gap-2 text-slate-950 hover:text-[#5145ad]"
            >
              Pflicht für Kleinbetriebe 2026 <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section id="fragen" className="border-t border-slate-900/10 bg-[#f5f3ee]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <SectionHeading
            eyebrow="Häufige Fragen"
            title="Vor dem ersten Arbeitstag geklärt."
          >
            <p>
              Die wichtigsten Antworten zu Preis, Geräten, Arbeitsmodellen und
              Datenstandort für kleine Betriebe.
            </p>
          </SectionHeading>
          <div className="border-t border-slate-900/15">
            {FAQ.map((item) => (
              <article
                key={item.q}
                className="border-b border-slate-900/15 py-6"
              >
                <h2 className="font-semibold text-slate-950">{item.q}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-700">{item.a}</p>
              </article>
            ))}
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

function Device({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Monitor;
  title: string;
  body: string;
}) {
  return (
    <article className="border-b border-r border-slate-900/15 p-6">
      <Icon className="size-5 text-[#5145ad]" />
      <h2 className="mt-8 font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
    </article>
  );
}
