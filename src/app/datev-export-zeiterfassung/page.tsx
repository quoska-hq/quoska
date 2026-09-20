import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/marketing/page-shell";
import { site } from "@/lib/site";
import { ArticleContent } from "./article-content";

const PATH = "/datev-export-zeiterfassung";
const TITLE = "DATEV-Export aus der Zeiterfassung: Stunden für LODAS";
const DESCRIPTION = "Arbeitsstunden für DATEV LODAS vorbereiten: kostenloser Quoska-Export, Zuordnung und Übergabe ans Lohnbüro. Mit Anleitung und klaren Beta-Grenzen.";
const DATE = "2026-09-20";
const SOURCES = [
  {
    "id": "datev",
    "title": "Schnittstellen zur DATEV-Payroll",
    "url": "https://www.datev.de/web/de/unternehmen/loesungen/lohn-und-personal/lohn-und-gehaltsabrechnung/schnittstellen",
    "detail": "Geprüft am 20.09.2026. Originaldokumentation des Herstellers."
  },
  {
    "id": "datev-cloud",
    "title": "Prozessgrafik DATEV Lohnimportdatenservice",
    "url": "https://www.datev.de/content/dam/markenassets/marktplatz/schnittstellen-prozessgrafiken/Prozessgrafik_Lohnimportdatenservice.pdf",
    "detail": "Geprüft am 20.09.2026. Originaldokumentation des Herstellers."
  },
  {
    "id": "quoska",
    "title": "Quoska: DATEV LODAS hours export",
    "url": "https://github.com/quoska-hq/quoska/blob/main/docs/datev-export.md",
    "detail": "Geprüft am 20.09.2026. Eigene Funktionsbeschreibung; tatsächlicher LODAS-Testimport steht noch aus."
  }
];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: {
    type: "article", title: TITLE, description: DESCRIPTION, url: PATH,
    publishedTime: DATE, modifiedTime: DATE,
  },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Article",
  "@id": `${site.url}${PATH}#artikel`,
  headline: TITLE,
  description: DESCRIPTION,
  datePublished: DATE,
  dateModified: DATE,
  inLanguage: "de-DE",
  mainEntityOfPage: `${site.url}${PATH}`,
  author: { "@type": "Organization", name: "Quoska", url: `${site.url}/ueber-uns` },
  publisher: { "@id": `${site.url}/#organization` },
  citation: SOURCES.map(source => source.url),
};

export default function DatevExportGuidePage() {
  return (
    <MarketingPageShell
      eyebrow="DATEV-Export · Anleitung"
      title={TITLE}
      intro="Arbeitsstunden prüfen, die Zuordnung mit dem Lohnbüro klären und den Monat als Datei übergeben. So nutzt du den kostenlosen LODAS-Export in Quoska."
      cta={false}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <div className="bg-white">
        <article id="artikel" className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
          <div className="border-b border-slate-900/15 pb-6 text-sm leading-6 text-slate-600">
            <p><Link href="/ueber-uns#redaktion" className="underline underline-offset-4 hover:text-[#5145ad]">Quoska Redaktion</Link></p>
            <p>Veröffentlicht und Quellen geprüft am <time dateTime={DATE}>20.09.2026</time></p>
          </div>
          <nav aria-label="In diesem Artikel" className="my-8 border-l-2 border-[#5145ad] pl-5 text-sm leading-7">
            <p className="font-semibold text-slate-950">In diesem Artikel</p>
            <ul className="mt-2 text-slate-700">
              <li><a href="#abschnitt-1" className="hover:underline">Was bringt ein DATEV-Export am Monatsende?</a></li>
              <li><a href="#abschnitt-2" className="hover:underline">Was enthält der kostenlose Quoska-Export?</a></li>
              <li><a href="#abschnitt-3" className="hover:underline">Diese Angaben klärst du mit deinem Lohnbüro</a></li>
              <li><a href="#abschnitt-4" className="hover:underline">So bereitest du den Monat in Quoska vor</a></li>
              <li><a href="#abschnitt-5" className="hover:underline">Dateiexport oder direkte DATEV-Verbindung?</a></li>
            </ul>
          </nav>
          <div className="text-base leading-8 text-slate-700 [&_p]:my-5 [&_h2]:mb-5 [&_h2]:mt-12 [&_h2]:scroll-mt-24 [&_h2]:font-serif [&_h2]:text-3xl [&_h2]:leading-tight [&_h2]:text-slate-950 [&_a]:font-medium [&_a]:text-[#5145ad] [&_a]:underline [&_a]:underline-offset-4 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-3 [&_strong]:text-slate-950 [&_table]:my-5 [&_table]:w-full [&_table]:text-left [&_table]:text-sm [&_table]:leading-6 [&_th]:bg-[#f5f3ee] [&_th]:p-3 [&_td]:border-b [&_td]:border-slate-900/15 [&_td]:p-3">
            <ArticleContent />
          </div>
          <section aria-labelledby="quellen" className="mt-12 border-t border-slate-900/15 pt-8">
            <h2 id="quellen" className="font-serif text-2xl text-slate-950">Quellen und redaktioneller Stand</h2>
            <ol className="mt-5 list-decimal space-y-4 pl-5 text-sm leading-6 text-slate-700">
              {SOURCES.map(source => (
                <li key={source.id} id={`quelle-${source.id}`} className="scroll-mt-24">
                  <a href={source.url} className="font-medium text-[#5145ad] underline underline-offset-4">{source.title}</a>
                  <p>{source.detail}</p>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-sm leading-6 text-slate-600">20.09.2026: Erstveröffentlichung mit geprüften DATEV-Quellen, Anleitung und Abgrenzung des kostenlosen Beta-Exports.</p>
          </section>
        </article>
      </div>
    </MarketingPageShell>
  );
}
