import Link from "next/link";
import { ArrowUpRight, Check, ExternalLink } from "lucide-react";
import {
  ALTERNATIVE_COMPARISONS,
  COMPARISON_RESEARCH_DATE,
  type AlternativeComparison,
} from "@/config/marketing/comparisons";
import { SectionHeading } from "@/components/marketing/page-shell";

export function AlternativeComparisonContent({
  comparison,
}: {
  comparison: AlternativeComparison;
}) {
  const related = ALTERNATIVE_COMPARISONS.filter(
    (item) => item.slug !== comparison.slug,
  );

  return (
    <>
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
          <SectionHeading eyebrow="Kurzentscheidung" title="Welche Lösung passt wann?">
            <p>
              Der Vergleich bewertet öffentlich belegbare Produkt- und
              Preisinformationen. Er ist bewusst nicht als pauschales Ranking
              formuliert.
            </p>
          </SectionHeading>
          <div className="mt-12 grid gap-px border border-slate-900/15 bg-slate-900/15 lg:grid-cols-2">
            <FitCard title="Quoska passt eher, wenn …" body={comparison.quoskaFit} />
            <FitCard
              title={`${comparison.competitor} passt eher, wenn …`}
              body={comparison.competitorFit}
            />
          </div>
        </div>
      </section>

      <section className="border-y border-slate-900/10 bg-[#e7e3da]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
          <SectionHeading eyebrow="Preise" title="Flatrate oder Preis pro Person und Modul.">
            <p>
              Preise wurden zuletzt am {COMPARISON_RESEARCH_DATE} auf den unten
              verlinkten Anbieterseiten geprüft. Rabatte, Laufzeiten, Steuern und
              Zusatzgebühren können den Rechnungsbetrag verändern.
            </p>
          </SectionHeading>
          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            <article className="border border-slate-900/15 bg-white p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5145ad]">
                Quoska
              </p>
              <h2 className="mt-4 text-2xl font-semibold text-slate-950">
                Feste Monatsraten
              </h2>
              <p className="mt-4 leading-7 text-slate-700">
                Kostenlos bis 3 aktive Personen. Für die ersten 100 Buchungen
                gelten die Founder-Preise 9 € bis 10, 59 € bis 50 und 99 € ohne
                Personenlimit; danach 19 €, 69 € und 129 €. Alle
                Produktfunktionen sind in jeder Stufe enthalten. Gemäß § 19
                UStG wird derzeit keine Umsatzsteuer ausgewiesen.
              </p>
              <Link
                href="/preise"
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-950 hover:text-[#5145ad]"
              >
                Quoska-Preise prüfen <ArrowUpRight className="size-4" />
              </Link>
            </article>
            <article className="border border-slate-900/15 bg-white p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5145ad]">
                {comparison.competitor}
              </p>
              <h2 className="mt-4 text-2xl font-semibold text-slate-950">
                Preis laut Anbieter
              </h2>
              <p className="mt-4 leading-7 text-slate-700">
                {comparison.competitorPricing}
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
          <SectionHeading eyebrow="Funktionsvergleich" title="Unterschiede, die im Alltag zählen.">
            <p>
              „Nicht beworben“ bedeutet: Die Funktion war auf den geprüften
              offiziellen Seiten nicht als Angebot erkennbar. Es ist keine
              Behauptung, dass sie technisch ausgeschlossen ist.
            </p>
          </SectionHeading>

          <div className="mt-12 space-y-4 md:hidden">
            {comparison.rows.map((row) => (
              <article key={row.topic} className="border border-slate-900/15 bg-[#f5f3ee] p-5">
                <h2 className="font-semibold text-slate-950">{row.topic}</h2>
                <ComparisonCell label="Quoska" cell={row.quoska} />
                <ComparisonCell label={comparison.competitor} cell={row.competitor} />
              </article>
            ))}
          </div>

          <div className="mt-12 hidden overflow-hidden border border-slate-900/15 md:block">
            <table className="w-full border-collapse text-left">
              <thead className="bg-slate-950 text-white">
                <tr>
                  <th scope="col" className="w-1/4 px-5 py-4 text-sm font-semibold">Kriterium</th>
                  <th scope="col" className="w-[37.5%] px-5 py-4 text-sm font-semibold">Quoska</th>
                  <th scope="col" className="w-[37.5%] px-5 py-4 text-sm font-semibold">{comparison.competitor}</th>
                </tr>
              </thead>
              <tbody>
                {comparison.rows.map((row) => (
                  <tr key={row.topic} className="border-t border-slate-900/15 align-top">
                    <th scope="row" className="bg-[#f5f3ee] px-5 py-5 text-sm font-semibold text-slate-950">
                      {row.topic}
                    </th>
                    <td className="px-5 py-5"><DesktopCell cell={row.quoska} /></td>
                    <td className="px-5 py-5"><DesktopCell cell={row.competitor} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-900/10 bg-[#f5f3ee]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow="Methodik" title="Quellen statt Scheingenauigkeit.">
            <p>
              Der Stand kann sich nach Veröffentlichung ändern. Vor einer
              Entscheidung sollten Tarifdetails, Vertragslaufzeit und benötigte
              Funktionen direkt beim jeweiligen Anbieter bestätigt werden.
            </p>
          </SectionHeading>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Offizielle Quellen</h2>
            <ul className="mt-5 space-y-3">
              {comparison.sources.map((source) => (
                <li key={source.url}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-start gap-2 text-sm font-semibold leading-6 text-slate-800 hover:text-[#5145ad]"
                  >
                    <ExternalLink className="mt-1 size-4 shrink-0" />
                    {source.label}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  href="/funktionen"
                  className="inline-flex items-start gap-2 text-sm font-semibold leading-6 text-slate-800 hover:text-[#5145ad]"
                >
                  <Check className="mt-1 size-4 shrink-0" />
                  Quoska: Funktionen
                </Link>
              </li>
              <li>
                <Link
                  href="/preise"
                  className="inline-flex items-start gap-2 text-sm font-semibold leading-6 text-slate-800 hover:text-[#5145ad]"
                >
                  <Check className="mt-1 size-4 shrink-0" />
                  Quoska: Preise
                </Link>
              </li>
            </ul>
            <p className="mt-8 text-xs leading-6 text-slate-600">
              Produktnamen und Marken gehören den jeweiligen Inhabern. Quoska
              steht in keiner geschäftlichen Verbindung zu {comparison.competitor}.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6">
          <h2 className="font-serif text-3xl tracking-[-0.03em] text-slate-950">
            Weitere Zeiterfassungen vergleichen
          </h2>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/alternativen"
              className="border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 hover:border-[#5145ad] hover:text-[#5145ad]"
            >
              Alle Alternativen
            </Link>
            {related.map((item) => (
              <Link
                key={item.slug}
                href={`/alternativen/${item.slug}`}
                className="border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 hover:border-[#5145ad] hover:text-[#5145ad]"
              >
                {item.competitor}-Alternative
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function FitCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="bg-[#f5f3ee] p-7 sm:p-9">
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      <p className="mt-4 leading-7 text-slate-700">{body}</p>
    </article>
  );
}

function ComparisonCell({
  label,
  cell,
}: {
  label: string;
  cell: AlternativeComparison["rows"][number]["quoska"];
}) {
  return (
    <div className="mt-5 border-t border-slate-900/10 pt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5145ad]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-950">{cell.value}</p>
      {cell.detail && <p className="mt-1 text-sm leading-6 text-slate-600">{cell.detail}</p>}
    </div>
  );
}

function DesktopCell({
  cell,
}: {
  cell: AlternativeComparison["rows"][number]["quoska"];
}) {
  return (
    <>
      <p className="text-sm font-semibold text-slate-950">{cell.value}</p>
      {cell.detail && <p className="mt-1 text-sm leading-6 text-slate-600">{cell.detail}</p>}
    </>
  );
}
