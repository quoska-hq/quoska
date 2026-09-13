import type { ReactNode } from "react";
import Link from "next/link";
import { MarketingPageShell } from "./page-shell";
import { site } from "@/lib/site";

export function WorkTimeGuide({ path, title, intro, children, contents, sources, heroActions }: {
  path: string;
  title: string;
  intro: string;
  children: ReactNode;
  contents: readonly { id: string; title: string }[];
  sources: readonly { id: string; title: string; url: string }[];
  heroActions?: ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Article",
    headline: title, description: intro, inLanguage: "de-DE",
    datePublished: "2026-09-13",
    dateModified: "2026-09-13",
    mainEntityOfPage: `${site.url}${path}`,
    author: { "@type": "Organization", name: "Quoska Redaktion", url: `${site.url}/ueber-uns#redaktion` },
    publisher: { "@id": `${site.url}/#organization` },
    citation: sources.map(source => source.url),
  };
  return (
    <MarketingPageShell eyebrow="Ratgeber für kleine Betriebe" title={title} intro={intro} heroActions={heroActions}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
        <nav aria-label="In diesem Ratgeber" className="text-sm leading-6">
          <p className="font-semibold text-slate-950">In diesem Ratgeber</p>
          <ul className="mt-4 space-y-3">
            {contents.map(item => <li key={item.id}><a className="text-slate-700 underline underline-offset-4 hover:text-[#5145ad]" href={`#${item.id}`}>{item.title}</a></li>)}
          </ul>
        </nav>
        <article data-guide-article className="min-w-0 max-w-3xl text-base leading-8 text-slate-700 [&_a]:text-[#5145ad] [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mb-5 [&_h2]:font-serif [&_h2]:text-3xl [&_h2]:leading-tight [&_h2]:text-slate-950 [&_h3]:mb-3 [&_h3]:font-semibold [&_h3]:text-slate-950 [&_p]:my-4 [&_section]:mb-12 [&_section]:scroll-mt-24 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          <p className="!mt-0 text-sm text-slate-600"><Link href="/ueber-uns#redaktion">Quoska Redaktion</Link> · Quellen geprüft am 13.09.2026. Allgemeine Informationen; individuelle Vertrags- und Sonderregeln können abweichen.</p>
          {children}
          <section id="quellen">
            <h2>Quellen zum Nachlesen</h2>
            <ul className="text-sm leading-7">
              {sources.map(source => <li id={`quelle-${source.id}`} key={source.id}><a href={source.url}>{source.title}</a></li>)}
            </ul>
          </section>
        </article>
      </div>
    </MarketingPageShell>
  );
}

export function GuideTable({ headers, rows, caption }: {
  headers: readonly string[];
  rows: readonly (readonly string[])[];
  caption: string;
}) {
  return (
    <div className="my-6 overflow-x-auto border border-slate-900/15 bg-white">
      <table className="w-full text-left text-xs leading-6 sm:text-sm">
        <caption className="p-4 text-left font-semibold text-slate-950">{caption}</caption>
        <thead className="bg-[#e7e3da]"><tr>{headers.map(header => <th key={header} scope="col" className="px-2 py-3 font-semibold sm:px-4">{header}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => <tr key={i} className="border-t border-slate-900/10">{row.map((cell, j) => j === 0 ? <th scope="row" key={j} className="px-2 py-3 font-medium sm:px-4">{cell}</th> : <td key={j} className="px-2 py-3 sm:px-4">{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
