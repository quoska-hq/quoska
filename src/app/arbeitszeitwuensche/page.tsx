import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/marketing/page-shell";
import { site } from "@/lib/site";
import { ArticleContent } from "./article-content";

const PATH = "/arbeitszeitwuensche";
const TITLE = "Arbeitszeitwünsche: Was kleine Arbeitgeber klären sollten";
const DESCRIPTION = "Weniger oder mehr arbeiten? Destatis-Zahlen 2025 und praktische Fragen zu Aufgaben, Arbeitstagen und Vertretung – mit Gesprächsvorlage für Arbeitgeber.";
const DATE = "2026-09-07";
const SOURCES = [
  {
    id: "destatis",
    title: "Destatis: Arbeitszeitwünsche 2025",
    url: "https://www.destatis.de/DE/Presse/Pressemitteilungen/2026/09/PD26_314_13.html",
    detail: "Pressemitteilung vom 4. September 2026. Datenjahr 2025, Erstergebnisse des Mikrozensus.",
  },
  {
    id: "rechner",
    title: "Quoska Überstundenrechner: Funktionsumfang",
    url: `${site.url}/ueberstundenrechner`,
    detail: "Rechner für Zeitsalden; keine Berechnung von Vergütung oder Zuschlägen.",
  },
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

export default function WorkTimePreferencesPage() {
  return (
    <MarketingPageShell
      eyebrow="Arbeitszeitwünsche"
      title={TITLE}
      intro="Wenn Mitarbeitende mehr oder weniger Stunden arbeiten möchten, müssen Aufgaben, Arbeitstage und Vertretung zusammenpassen. So bereitest du das Gespräch vor und prüfst später, ob die Änderung im Alltag funktioniert."
      cta={false}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <div className="bg-white">
        <article id="artikel" className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
          <div className="border-b border-slate-900/15 pb-6 text-sm leading-6 text-slate-600">
            <p><Link href="/ueber-uns#redaktion" className="underline underline-offset-4 hover:text-[#5145ad]">Quoska Redaktion</Link> · Mit KI-Unterstützung erstellt</p>
            <p>Veröffentlicht und Quellen geprüft am <time dateTime={DATE}>7. September 2026</time></p>
          </div>
          <nav aria-label="In diesem Artikel" className="my-8 border-l-2 border-[#5145ad] pl-5 text-sm leading-7">
            <p className="font-semibold text-slate-950">In diesem Artikel</p>
            <ul className="mt-2 text-slate-700">
              <li><a href="#zahlen" className="hover:underline">Die Destatis-Zahlen einordnen</a></li>
              <li><a href="#stunden-reduzieren" className="hover:underline">Weniger Stunden: Aufgaben und Vertretung klären</a></li>
              <li><a href="#stunden-aufstocken" className="hover:underline">Mehr Stunden: passende Arbeitstage finden</a></li>
              <li><a href="#gespraechsvorlage" className="hover:underline">Gesprächsvorlage herunterladen</a></li>
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
            <p className="mt-5 text-sm leading-6 text-slate-600">7. September 2026: Erstveröffentlichung mit Quellenprüfung, fiktivem Büro-Beispiel und eigener Gesprächsvorlage. Der Beitrag behandelt die organisatorische Planung einer Arbeitszeitänderung.</p>
          </section>
        </article>
      </div>
    </MarketingPageShell>
  );
}
