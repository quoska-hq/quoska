import type { Metadata } from "next";
import Link from "next/link";
import { TimesheetCalculator } from "@/components/free-tools/timesheet-calculator";
import { FreeToolFinalCta, ToolProductBridge } from "@/components/free-tools/free-tool-analytics";
import { ToolClusterLinks, ToolSection } from "@/components/free-tools/tool-elements";
import { GuideFaq, GuideNotice } from "@/components/marketing/guide-elements";
import { MarketingPageShell, SectionHeading } from "@/components/marketing/page-shell";
import { getTodayDate } from "@/config/server/timestamps";
import { site } from "@/lib/site";
import { TimesheetTemplateLinks } from "@/components/marketing/timesheet-template-links";

const PATH = "/stundenzettel";
const TOOL = "stundenzettel" as const;
const FAQ = [
  {
    q: "Kann ich den Stundenzettel ohne Anmeldung herunterladen?",
    a: "Ja. CSV-Export und die druckoptimierte PDF-Ausgabe stehen ohne Konto, E-Mail-Adresse oder Registrierung bereit.",
  },
  {
    q: "Wo werden Namen und Arbeitszeiten verarbeitet?",
    a: "Alle Eingaben bleiben im Arbeitsspeicher des Browsers. Sie werden nicht an Quoska übertragen, nicht in URLs geschrieben und nicht in Analyseereignissen gespeichert.",
  },
  {
    q: "Funktionieren Schichten über Mitternacht?",
    a: "Ja. Aktiviere in der betreffenden Zeile „Folgetag“. Ohne diese ausdrückliche Auswahl wird ein Ende vor dem Beginn als fehlerhaft markiert.",
  },
  {
    q: "Ist der Ausdruck automatisch ein rechtssicherer Arbeitszeitnachweis?",
    a: "Nein. Der Stundenzettel berechnet und strukturiert deine Angaben, garantiert aber keine gesetzliche, tarifliche oder vertragliche Eignung für den Einzelfall.",
  },
] as const;

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Quoska Stundenzettel",
      url: `${site.url}${PATH}`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: "de-DE",
      description: "Interaktiver monatlicher Stundenzettel mit PDF- und CSV-Export.",
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
  title: "Stundenzettel kostenlos: PDF-Vorlage und Online-Berechnung",
  description: "Leere Stundenzettel-Vorlage als PDF herunterladen oder online ausfüllen: Arbeitszeiten summieren, CSV exportieren und drucken. Kostenlos, ohne Anmeldung.",
  alternates: { canonical: PATH },
  openGraph: {
    title: "Interaktiver Stundenzettel mit PDF- und CSV-Export",
    description: "Monatliche Arbeitszeiten lokal im Browser erfassen und kostenlos exportieren.",
    url: PATH,
  },
};

