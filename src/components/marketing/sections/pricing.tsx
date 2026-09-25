import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { MarketingSignupLink } from "@/components/marketing/marketing-signup-link";
import { FOUNDER_OFFERS, PLANS, SELF_SERVICE_PLANS } from "@/config/plans";

import { ENTERPRISE_CONTACT_URL } from "@/config/enterprise";

const INCLUDED = [
  "Zeiterfassung und Pausen",
  "Korrekturen mit Verlauf",
  "Abwesenheiten und Auswertungen",
  "Projekte und CSV-Export",
  "CSV-Import mit Vorschau",
  "DATEV-LODAS-Export",
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
              Passend für dein Team. Offen für mehr.
            </h2>
          </div>
          <p className="max-w-xl leading-7 text-slate-600 lg:justify-self-end">
            Alle Standardfunktionen sind in jedem Tarif enthalten. Bis 50 Personen
            zahlst du einen festen Teampreis. Für größere Teams und individuelle
            Anforderungen erstellen wir dir ein Angebot.
          </p>
        </div>

        <p className="mt-6 text-sm leading-6 text-slate-600">DATEV-LODAS-Export ohne Aufpreis, auch in Free. <Link href="/datev-export-zeiterfassung" className="text-[#5145ad] underline underline-offset-4">Umfang und Anleitung</Link></p>

        <div className="mt-12 grid border-l border-t border-slate-900/15 sm:grid-cols-2 lg:grid-cols-4">
          {SELF_SERVICE_PLANS.map((key) => {
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

                <ul className="mb-6 mt-5 space-y-2 border-t border-slate-900/10 pt-5">
                  {INCLUDED.map((item) => (
                    <li key={item} className="flex gap-2 text-xs leading-5 text-slate-600">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-[#5145ad]" />
                      {item}
                    </li>
                  ))}
                </ul>

                <MarketingSignupLink
                  placement="pricing"
                  className={`mt-auto inline-flex h-10 w-full shrink-0 items-center justify-center gap-1.5 text-sm font-semibold ${
                      key === "team"
                        ? "bg-slate-950 text-white hover:bg-[#5145ad]"
                        : "border border-slate-400 bg-transparent text-slate-900 hover:bg-slate-950 hover:text-white"
                    }`}
                >
                  {key === "free" ? "Kostenlos starten" : `${plan.label} wählen`}
                  <ArrowUpRight className="size-4" />
                </MarketingSignupLink>
              </article>
            );
          })}
          <article className="flex min-h-[28rem] flex-col border-b border-r border-slate-900/15 bg-[#eeeafd] p-6">
            <h3 className="min-h-6 font-semibold text-slate-950">Enterprise</h3>
            <p className="mt-9 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Auf Anfrage</p>
            <p className="mt-8 text-sm font-semibold text-slate-800">Unbegrenzt viele Mitarbeitende</p>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Für große Teams und besondere Anforderungen. Wir besprechen mit dir,
              wie Quoska zu deinem Betrieb passt.
            </p>
            <ul className="mb-6 mt-5 space-y-2 border-t border-slate-900/10 pt-5">
              {["Alle Standardfunktionen", "Individuelle Funktionen und Feature Requests", "Integrationen mit deinen Programmen", "Automatisierung der Zeiterfassung", "Direkter Kontakt und schnelle Umsetzung"].map((item) => (
                <li key={item} className="flex gap-2 text-xs leading-5 text-slate-600">
                  <Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-[#5145ad]" />{item}
                </li>
              ))}
            </ul>
            <a href={ENTERPRISE_CONTACT_URL} className="mt-auto inline-flex min-h-10 w-full items-center justify-center gap-1.5 bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-[#5145ad]">
              Enterprise anfragen <ArrowUpRight aria-hidden="true" className="size-4" />
            </a>
          </article>
        </div>
      </div>
    </section>
  );
}
