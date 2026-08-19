import { ArrowUpRight } from "lucide-react";
import { SectionHeading } from "@/components/marketing/page-shell";

const COMPARISON_ROWS = [
  [
    "Schwerpunkt",
    "Arbeitszeiterfassung und Personalabläufe für kleine Betriebe",
    "Projekt-, Kunden- und Aktivitätszeiten mit Fakturierung",
  ],
  [
    "Betrieb",
    "Verwaltete Cloud oder Self-Hosting",
    "Kimai Cloud oder Self-Hosting",
  ],
  [
    "Passend, wenn …",
    "Pausen, Korrekturen, Abwesenheiten und Team-Cockpit im Mittelpunkt stehen",
    "Detaillierte Projektleistungen, Rechnungen und Erweiterbarkeit im Mittelpunkt stehen",
  ],
  ["Lizenz", "AGPL-3.0", "AGPL-3.0"],
] as const;

export function OpenSourceComparison() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
        <SectionHeading
          eyebrow="Quoska oder Kimai"
          title="Zwei offene Systeme mit unterschiedlichem Schwerpunkt."
        >
          <p>
            Kimai ist eine etablierte Open-Source-Lösung für kunden-, projekt-
            und aktivitätsbezogene Zeiterfassung mit Rechnungen, API und
            Erweiterungen. Quoska konzentriert sich auf den betrieblichen
            Arbeitstag kleiner deutscher Teams: Stempeln, Pausen,
            Abwesenheiten, Korrekturen und sichtbarer Handlungsbedarf.
          </p>
        </SectionHeading>

        <div className="mt-10 overflow-x-auto border border-slate-900/15">
          <table className="min-w-[760px] w-full text-left text-sm leading-7">
            <thead className="bg-[#f5f3ee] text-slate-950">
              <tr>
                <th className="p-4 font-semibold">Vergleich</th>
                <th className="p-4 font-semibold">Quoska</th>
                <th className="p-4 font-semibold">Kimai</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {COMPARISON_ROWS.map((row) => (
                <tr
                  key={row[0]}
                  className="border-t border-slate-900/15 align-top"
                >
                  <th className="p-4 font-semibold text-slate-950">{row[0]}</th>
                  <td className="p-4">{row[1]}</td>
                  <td className="p-4">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 max-w-4xl text-sm leading-7 text-slate-600">
          <p>
            Der Vergleich beschreibt den jeweiligen Produktschwerpunkt und ist
            keine vollständige Funktionsmatrix. Geprüft am 19. August 2026
            anhand der offiziellen Produktseiten.
          </p>
          <a
            href="https://www.kimai.org/de/"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 font-semibold text-slate-950 hover:text-[#5145ad]"
          >
            Kimai-Produktseite prüfen <ArrowUpRight className="size-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
