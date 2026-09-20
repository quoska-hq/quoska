import Link from "next/link";
import { ArrowUpRight, FileDown } from "lucide-react";

export function DatevExportSection() {
  return <section id="datev-export" className="border-y border-slate-900/10 bg-[#f5f3ee]">
    <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-20">
      <div>
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#5145ad]">
          <FileDown aria-hidden="true" className="size-4" /> Ohne Aufpreis · Beta
        </p>
        <h2 className="mt-4 font-serif text-3xl leading-tight tracking-[-0.035em] text-slate-950 sm:text-4xl">Arbeitsstunden für DATEV LODAS vorbereiten.</h2>
        <p className="mt-5 leading-7 text-slate-600">Monat auswählen, Personalnummern und Lohnarten zuordnen, Stunden prüfen und die Datei ans Lohnbüro geben.
          Der LODAS-Export ist in jedem Quoska-Tarif enthalten – auch in Free bis drei Personen.</p>
        <Link href="/datev-export-zeiterfassung" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-950 hover:text-[#5145ad]">
          DATEV-Export und Anleitung ansehen <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      <div className="border-l-2 border-[#5145ad]/30 pl-6 text-sm leading-7 text-slate-600">
        <h3 className="font-semibold text-slate-950">Was die Datei enthält</h3>
        <p className="mt-2">Erfasste Netto-Arbeitsstunden pro Person, Monat und zugeordneter Lohnart.
          Offene Zeiten, ungeklärte Korrekturen und fehlende Zuordnungen werden vor dem Export angezeigt.</p>
        <p className="mt-4">Beta: Ein echter LODAS-Testimport steht noch aus. Bitte zuerst gemeinsam mit dem Lohnbüro in einem Testbestand prüfen.</p>
        <p className="mt-4">Für DATEV LODAS. Keine Direktverbindung und kein Export für „Lohn und Gehalt“.
          Abwesenheitsvergütung und Zuschläge sind nicht enthalten.</p>
      </div>
    </div>
  </section>;
}
