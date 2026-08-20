import type { Metadata } from "next";
import Link from "next/link";
import { MonthlyWorkTimeCalculator } from "@/components/free-tools/monthly-work-time-calculator";
import { FreeToolFinalCta, ToolProductBridge } from "@/components/free-tools/free-tool-analytics";
import { ToolClusterLinks, ToolSection } from "@/components/free-tools/tool-elements";
import { GuideFaq, GuideNotice, SourceLink } from "@/components/marketing/guide-elements";
import { MarketingPageShell, SectionHeading } from "@/components/marketing/page-shell";
import { getTodayDate } from "@/config/server/timestamps";
import { site } from "@/lib/site";

const PATH = "/monatsarbeitszeit-rechner";
const TOOL = "monatsarbeitszeit-rechner" as const;
const UPDATED = "2026-08-20";
const FAQ = [
  {
    q: "Wie berechnet sich die monatliche Sollarbeitszeit?",
    a: "Die Wochenstunden werden auf die ausgewählten regelmäßigen Arbeitstage verteilt. Der Rechner addiert diese Tageswerte für den Monat und lässt landesweite Feiertage auf planmäßigen Arbeitstagen aus.",
  },
  {
    q: "Warum müssen Abwesenheiten mit Datum eingegeben werden?",
    a: "Nur mit dem konkreten Datum lässt sich erkennen, ob Urlaub oder Krankheit auf einen planmäßigen Arbeitstag, einen Feiertag oder einen ohnehin freien Tag fällt.",
  },
  {
    q: "Sind alle örtlichen Feiertage enthalten?",
    a: "Nein. Der Rechner kennt bundesweite und im gesamten gewählten Bundesland geltende Feiertage. Gemeindeabhängige Feiertage sind bewusst ausgeschlossen, weil dafür der Arbeitsort nötig wäre.",
  },
  {
    q: "Wie entsteht die Zeitbilanz?",
    a: "Tatsächlich geleistete Zeit und angerechnete Abwesenheitszeit werden addiert und mit der monatlichen Sollzeit verglichen. Ohne Istzeit zeigt der Rechner nur Soll- und Anwesenheitswerte.",
  },
] as const;

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Quoska Monatsarbeitszeit-Rechner",
      url: `${site.url}${PATH}`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: "de-DE",
      description: "Monatliche Sollarbeitszeit mit Bundesland, Feiertagen und Abwesenheiten berechnen.",
      dateModified: UPDATED,
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
      provider: { "@id": `${site.url}/#organization` },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ],
};

export const metadata: Metadata = {
  title: "Monatsarbeitszeit-Rechner mit Feiertagen 2026",
  description: "Monatliche Sollarbeitszeit nach Bundesland berechnen: Wochenstunden, Arbeitstage, Feiertage, Urlaub, Krankheit und optionale Istzeit.",
  alternates: { canonical: PATH },
  openGraph: {
    title: "Monatsarbeitszeit mit Feiertagen berechnen",
    description: "Sollstunden, Abwesenheiten und Zeitbilanz transparent im Browser berechnen.",
    url: PATH,
  },
};

