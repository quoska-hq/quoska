import type { Metadata } from "next";
import Link from "next/link";
import { OvertimeCalculator } from "@/components/free-tools/overtime-calculator";
import { FreeToolFinalCta, ToolProductBridge } from "@/components/free-tools/free-tool-analytics";
import { ToolClusterLinks, ToolSection } from "@/components/free-tools/tool-elements";
import { GuideFaq, GuideNotice } from "@/components/marketing/guide-elements";
import { MarketingPageShell, SectionHeading } from "@/components/marketing/page-shell";
import { site } from "@/lib/site";

const PATH = "/ueberstundenrechner";
const TOOL = "ueberstundenrechner" as const;
const FAQ = [
  {
    q: "Wie berechnet der Rechner Überstunden?",
    a: "Von der tatsächlichen Arbeitszeit wird die vertragliche Sollzeit abgezogen. Anschließend wird ein vorhandener positiver oder negativer Saldo hinzugerechnet.",
  },
  {
    q: "Kann ich auch Unterstunden berechnen?",
    a: "Ja. Wenn Istzeit und bisheriger Saldo zusammen unter der Sollzeit liegen, zeigt das Ergebnis einen negativen Zeitsaldo.",
  },
  {
    q: "Berechnet das Werkzeug die Auszahlung von Überstunden?",
    a: "Nein. Vergütung, Zuschläge, Steuern und die Frage, ob Überstunden auszuzahlen oder auszugleichen sind, hängen von Vertrag, Tarif und Einzelfall ab.",
  },
  {
    q: "Ist der Wert in freien Tagen ein Urlaubsanspruch?",
    a: "Nein. Es ist nur die mathematische Umrechnung des Zeitsaldos durch die eingegebenen Stunden je Arbeitstag.",
  },
] as const;

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Quoska Überstundenrechner",
      url: `${site.url}${PATH}`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: "de-DE",
      description: "Kostenloser Rechner für Überstunden, Unterstunden und Zeitguthaben.",
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
  title: "Überstundenrechner: Überstunden und Unterstunden berechnen",
  description: "Überstunden kostenlos berechnen: Sollzeit, Istzeit und bisherigen Saldo für Tag, Woche oder Monat transparent zusammenführen.",
  alternates: { canonical: PATH },
  openGraph: {
    title: "Überstundenrechner – Zeitkonto einfach berechnen",
    description: "Zeitguthaben und Unterstunden ohne Anmeldung berechnen.",
    url: PATH,
  },
};

export default function OvertimeCalculatorPage() {
  return (
    <MarketingPageShell
      eyebrow="Kostenloser Überstundenrechner"
      title="Überstunden im Blick. Ohne falsche Versprechen."
      intro="Sollzeit, tatsächliche Arbeitszeit und bisherigen Saldo eingeben. Der Rechner zeigt das neue Zeitguthaben oder die Unterstunden für Tag, Woche oder Monat."
      cta={false}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <ToolSection><OvertimeCalculator /></ToolSection>

      <section className="border-y border-slate-900/10 bg-[#f5f3ee]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20">
          <SectionHeading eyebrow="Rechenweg" title="Drei Werte, ein nachvollziehbarer Saldo.">
            <p>Der Zeitraum ändert nicht die Mathematik. Entscheidend ist, dass Soll- und Istzeit denselben Tag, dieselbe Woche oder denselben Monat abbilden.</p>
          </SectionHeading>
          <div className="mt-10 overflow-x-auto border border-slate-900/15 bg-white">
            <table className="min-w-[700px] w-full text-left text-sm">
              <thead className="bg-[#e7e3da]"><tr>{["Soll", "Ist", "Alter Saldo", "Neuer Saldo", "Einordnung"].map((label) => <th key={label} className="p-4 font-semibold">{label}</th>)}</tr></thead>
              <tbody className="text-slate-700">
                {[
                  ["40:00", "42:00", "+00:00", "+02:00", "Zeitguthaben"],
                  ["40:00", "39:00", "+02:30", "+01:30", "Restguthaben"],
                  ["40:00", "38:30", "−01:00", "−02:30", "Unterstunden"],
                ].map((row) => <tr key={row.join("-")} className="border-t border-slate-900/15">{row.map((cell, index) => <td key={`${cell}-${index}`} className={`p-4 ${index === 3 ? "font-mono font-semibold text-slate-950" : ""}`}>{cell}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-2">
          <SectionHeading eyebrow="Zeit statt Geld" title="Bewusst kein Auszahlungsrechner.">
            <p>Der Rechner führt ausschließlich Zeitwerte zusammen. Er schätzt keinen Brutto- oder Nettolohn, keine Zuschläge und keine steuerliche Behandlung.</p>
          </SectionHeading>
          <div>
            <GuideNotice><p>Ein positiver Rechenwert beweist weder die Anordnung noch die arbeitsrechtliche Anerkennung von Überstunden. Vertrag, Tarifvertrag, Betriebsvereinbarung und dokumentierte Freigaben können entscheidend sein.</p></GuideNotice>
            <p className="mt-6 text-sm leading-7 text-slate-700">Für eine belastbare Grundlage sollten Beginn, Ende, Pausen und spätere Korrekturen nachvollziehbar bleiben. Mehr dazu im <Link href="/arbeitszeitnachweis" className="font-semibold text-slate-950 underline underline-offset-4 hover:text-[#5145ad]">Arbeitszeitnachweis-Leitfaden</Link>.</p>
          </div>
        </div>
      </section>

      <ToolProductBridge tool={TOOL} title="Ein Zeitkonto ist besser, wenn es sich selbst fortschreibt.">
        <p>Quoska verknüpft tägliche Erfassung mit individuellen Arbeitsplänen und zeigt Salden fortlaufend. Korrekturen bleiben sichtbar, statt alte Tabellenwerte zu überschreiben.</p>
      </ToolProductBridge>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20">
          <SectionHeading eyebrow="Weitere Werkzeuge" title="Erfassen, rechnen und auswerten." />
          <div className="mt-8"><ToolClusterLinks current={PATH} /></div>
        </div>
      </section>

      <section className="border-t border-slate-900/10 bg-[#f5f3ee]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.75fr_1.25fr]">
          <SectionHeading eyebrow="Fragen" title="Zeitkonto ohne Lohnversprechen." />
          <GuideFaq items={FAQ} />
        </div>
      </section>
      <FreeToolFinalCta tool={TOOL} />
    </MarketingPageShell>
  );
}
