import type { ProductOverview } from "@/types/product-analytics";
import { TEAM_SIZE_LABELS } from "@/types/onboarding";

export function ProductActivationOverview({ activation: a }: { activation: ProductOverview["activation"] }) {
  return <section className="min-w-0 border border-slate-900/15 bg-white p-4 sm:p-6" data-testid="product-activation">
    <h2 className="text-lg font-semibold">Vom Einstieg zur Zahlung</h2>
    <p className="mt-2 text-sm text-slate-500">Firmen mit erreichtem Schritt. Die Reihenfolge kann abweichen; die Werte sind keine durchgehende Conversion-Quote.</p>
    <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[
        ["Firma angelegt", a.companies], ["Weitere Person bestätigt", a.invited], ["Erste vollständige Zeit", a.completedEntry],
        ["Nichtleeren Bericht erzeugt", a.exported], ["Checkout erstellt", a.checkout], ["Bezahlte Live-Rechnung", a.paid],
      ].map(([label, value]) => <div key={label} className="border border-slate-200 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 font-mono text-2xl font-semibold">{value}</p></div>)}
    </div>
    <p className="mt-4 text-sm"><strong>{a.returned} von {a.returnEligible}</strong> beobachtbaren Firmen erfassen in der zweiten Woche erneut.</p>
    <p className="mt-2 text-xs leading-relaxed text-slate-500">Vollständige Zeit = abgeschlossener Eintrag ohne Import. Wiederkehr = weitere abgeschlossene Erfassung an Tag 8–14 nach dem ersten Erfassungstag; erst nach Ende dieses Fensters bewertet. Berichte werden seit Einführung dieser Messung erfasst, Checkout-Aktionen innerhalb der gespeicherten Diagnosehistorie. Ein erzeugter Bericht belegt keinen Download. Zahlungen stammen ausschließlich aus bestätigten, positiven Live-Rechnungen von Stripe; keine Testzahlungen oder Nullrechnungen. Bereits erstattete oder gekündigte Abos können enthalten sein.</p>
    <h3 className="mt-6 text-sm font-semibold">Geplante Teamgröße</h3>
    <div className="mt-2 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="border-b p-2">Angabe</th><th className="border-b p-2">Firmen</th><th className="border-b p-2">Mit vollständiger Zeit</th></tr></thead>
      <tbody>{a.teamSizes.map(row => <tr key={row.size ?? "unknown"}><td className="border-b border-slate-100 p-2">{row.size ? TEAM_SIZE_LABELS[row.size] : "Noch offen / nicht angegeben"}</td><td className="border-b border-slate-100 p-2">{row.companies}</td><td className="border-b border-slate-100 p-2">{row.active}</td></tr>)}</tbody></table></div>
    <p className="mt-2 text-xs text-slate-500">Freiwillige Selbstauskunft. Unabhängig von aktuell angelegten Konten und gebuchtem Tarif.</p>
  </section>;
}
