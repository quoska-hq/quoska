import Link from "next/link";
import { PLANS, PLAN_ORDER, FOUNDER_OFFERS } from "@/config/plans";
import { SectionHeading } from "./page-shell";

export function SmallBusinessCosts() {
  return (
    <section id="kosten" className="border-y border-slate-900/10 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20">
        <SectionHeading eyebrow="Kosten für euren Betrieb" title="Was kosten 3, 5, 10 oder 20 Personen?">
          <p>Bei Quoska zählt die Anzahl aktiver Personen. Jede Preisstufe umfasst die Kernfunktionen der Zeiterfassung; die folgenden Beträge gelten für den gesamten Betrieb pro Monat.</p>
        </SectionHeading>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full max-w-3xl text-left text-sm leading-6">
            <caption className="sr-only">Monatliche Quoska-Kosten nach Teamgröße</caption>
            <thead className="border-b border-slate-900/20"><tr>{["Aktive Personen", "Tarif", "Regulär / Monat", "Founder / Monat*"].map(label => <th scope="col" className="px-3 py-4" key={label}>{label}</th>)}</tr></thead>
            <tbody>{[3, 5, 10, 20, 50].map(count => {
              const plan = PLAN_ORDER.find(key => PLANS[key].employeeLimit === null || PLANS[key].employeeLimit! >= count)!;
              return <tr className="border-b border-slate-900/10" key={count}><th scope="row" className="px-3 py-4 font-medium">{count}</th><td className="px-3 py-4">{PLANS[plan].label}</td><td className="px-3 py-4">{PLANS[plan].priceEur} €</td><td className="px-3 py-4">{plan === "free" ? "0 €" : `${FOUNDER_OFFERS[plan].priceEur} €`}</td></tr>;
            })}</tbody>
          </table>
        </div>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600">* Die Founder-Angebote sind je Tarif auf die ersten {FOUNDER_OFFERS.team.maxOrganizations} Unternehmen begrenzt. Maßgeblich ist die Verfügbarkeit bei der Buchung. Konditionen und Hinweise zur Umsatzsteuer stehen auf der <Link href="/preise" className="font-semibold text-[#5145ad] underline underline-offset-4">Preisseite</Link>.</p>
        <div className="mt-10 grid max-w-4xl gap-8 sm:grid-cols-2">
          <div><h3 className="font-semibold text-slate-950">Teilzeit und Minijobs im selben Team</h3><p className="mt-3 text-sm leading-7 text-slate-700">Hinterlegt die vereinbarten Wochenstunden und Arbeitstage pro Person. Für Minijobs hilft unser Ratgeber zu <Link href="/stundenzettel-minijob" className="text-[#5145ad] underline underline-offset-4">Aufzeichnungen und Fristen</Link>; für Überträge das <Link href="/arbeitszeitkonto" className="text-[#5145ad] underline underline-offset-4">Arbeitszeitkonto mit Rechenbeispiel</Link>.</p></div>
          <div><h3 className="font-semibold text-slate-950">Welche Geräte braucht ihr?</h3><p className="mt-3 text-sm leading-7 text-slate-700">Zum Stempeln verwendet jede Person ihren eigenen Zugang im Browser auf PC, Tablet oder Smartphone mit Internetverbindung. Eine zusätzliche Stechuhr ist dafür nicht nötig. Probiert den Ablauf auf euren tatsächlichen Geräten aus: <Link href="/digitale-zeiterfassung" className="text-[#5145ad] underline underline-offset-4">Zeiterfassung einrichten</Link>.</p></div>
        </div>
      </div>
    </section>
  );
}
