import Link from "next/link";
import { ArrowUpRight, FileUp } from "lucide-react";
import { legalInfo } from "@/lib/site";

const STEPS = [
  { title: "CSV-Datei auswählen", body: "Lade einen Detailbericht mit Datum, Beginn und Ende oder Arbeitsdauer hoch." },
  { title: "Zuordnung prüfen", body: "Bekannte Spalten und passende E-Mail-Adressen werden erkannt. Du ergänzt nur, was noch fehlt." },
  { title: "Vorschau bestätigen", body: "Prüfe Zeiten und Pausen vor dem Speichern. Bereits vorhandene Einträge werden übersprungen." },
] as const;

export function TimeImportSection() {
  return (
    <section id="zeitimport" className="scroll-mt-24 border-y border-slate-900/10 bg-[#efede7]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#5145ad]">
            <FileUp aria-hidden="true" className="size-4" /> Einfach wechseln
          </p>
          <h2 className="mt-4 max-w-lg font-serif text-3xl leading-tight tracking-[-0.035em] text-slate-950 sm:text-4xl">
            Deine bisherigen Zeiten kommen mit.
          </h2>
          <p className="mt-5 max-w-lg leading-7 text-slate-600">
            Du wechselst zu Quoska? Übernimm einzelne Arbeitszeiten aus einem CSV-Detailbericht,
            zum Beispiel aus Clockify oder Toggl Track. Den Import mit Vorschau gibt es in jedem Tarif.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold">
            <Link href="/register" className="inline-flex items-center gap-1 text-slate-950 hover:text-[#5145ad]">
              Kostenlos starten <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
            <a href="/examples/arbeitszeiten-import.csv" download className="text-slate-600 underline underline-offset-4 hover:text-[#5145ad]">
              CSV-Vorlage herunterladen
            </a>
          </div>
        </div>
        <div>
          <ol className="border-t border-slate-900/20">
            {STEPS.map((step, index) => <li key={step.title} className="flex gap-4 border-b border-slate-900/20 py-5">
              <span className="pt-0.5 font-mono text-xs text-[#5145ad]">0{index + 1}</span>
              <div>
                <h3 className="font-semibold text-slate-950">{step.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{step.body}</p>
              </div>
            </li>)}
          </ol>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Deine Datei passt nicht? Wir helfen dir bei der Übernahme. <a href={`mailto:${legalInfo.email}?subject=${encodeURIComponent("Hilfe beim Import meiner Arbeitszeiten")}`} className="font-semibold text-slate-950 underline underline-offset-4 hover:text-[#5145ad]">Importhilfe anfragen</a>
          </p>
        </div>
      </div>
    </section>
  );
}
