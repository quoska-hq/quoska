import type { Metadata } from "next";
import Link from "next/link";
import { WorkTimeCalculator } from "@/components/free-tools/work-time-calculator";
import {
  FreeToolFinalCta,
  ToolProductBridge,
} from "@/components/free-tools/free-tool-analytics";
import {
  ToolClusterLinks,
  ToolSection,
} from "@/components/free-tools/tool-elements";
import { GuideFaq, GuideNotice, SourceLink } from "@/components/marketing/guide-elements";
import { MarketingPageShell, SectionHeading } from "@/components/marketing/page-shell";
import { site } from "@/lib/site";

const PATH = "/arbeitszeitrechner";
const TOOL = "arbeitszeitrechner" as const;
const UPDATED = "2026-08-20";
const FAQ = [
  {
    q: "Wie berechnet man die Nettoarbeitszeit?",
    a: "Von der Zeit zwischen Arbeitsbeginn und Arbeitsende werden alle Ruhepausen abgezogen. Aus 08:00 bis 16:30 Uhr mit 30 Minuten Pause werden so 8 Stunden Nettoarbeitszeit.",
  },
  {
    q: "Kann der Rechner Nachtschichten berechnen?",
    a: "Ja. Wenn das Arbeitsende am nächsten Kalendertag liegt, muss „Ende am Folgetag“ ausdrücklich aktiviert werden. Dadurch bleibt eine versehentliche Eingabe sichtbar.",
  },
  {
    q: "Wie werden Minuten in Dezimalstunden umgerechnet?",
    a: "Die Minuten werden durch 60 geteilt. 7 Stunden und 30 Minuten entsprechen daher 7,50 Dezimalstunden; 7 Stunden und 45 Minuten entsprechen 7,75.",
  },
  {
    q: "Werden meine eingegebenen Zeiten gespeichert?",
    a: "Nein. Die Berechnung findet lokal im Browser statt. Zeiten, Pausen und Ergebnisse werden weder übertragen noch in Analyseereignissen gespeichert.",
  },
] as const;

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Quoska Arbeitszeitrechner",
      url: `${site.url}${PATH}`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: "de-DE",
      description: "Kostenloser Rechner für Nettoarbeitszeit, Pausen, Dezimalstunden und Überstunden.",
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
  title: "Arbeitszeitrechner: Netto-Arbeitszeit kostenlos berechnen",
  description: "Arbeitszeit mit Pausen berechnen: Nettozeit, Dezimalstunden und Überstunden – auch für Nachtschichten, minutengenau und ohne Anmeldung.",
  alternates: { canonical: PATH },
  openGraph: {
    title: "Arbeitszeitrechner – Arbeitszeit und Pausen berechnen",
    description: "Kostenlos, minutengenau und direkt im Browser.",
    url: PATH,
  },
};

export default function WorkTimeCalculatorPage() {
  return (
    <MarketingPageShell
      eyebrow="Kostenloser Arbeitszeitrechner"
      title="Arbeitszeit berechnen. Ohne Tabellenakrobatik."
      intro="Beginn, Ende und Pausen eingeben – der Rechner zeigt Nettoarbeitszeit, Dezimalstunden und den Saldo zur Sollzeit. Auch Nachtschichten werden eindeutig behandelt."
      cta={false}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ToolSection><WorkTimeCalculator /></ToolSection>

      <section className="border-y border-slate-900/10 bg-[#f5f3ee]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20">
          <SectionHeading eyebrow="Beispiele" title="Von der Anwesenheit zur echten Arbeitszeit.">
            <p>Die Rechnung bleibt sichtbar. Pausen werden vollständig abgezogen und das Ergebnis zusätzlich als Dezimalzahl ausgegeben.</p>
          </SectionHeading>
          <div className="mt-10 overflow-x-auto border border-slate-900/15 bg-white">
            <table className="min-w-[680px] w-full text-left text-sm">
              <thead className="bg-[#e7e3da]"><tr>{["Beginn", "Ende", "Pause", "Netto", "Dezimal"].map((label) => <th key={label} className="p-4 font-semibold">{label}</th>)}</tr></thead>
              <tbody className="text-slate-700">
                {[
                  ["08:00", "16:30", "00:30", "08:00", "8,00"],
                  ["07:45", "16:15", "00:45", "07:45", "7,75"],
                  ["22:00", "06:30 Folgetag", "00:30", "08:00", "8,00"],
                ].map((row) => <tr key={row.join("-")} className="border-t border-slate-900/15">{row.map((cell, index) => <td key={`${index}-${cell}`} className={`p-4 ${index === 3 ? "font-semibold text-slate-950" : ""}`}>{cell}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Annahmen" title="Eindeutig bei Schichtwechsel und Zeitumstellung.">
              <p>Ohne Folgetag behandelt der Rechner gleiche Uhrzeiten als null Minuten. Mit Folgetag sind es 24 Stunden. Ein Ende vor dem Beginn wird nicht stillschweigend als Nachtschicht gedeutet.</p>
            </SectionHeading>
            <GuideNotice>
              <p>Der Rechner vergleicht eingegebene Uhrzeiten als lokale <strong>Wandzeit</strong>. An der Umstellung zwischen Sommer- und Winterzeit kann die tatsächlich verstrichene Zeit abweichen. Dafür sind Datum, Ort und betriebliche Regel erforderlich.</p>
            </GuideNotice>
          </div>
          <div>
            <SectionHeading eyebrow="Pausen" title="Rechnen ersetzt keine Pausenregel.">
              <p>Der Rechner zieht die tatsächlich eingegebenen Pausen ab. Er ergänzt keine gesetzliche Mindestpause und trifft keine Aussage darüber, ob eine konkrete Schicht arbeitsrechtlich zulässig ist.</p>
            </SectionHeading>
            <p className="mt-6 text-sm leading-7 text-slate-700">
              Die allgemeinen Mindestpausen stehen in <SourceLink href="https://www.gesetze-im-internet.de/arbzg/__4.html">§ 4 Arbeitszeitgesetz</SourceLink>. Mehr Einordnung bietet unser <Link href="/pausenregelung-arbeitszeit" className="font-semibold text-slate-950 underline underline-offset-4 hover:text-[#5145ad]">Leitfaden zur Pausenregelung</Link>.
            </p>
          </div>
        </div>
      </section>

      <ToolProductBridge tool={TOOL} title="Aus einzelnen Rechnungen wird ein verlässlicher Zeitverlauf.">
        <p>Quoska erfasst Kommen, Gehen und Pausen fortlaufend. Mitarbeitende sehen ihren Saldo, während Korrekturen und Monatsauswertungen für den Betrieb nachvollziehbar bleiben.</p>
      </ToolProductBridge>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20">
          <SectionHeading eyebrow="Weitere Werkzeuge" title="Von einem Tag bis zum ganzen Monat." />
          <div className="mt-8"><ToolClusterLinks current={PATH} /></div>
        </div>
      </section>

      <section className="border-t border-slate-900/10 bg-[#f5f3ee]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.75fr_1.25fr]">
          <SectionHeading eyebrow="Fragen" title="Kurz und nachvollziehbar." />
          <GuideFaq items={FAQ} />
        </div>
      </section>
      <FreeToolFinalCta tool={TOOL} />
    </MarketingPageShell>
  );
}