export default function MonthlyWorkTimePage() {
  const [year, month] = getTodayDate().split("-").map(Number);
  return (
    <MarketingPageShell
      eyebrow="Monatsarbeitszeit-Rechner"
      title="Sollstunden für den Monat. Feiertage schon mitgedacht."
      intro="Wochenstunden, regelmäßige Arbeitstage und Bundesland auswählen. Der Rechner zeigt Monats-Soll, Feiertage, konkrete Abwesenheiten und auf Wunsch die Zeitbilanz."
      cta={false}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ToolSection><MonthlyWorkTimeCalculator initialYear={year} initialMonth={month} /></ToolSection>

      <section className="border-y border-slate-900/10 bg-[#f5f3ee]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20">
          <SectionHeading eyebrow="Berechnungslogik" title="Arbeitstage haben ihren eigenen Sollwert.">
            <p>38,5 Wochenstunden bei fünf regelmäßigen Arbeitstagen ergeben beispielsweise 7 Stunden 42 Minuten je Tag. Feiertage reduzieren die Sollzeit nur dann, wenn sie auf einen dieser Arbeitstage fallen.</p>
          </SectionHeading>
          <div className="mt-10 grid border-l border-t border-slate-900/15 bg-white md:grid-cols-3">
            {[
              ["01", "Arbeitsplan", "Wochenstunden werden minutengenau auf die ausgewählten Wochentage verteilt."],
              ["02", "Kalender", "Bundesweite und landesweite Feiertage werden mit dem Arbeitsplan abgeglichen."],
              ["03", "Abwesenheit", "Urlaub, Krankheit und sonstige Abwesenheit zählen nur an konkreten Soll-Arbeitstagen."],
            ].map(([number, title, body]) => <article key={number} className="border-b border-r border-slate-900/15 p-6"><span className="font-mono text-xs text-[#5145ad]">{number}</span><h3 className="mt-8 text-lg font-semibold text-slate-950">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{body}</p></article>)}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Feiertage" title="Bundeslandweit ja, gemeindeabhängig nein.">
              <p>Ein Bundesland allein reicht nicht für örtliche Sonderregeln. Deshalb rechnet das Werkzeug nur mit Feiertagen, die bundesweit oder im gesamten ausgewählten Land gelten.</p>
            </SectionHeading>
            <GuideNotice><p><strong>Regelstand 20. August 2026.</strong> Die Jahre 2026 bis 2035 werden anhand der derzeit bekannten wiederkehrenden Regeln berechnet. Zukünftige Gesetzesänderungen oder einmalige Feiertage müssen neu geprüft werden.</p></GuideNotice>
          </div>
          <div>
            <SectionHeading eyebrow="Quellen" title="Kalenderregeln mit sichtbarer Grundlage.">
              <p>Die Feiertagszuordnung folgt dem aktuellen Kalender der Deutschen Bundesbank und den im Quoska-Produkt verwendeten Bundesland- und Arbeitsplan-Konzepten.</p>
            </SectionHeading>
            <ul className="mt-6 space-y-3 text-sm leading-7 text-slate-700">
              <li><SourceLink href="https://www.bundesbank.de/de/aufgaben/unbarer-zahlungsverkehr/target/feiertagskalender-2026-749314">Deutsche Bundesbank: Feiertagskalender 2026</SourceLink></li>
              <li><SourceLink href="https://verwaltung.bund.de/leistungsverzeichnis/DE/leistung/99006001006000">Bundesportal: Beschäftigung an Sonn- und Feiertagen</SourceLink></li>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-900/10 bg-[#f5f3ee]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-2">
          <SectionHeading eyebrow="Abwesenheiten" title="Angerechnet heißt hier: in die Rechnung aufgenommen.">
            <p>Das Werkzeug behandelt eingegebene Abwesenheiten rechnerisch als Zeitgutschrift entsprechend dem Arbeitsplan. Es entscheidet nicht, ob im Einzelfall ein Entgelt- oder Freistellungsanspruch besteht.</p>
          </SectionHeading>
          <div>
            <GuideNotice><p>Urlaub, Krankheit, Sonderurlaub und andere Ausfallzeiten können unterschiedlichen vertraglichen und gesetzlichen Regeln folgen. Prüfe die Auswahl für deinen konkreten Fall.</p></GuideNotice>
            <p className="mt-6 text-sm leading-7 text-slate-700">Für fortlaufende Istzeiten kannst du zuerst den <Link href="/stundenzettel" className="font-semibold text-slate-950 underline underline-offset-4 hover:text-[#5145ad]">interaktiven Stundenzettel</Link> ausfüllen und dessen Monatssumme übernehmen.</p>
          </div>
        </div>
      </section>

      <ToolProductBridge tool={TOOL} title="Monatliche Sollzeit direkt aus dem persönlichen Arbeitsplan.">
        <p>In Quoska sind Arbeitsplan, Bundesland, erfasste Zeiten und Abwesenheiten bereits verbunden. Dadurch entsteht der aktuelle Saldo fortlaufend statt erst am Monatsende.</p>
      </ToolProductBridge>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20">
          <SectionHeading eyebrow="Weitere Werkzeuge" title="Vom einzelnen Tag zur Monatsübersicht." />
          <div className="mt-8"><ToolClusterLinks current={PATH} /></div>
        </div>
      </section>

      <section className="border-t border-slate-900/10 bg-[#f5f3ee]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.75fr_1.25fr]">
          <SectionHeading eyebrow="Fragen" title="Sollzeit sauber eingeordnet." />
          <GuideFaq items={FAQ} />
        </div>
      </section>
      <FreeToolFinalCta tool={TOOL} />
    </MarketingPageShell>
  );
}
