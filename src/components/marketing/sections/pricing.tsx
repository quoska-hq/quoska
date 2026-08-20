import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FOUNDER_OFFERS, PLANS, PLAN_ORDER } from "@/config/plans";

const INCLUDED = [
  "Zeiterfassung und Pausen",
  "Korrekturen mit Verlauf",
  "Abwesenheiten und Auswertungen",
  "Projekte und CSV-Export",
] as const;

export function PricingSection() {
  return (
    <section id="preise" className="bg-white">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24 lg:py-28">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5145ad]">
              Preise
            </p>
            <h2 className="mt-4 font-serif text-4xl leading-tight tracking-[-0.035em] text-slate-950 sm:text-5xl">
              Vier Größen. Alles drin.
            </h2>
          </div>
          <p className="max-w-xl leading-7 text-slate-600 lg:justify-self-end">
            Alle Funktionen sind in jedem Tarif enthalten. Du zahlst nur nach
            Teamgröße — nicht pro Person.
          </p>
        </div>

        <div className="mt-12 grid border-l border-t border-slate-900/15 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_ORDER.map((key) => {
            const plan = PLANS[key];
            const isPaid = key !== "free";
            const offer = isPaid ? FOUNDER_OFFERS[key] : null;
            const employeeLabel =
              plan.employeeLimit === null
                ? "Unbegrenzt viele Mitarbeitende"
                : `Bis ${plan.employeeLimit} Mitarbeitende`;

            return (
              <article
                key={key}
                className={`flex min-h-[28rem] flex-col border-b border-r border-slate-900/15 p-6 ${
                  key === "team" ? "bg-[#efede7]" : "bg-white"
                }`}
              >
                <div className="flex min-h-6 items-center justify-between">
                  <h3 className="font-semibold text-slate-950">{plan.label}</h3>
                  {isPaid && (
                    <span className="border border-[#5145ad]/25 bg-[#f4f1ff] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#5145ad]">
                      Founder-Preis
                    </span>
                  )}
                </div>

                <p className="mt-9 text-4xl font-semibold tracking-[-0.04em] text-slate-950">
                  {offer?.priceEur ?? plan.priceEur ?? 0} €
                  <span className="ml-1 text-sm font-normal tracking-normal text-slate-600">
                    / Monat
                  </span>
                </p>
                {offer !== null && (
                  <p className="mt-2 text-xs font-medium text-[#5145ad]">
                    statt <span className="line-through">{offer.standardPriceEur} €</span>
                    {" · "}erste {offer.maxOrganizations} Unternehmen
                  </p>
                )}
                <p className={`${offer === null ? "mt-8" : "mt-4"} text-sm font-semibold text-slate-800`}>
                  {employeeLabel}
                </p>

                <ul className="mt-5 space-y-2 border-t border-slate-900/10 pt-5">
                  {INCLUDED.map((item) => (
                    <li key={item} className="flex gap-2 text-xs leading-5 text-slate-600">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-[#5145ad]" />
                      {item}
                    </li>
                  ))}
                </ul>

                <Link href="/register" className="mt-auto pt-6">
                  <Button
                    variant={key === "team" ? "default" : "outline"}
                    className={`w-full rounded-none ${
                      key === "team"
                        ? "bg-slate-950 text-white hover:bg-[#5145ad]"
                        : "border-slate-400 bg-transparent text-slate-900 hover:bg-slate-950 hover:text-white"
                    }`}
                  >
                    {key === "free" ? "Kostenlos starten" : `${plan.label} wählen`}
                    <ArrowUpRight className="ml-1.5 size-4" />
                  </Button>
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
