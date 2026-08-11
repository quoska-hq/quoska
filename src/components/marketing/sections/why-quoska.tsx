import { Check, Minus } from "lucide-react";

const ROWS = [
  ["Zeiten zentral im Browser", true, true, true],
  ["Pausen und Abweichungen sichtbar", false, true, true],
  ["Korrekturanträge mit Verlauf", false, false, true],
  ["Urlaub und Krankheit im selben System", false, false, true],
  ["Fester Preis nach Teamgröße", true, false, true],
] as const;

export function WhyQuoskaSection() {
  return (
    <section className="border-y border-slate-900/10 bg-[#f5f3ee]">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5145ad]">
              Warum Quoska?
            </p>
            <h2 className="mt-4 max-w-md font-serif text-4xl leading-tight tracking-[-0.035em] text-slate-950 sm:text-5xl">
              Weniger Nachfragen. Weniger Nacharbeit.
            </h2>
            <p className="mt-5 max-w-md leading-7 text-slate-700">
              Eine einfache Stoppuhr erfasst Minuten. Quoska bildet den
              Arbeitsalltag rundherum ab — ohne daraus ein Großprojekt zu machen.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-900/15 bg-white">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-slate-900/15 bg-[#faf9f6]">
                <tr>
                  <th className="px-5 py-4 font-semibold text-slate-900">Im Alltag wichtig</th>
                  <th className="px-4 py-4 text-center font-semibold text-slate-600">Excel</th>
                  <th className="px-4 py-4 text-center font-semibold text-slate-600">Einfache Stempeluhr</th>
                  <th className="bg-[#eeeafd] px-4 py-4 text-center font-semibold text-[#5145ad]">Quoska</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/10">
                {ROWS.map(([label, excel, clock, quoska]) => (
                  <tr key={label}>
                    <th className="px-5 py-4 font-medium text-slate-800">{label}</th>
                    <Cell value={excel} />
                    <Cell value={clock} />
                    <Cell value={quoska} highlight />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function Cell({ value, highlight = false }: { value: boolean; highlight?: boolean }) {
  return (
    <td className={`px-4 py-4 text-center ${highlight ? "bg-[#f7f5ff]" : ""}`}>
      {value ? (
        <Check className={`mx-auto size-4 ${highlight ? "text-[#5145ad]" : "text-slate-600"}`} aria-label="Enthalten" />
      ) : (
        <Minus className="mx-auto size-4 text-slate-300" aria-label="Nicht enthalten" />
      )}
    </td>
  );
}