export default function TimesheetPage() {
  const initialMonth = getTodayDate().slice(0, 7);
  return (
    <MarketingPageShell
      eyebrow="Kostenloser Stundenzettel"
      title="Stundenzettel: kostenlose Vorlage für deinen Monat."
      intro="Leere PDF-Vorlage ausdrucken oder die Zeiten hier online eintragen. Der Online-Stundenzettel zieht Pausen ab, summiert die Arbeitszeit und lässt sich als CSV oder über den Druckdialog als PDF sichern."
      heroActions={<TimesheetTemplateLinks calculatorHref="#vorlage" />}
      cta={false}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <div id="vorlage" className="scroll-mt-24"><ToolSection><TimesheetCalculator initialMonth={initialMonth} /></ToolSection></div>

      <section className="border-y border-slate-900/10 bg-[#f5f3ee]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20">
          <SectionHeading eyebrow="So funktioniert es" title="Ausfüllen, prüfen, exportieren.">
            <p>Die Tagessumme entsteht aus Anwesenheit minus Pause. Vollständige Tage fließen sofort in die Monatssumme; unvollständige oder unmögliche Zeilen werden sichtbar ausgeschlossen.</p>
          </SectionHeading>
          <div className="mt-10 grid border-l border-t border-slate-900/15 bg-white md:grid-cols-3">
            {[
              ["01", "Tage erfassen", "Beginn, Ende, Pause und bei Bedarf den Folgetag eintragen."],
              ["02", "Fehler erkennen", "Fehlende Endzeiten oder zu lange Pausen verfälschen die Summe nicht."],
              ["03", "Datei mitnehmen", "CSV für Tabellenprogramme oder die Druckansicht zum Speichern als PDF nutzen."],
            ].map(([number, title, body]) => (
              <article key={number} className="border-b border-r border-slate-900/15 p-6">
                <span className="font-mono text-xs text-[#5145ad]">{number}</span>
                <h3 className="mt-8 text-lg font-semibold text-slate-950">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 pt-12 text-sm leading-7 text-slate-700 sm:px-6">
          <p>Für geringfügig Beschäftigte erklärt der Ratgeber <Link href="/stundenzettel-minijob" className="font-semibold text-[#5145ad] underline underline-offset-4">Stundenzettel im Minijob</Link> die besonderen Fristen. Wenn du zusätzlich Sollzeit und Überträge vergleichen möchtest, hilft das <Link href="/arbeitszeitkonto" className="font-semibold text-[#5145ad] underline underline-offset-4">Rechenbeispiel zum Arbeitszeitkonto</Link>.</p>
          <p className="mt-3">Die CSV-Datei lässt sich in Excel oder LibreOffice öffnen. Sie enthält die berechneten Werte zum Zeitpunkt des Exports; sie ist keine Excel-Vorlage mit weiterrechnenden Formeln.</p>
        </div>
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Datenschutz" title="Eine lokale Vorlage, keine Datensammlung.">
              <p>Unternehmensname, Name der beschäftigten Person und sämtliche Zeitwerte werden ausschließlich im Browserzustand gehalten. Auch Exporte entstehen lokal.</p>
            </SectionHeading>
            <GuideNotice><p>Beim Neuladen der Seite gehen nicht exportierte Angaben verloren. Das ist Absicht: Die kostenlose Vorlage besitzt keine versteckte Cloud-Speicherung.</p></GuideNotice>
          </div>
          <div>
            <SectionHeading eyebrow="Einordnung" title="Eine gute Tabelle bleibt eine Momentaufnahme.">
              <p>Für einen einzelnen Monat ist die Vorlage vollständig nutzbar. Wiederkehrende Nachweise brauchen zusätzlich klare Zuständigkeiten, Korrekturen und eine verlässliche Ablage.</p>
            </SectionHeading>
            <p className="mt-6 text-sm leading-7 text-slate-700">Welche Angaben praktisch wichtig sind und welche Fristen nicht verwechselt werden sollten, erklärt der <Link href="/arbeitszeitnachweis" className="font-semibold text-slate-950 underline underline-offset-4 hover:text-[#5145ad]">Leitfaden zum Arbeitszeitnachweis</Link>.</p>
          </div>
        </div>
      </section>

      <ToolProductBridge tool={TOOL} title="Raus aus einzelnen Dateien – hinein in einen laufenden Prozess.">
        <p>Quoska hält tägliche Erfassung, begründete Korrekturen und Monatsauswertungen zusammen. So muss der Stundenzettel nicht jeden Monat neu zusammengesucht werden.</p>
      </ToolProductBridge>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20">
          <SectionHeading eyebrow="Weitere Werkzeuge" title="Zeiten passend zum Anlass berechnen." />
          <div className="mt-8"><ToolClusterLinks current={PATH} /></div>
        </div>
      </section>

      <section className="border-t border-slate-900/10 bg-[#f5f3ee]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.75fr_1.25fr]">
          <SectionHeading eyebrow="Fragen" title="Export und Datenschutz." />
          <GuideFaq items={FAQ} />
        </div>
      </section>
      <FreeToolFinalCta tool={TOOL} />
    </MarketingPageShell>
  );
}
