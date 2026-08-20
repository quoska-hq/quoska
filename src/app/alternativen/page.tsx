import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { MarketingPageShell, SectionHeading } from "@/components/marketing/page-shell";
import { JsonLd } from "@/components/seo/json-ld";
import {
  ALTERNATIVE_COMPARISONS,
  COMPARISON_RESEARCH_DATE,
  COMPARISON_RESEARCH_DATE_ISO,
} from "@/config/marketing/comparisons";
import { site } from "@/lib/site";

const PATH = "/alternativen";

export const metadata: Metadata = {
  title: "Zeiterfassungssoftware im Vergleich – Alternativen 2026",
  description:
    "Zeiterfassungssoftware für kleine Betriebe vergleichen: Quoska, Clockodo, clockin und Crewmeister nach Preis, Funktionen und Einsatzgebiet.",
  alternates: { canonical: PATH },
  openGraph: {
    title: "Zeiterfassungssoftware im Vergleich – Alternativen 2026",
    description:
      "Faire Vergleiche mit offiziellen Preis- und Produktquellen für deutsche Kleinbetriebe.",
    url: `${site.url}${PATH}`,
    locale: "de_DE",
    type: "website",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": `${site.url}${PATH}#page`,
      url: `${site.url}${PATH}`,
      name: "Zeiterfassungssoftware im Vergleich – Alternativen 2026",
      description: metadata.description,
      inLanguage: "de-DE",
      dateModified: COMPARISON_RESEARCH_DATE_ISO,
      isPartOf: { "@id": `${site.url}/#website` },
      mainEntity: { "@id": `${site.url}${PATH}#list` },
    },
    {
      "@type": "ItemList",
      "@id": `${site.url}${PATH}#list`,
      itemListElement: ALTERNATIVE_COMPARISONS.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: `${item.competitor}-Alternative`,
        url: `${site.url}${PATH}/${item.slug}`,
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Startseite",
          item: site.url,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Alternativen",
          item: `${site.url}${PATH}`,
        },
      ],
    },
  ],
};

export default function AlternativesPage() {
  return (
    <MarketingPageShell
      eyebrow="Alternativen"
      title="Zeiterfassungssoftware vergleichen, ohne Äpfel mit Birnen zu messen."
      intro={`Quoska, Clockodo, clockin und Crewmeister lösen ähnliche Aufgaben mit unterschiedlichen Schwerpunkten. Unsere Vergleiche basieren auf öffentlich zugänglichen Anbieterinformationen, zuletzt geprüft am ${COMPARISON_RESEARCH_DATE}.`}
    >
      <JsonLd data={JSON_LD} />

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
          <SectionHeading eyebrow="Direktvergleiche" title="Die passende Alternative nach Bedarf.">
            <p>
              Statt eine künstliche Gesamtnote zu vergeben, zeigen die Seiten,
              für welche Anforderungen sich welches Produkt eher eignet.
            </p>
          </SectionHeading>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {ALTERNATIVE_COMPARISONS.map((comparison) => (
              <article
                key={comparison.slug}
                className="flex flex-col border border-slate-900/15 bg-[#f5f3ee] p-7"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5145ad]">
                  {comparison.competitor}-Alternative
                </p>
                <h2 className="mt-5 text-2xl font-semibold tracking-[-0.02em] text-slate-950">
                  Quoska vs. {comparison.competitor}
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {comparison.intro}
                </p>
                <Link
                  href={`/alternativen/${comparison.slug}`}
                  className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-950 hover:text-[#5145ad] lg:mt-auto lg:pt-8"
                >
                  Vergleich öffnen <ArrowUpRight className="size-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-900/10 bg-[#e7e3da]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
          <SectionHeading eyebrow="Vergleichskriterien" title="Erst Anforderungen, dann Anbieter.">
            <p>
              Der günstigste Einstieg ist nicht automatisch der günstigste
              passende Tarif. Entscheidend ist, welche Funktionen tatsächlich
              benötigt werden.
            </p>
          </SectionHeading>
          <ul className="grid gap-px border border-slate-900/15 bg-slate-900/15 sm:grid-cols-2">
            {[
              "Flatrate oder Preis pro aktivem Nutzer",
              "Native App, Browser oder gemeinsames Terminal",
              "Einfache Projektzuordnung oder Projektcontrolling",
              "Urlaub, Krankheit und Genehmigungsprozesse",
              "Schichtplanung, GPS und Offline-Erfassung",
              "Cloud-only, Open Source oder Self-Hosting",
            ].map((item) => (
              <li key={item} className="flex gap-3 bg-white p-5 text-sm leading-6 text-slate-700">
                <Check className="mt-1 size-4 shrink-0 text-[#5145ad]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
          <SectionHeading eyebrow="Transparenz" title="Was diese Vergleiche leisten – und was nicht.">
            <p>
              Wir verlinken die offiziellen Quellen, nennen das Prüfdatum und
              beschreiben auch Situationen, in denen der andere Anbieter die
              bessere Wahl sein kann. Individuelle Angebote, neue Funktionen und
              Vertragsdetails können nach dem Prüfdatum abweichen.
            </p>
          </SectionHeading>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/funktionen"
              className="border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 hover:border-[#5145ad] hover:text-[#5145ad]"
            >
              Quoska-Funktionen
            </Link>
            <Link
              href="/preise"
              className="border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 hover:border-[#5145ad] hover:text-[#5145ad]"
            >
              Quoska-Preise
            </Link>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
