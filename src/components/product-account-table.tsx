"use client";
import { useState } from "react";
import { formatDateTimeDE } from "@/config/client/date-utils";
import { productActionLabels } from "@/config/client/product-action-labels";
import type { AccountOverview } from "@/types/product-analytics";

const statuses: Record<AccountOverview["status"], string> = {
  active: "Aktiv", invited: "Eingeladen", blocked: "Gesperrt",
  deactivated: "Deaktiviert", missing: "Ohne Anmeldekonto",
};
const roles: Record<string, string> = { admin: "Admin", manager: "Führungskraft", employee: "Mitarbeiter" };
const timestamp = (at: string | null) => at ? `${formatDateTimeDE(at)} Uhr` : "Noch nicht erfasst";

export function ProductAccountTable({ accounts }: { accounts: AccountOverview[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const query = search.trim().toLocaleLowerCase("de-DE");
  const filtered = accounts.filter(a => [a.name, a.email ?? "", a.company].some(v => v.toLocaleLowerCase("de-DE").includes(query))
    && (status === "all" || a.status === status));
  const pageSize = 25;
  const current = Math.min(page, Math.max(0, Math.ceil(filtered.length / pageSize) - 1));
  const rows = filtered.slice(current * pageSize, (current + 1) * pageSize);
  return <div data-testid="product-account-table">
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <label className="min-w-0 text-sm">Konto oder Firma suchen<input type="search" className="mt-1 block w-full border px-3 py-2" placeholder="Name, E-Mail oder Firma" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} /></label>
      <label className="text-sm">Kontostatus<select className="mt-1 block border bg-white px-3 py-2" value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}>
        <option value="all">Alle Konten</option>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></label>
    </div>
    <div className="max-h-[32rem] overflow-auto" tabIndex={0} aria-label="Kontoaktivität, horizontal scrollbar">
      <table className="w-full text-left text-sm"><thead className="sticky top-0 bg-white"><tr>
        {["Konto", "Firma", "Rolle / Status", "Zuletzt angemeldet", "Zuletzt aktiv", "Letzte erfasste Aktion"].map(h => <th key={h} className="whitespace-nowrap border-b p-2 font-semibold">{h}</th>)}
      </tr></thead><tbody>
        {rows.map(a => <tr key={a.id} className="border-b border-slate-100">
          <td className="min-w-48 p-2 align-top"><span className="font-medium">{a.name || a.email || "Unbenanntes Konto"}</span>{a.email && <span className="block text-slate-500">{a.email}</span>}</td>
          <td className="min-w-40 p-2 align-top">{a.company}</td>
          <td className="whitespace-nowrap p-2 align-top">{roles[a.role] ?? a.role}<span className="block text-slate-500">{statuses[a.status]}</span></td>
          <td className="whitespace-nowrap p-2 align-top">{timestamp(a.lastSignInAt)}</td>
          <td className="whitespace-nowrap p-2 align-top">{timestamp(a.lastActiveAt)}</td>
          <td className="whitespace-nowrap p-2 align-top">{a.lastAction && a.lastActionAt ? <>{productActionLabels[a.lastAction]}<span className="block text-slate-500">{timestamp(a.lastActionAt)}</span></> : "Noch nicht erfasst"}</td>
        </tr>)}
        {rows.length === 0 && <tr><td colSpan={6} className="p-4 text-slate-500">Keine passenden Konten.</td></tr>}
      </tbody></table>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
      <span>{filtered.length} von {accounts.length} Konten mit Mitarbeiterprofil</span>
      {filtered.length > pageSize && <><button type="button" className="border px-3 py-1 disabled:opacity-40" disabled={current === 0} onClick={() => setPage(current - 1)}>Zurück</button><span>Seite {current + 1} / {Math.ceil(filtered.length / pageSize)}</span><button type="button" className="border px-3 py-1 disabled:opacity-40" disabled={(current + 1) * pageSize >= filtered.length} onClick={() => setPage(current + 1)}>Weiter</button></>}
    </div>
    <p className="mt-3 text-xs text-slate-500">Neueste Aktivität zuerst. Aktivität wird ab Einführung dieser Messung beim Öffnen und Bedienen der App erfasst, höchstens einmal pro Minute, sowie bei erfolgreichen erfassten Aktionen. Ein unbenutzter Tab hält den Zeitpunkt nicht aktuell. Fehlende Messwerte belegen keine Inaktivität. Zeitangaben: Deutschland.</p>
    <p className="mt-2 text-xs text-slate-500">Erfasste Aktionen: Stempeln, Pausen, Browser-Erweiterung, Import / Vorschau, Einladungen und Einrichtung. Frühere Anmeldungen bleiben getrennt sichtbar; frühere App-Nutzung lässt sich nicht nachträglich ermitteln.</p>
  </div>;
}
