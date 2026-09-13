"use client";
import { formatDateFullDE } from "@/config/client/date-utils";
import { useState } from "react";
import type { TenantOverview } from "@/types/product-analytics";

export function ProductTenantTable({ tenants }: { tenants: TenantOverview[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const filtered = tenants.filter(t => t.name.toLocaleLowerCase("de-DE").includes(search.toLocaleLowerCase("de-DE"))
    && (filter === "all" || (filter === "active" && t.daysThisWeek > 0)
      || (filter === "no_use" && !t.firstUse) || (filter === "stale" && t.stale > 0)));
  const pageSize = 25;
  const current = Math.min(page, Math.max(0, Math.ceil(filtered.length / pageSize) - 1));
  const rows = filtered.slice(current * pageSize, (current + 1) * pageSize);
  return <div>
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <label className="text-sm">Firma suchen<input className="mt-1 block w-full border px-3 py-2" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} /></label>
      <label className="text-sm">Nutzung<select className="mt-1 block border bg-white px-3 py-2" value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }}>
        <option value="all">Alle Firmen</option><option value="active">Diese Woche aktiv</option><option value="no_use">Noch kein Eintrag / Import</option><option value="stale">Alte offene Einträge</option>
      </select></label>
    </div>
    <div className="max-h-[32rem] overflow-auto" tabIndex={0} aria-label="Firmennutzung, horizontal scrollbar">
      <table className="w-full text-left text-sm"><thead className="sticky top-0 bg-white"><tr>{["Firma", "Seit", "Konten", "Tarif", "Live / manuell", "Import", "Erster Eintrag", "Zuletzt aktiv", "Tage diese / letzte Woche"].map(h => <th key={h} className="whitespace-nowrap border-b p-2 font-semibold">{h}</th>)}</tr></thead>
        <tbody>{rows.map((t,index) => <tr key={t.name + t.created + index} className="border-b border-slate-100">
          {[t.name,formatDateFullDE(t.created),`${t.accounts}${t.pending ? ` + ${t.pending} eingeladen` : ""}`,t.plan,t.entries,t.imports,t.firstUse ? formatDateFullDE(t.firstUse) : "—",t.lastUse ? formatDateFullDE(t.lastUse) : "—",`${t.daysThisWeek} / ${t.daysPreviousWeek}`].map((value,i) => <td key={i} className={`p-2 align-top ${i === 0 ? "min-w-44" : "whitespace-nowrap"}`}>{value}</td>)}
        </tr>)}{rows.length === 0 && <tr><td colSpan={9} className="p-4 text-slate-500">Keine passenden Firmen.</td></tr>}</tbody>
      </table>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
      <span>{filtered.length} von {tenants.length} Firmen</span>
      {filtered.length > pageSize && <><button type="button" className="border px-3 py-1 disabled:opacity-40" disabled={current === 0} onClick={() => setPage(current - 1)}>Zurück</button><span>Seite {current + 1} / {Math.ceil(filtered.length / pageSize)}</span><button type="button" className="border px-3 py-1 disabled:opacity-40" disabled={(current + 1) * pageSize >= filtered.length} onClick={() => setPage(current + 1)}>Weiter</button></>}
    </div>
  </div>;
}
