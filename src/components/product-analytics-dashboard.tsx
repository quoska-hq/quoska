import Link from "next/link";
import type { ReactNode } from "react";
import type { ProductOverview } from "@/types/product-analytics";
import { ProductTenantTable } from "@/components/product-tenant-table";
import { PageHeader } from "@/components/page-header";

const names: Record<string,string> = { clock_in: "Einstempeln", clock_out: "Ausstempeln", clock_pause: "Pause starten", clock_resume: "Pause beenden", extension_clock: "Browser-Erweiterung", import: "Import / Vorschau", invite: "Einladung", register: "Firma anlegen", setup: "Einrichtung", setup_complete: "Einrichtung abschließen", app_open: "App geöffnet", browser_login: "Anmeldung (Browsermeldung)", browser_signup: "Registrierung (Browsermeldung)" };
const outcomes: Record<string,string> = { ok: "Erfolgreich", invalid: "Eingabe abgelehnt", denied: "Zugriff abgelehnt", conflict: "Konflikt", limited: "Begrenzt", error: "Serverfehler", rejected: "Abgelehnt", network: "Verbindungs-/Browserfehler" };
export function ProductAnalyticsDashboard({ summary: s, history, operations }: {
  summary: ProductOverview;
  history: { day: string; companies: number; usableAccounts: number }[];
  operations: { at: string; data: string } | null;
}) {
  const groups = new Map<string,{ action: string; outcome: string; count: number; firms: Set<string> }>();
  for (const row of s.actions.filter(a => a.day >= s.previousWeekStart)) {
    const key = row.action + ":" + row.outcome;
    const group = groups.get(key) ?? { action: row.action, outcome: row.outcome, count: 0, firms: new Set<string>() };
    group.count += row.count;
    if (row.tenantKey) group.firms.add(row.tenantKey);
    groups.set(key, group);
  }
  const issues = s.tenants.filter(t => t.stale > 0);
  return <div className="space-y-6" data-testid="product-analytics-dashboard">
    <PageHeader title="Produktübersicht" description={`Stand ${s.at.replace("T", " ").slice(0,16)} UTC · Produkt-Tage: Europe/Berlin · interne Firmen ausgeschlossen`}
      actions={<div className="flex flex-wrap gap-3 text-sm underline"><Link href="/app/product-analytics">Aktualisieren</Link><a href="/api/v1/product-analytics" download="produktbericht.json">Bericht herunterladen</a><Link href="/app/site-analytics">Website-Analytics</Link></div>} />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Firmen" value={s.totals.companies} note={`${s.weeks[0].companies} heute neu`} />
      <Metric label="Nutzbare Konten" value={s.totals.usableAccounts} note={`${s.totals.invitations} offene Einladungen · ${s.totals.blocked} gesperrt`} />
      <Metric label="Erste Zeiterfassung / Import" value={s.totals.activated} note={`von ${s.totals.companies} Firmen`} />
      <Metric label="Firmen im Bezahlplan" value={s.totals.paidPlans} note="Tarifstatus; kein Nachweis einer Zahlung" />
    </div>
    <Section title="Was Aufmerksamkeit braucht">
      <p>{s.totals.incompleteSignups} Konten ohne Firmeneinrichtung · {s.totals.stale} seit mehr als 24 Stunden offene Zeiterfassungen.</p>
      {issues.map(t => <p key={t.name} className="mt-2 text-amber-800">{t.name}: {t.stale} alte offene Einträge. Zeiten prüfen und über die vorhandene Korrektur bearbeiten.</p>)}
      <p className="mt-2 text-sm text-slate-500">Fehlende Nutzung ist kein nachgewiesener Fehler. Ein Import zählt als Einrichtungserfolg; regelmäßige Nutzung wird separat ausgewertet.</p>
    </Section>
    <Section title="Nutzung im Wochenvergleich">
      <Table headers={["Zeitraum", "Neue Firmen", "Aktive Firmen", "Live-Einträge", "Manuell", "Importierte Zeilen", "Einrichtung¹", "App-Aufruf²"]}
        rows={s.weeks.map(w => [w.label, w.companies, w.active, w.clock, w.manual, w.imports, w.setup, w.app])} />
      <p className="mt-3 text-xs text-slate-500">Aktiv = Einrichtung, angelegte Zeiteinträge, erfolgreiche gemessene Aktionen oder App-Aufruf. ¹ Firmen mit neuen Profilen/Projekten. ² Erst ab Einführung dieser Messung, soweit der Browser meldet. Wochen: Montag–Sonntag. Unvollständige Zeiträume nicht direkt mit ganzen Wochen vergleichen.</p>
    </Section>
    <Section title="Registrierung und Aktivierung · letzte 30 Tage">
      <div className="grid gap-3 sm:grid-cols-5">{[
        ["Neue Konten", s.registration.accounts], ["E-Mail bestätigt", s.registration.confirmed],
        ["Firmen angelegt", s.registration.companies], ["Einrichtung fertig", s.registration.setup],
        ["Erster Eintrag / Import", s.registration.activated],
      ].map(([label,value]) => <Metric key={label} label={String(label)} value={Number(value)} />)}</div>
      <p className="mt-3 text-xs text-slate-500">Aus gespeicherten Konten und Firmen; unabhängig von Marketing-Klicks. Konten und Firmen sind unterschiedliche Einheiten. Eingeladene Mitarbeiter werden nicht als neue Firmengründer gezählt. Der Zeitraum bezieht sich auf die Registrierung, spätere Schritte zeigen den heutigen Stand.</p>
    </Section>
    <Section title="Kommen neue Firmen in der Folgewoche zurück?">
      <Table headers={["Registrierungswoche ab", "Firmen", "Erste Zeiterfassung / Import bis heute", "Aktiv in der Folgewoche"]}
        rows={s.cohorts.map(c => [c.week, c.companies, c.activated, c.returned === null ? "Noch nicht vollständig beobachtbar" : `${c.returned} / ${c.companies} (${Math.round(c.returned / c.companies * 100)} %)`])} />
      <p className="mt-3 text-xs text-slate-500">Folgewoche = nächste vollständige Kalenderwoche. Historische Aktivität ist aus Datenänderungen rekonstruiert; reine App-Aufrufe stehen erst ab Messbeginn zur Verfügung.</p>
    </Section>
    <Section title="Firmen und Nutzung">
      <ProductTenantTable tenants={s.tenants} />
    </Section>
    <Section title="Aktionen und Fehler · seit Beginn der Vorwoche">
      <Table headers={["Aktion", "Ergebnis", "Anzahl", "Zugeordnete Firmen"]} rows={[...groups.values()].sort((a,b) => Number(a.outcome === "ok") - Number(b.outcome === "ok") || b.count - a.count)
        .map(g => [names[g.action] ?? g.action, outcomes[g.outcome] ?? g.outcome, g.count, g.firms.size || "Nicht zugeordnet"])} />
      <p className="mt-3 text-xs text-slate-500">Messung ab Bereitstellung; leere Werte bedeuten keine erfassten Ereignisse. Browsermeldungen sind unbestätigte Hinweise. Eingabe- und Zugriffsablehnungen sind nicht automatisch Programmfehler. App-Aufrufe sind auf eine Meldung pro Firma und Tag begrenzt.</p>
    </Section>
    <Section title="Tägliche Bestandsaufnahmen">
      <Table headers={["Datum", "Firmen", "Nutzbare Konten"]} rows={history.map(h => [h.day,h.companies,h.usableAccounts])} />
      <p className="mt-3 text-xs text-slate-500">Automatisch täglich gespeichert. Vor dem ersten Lauf ist noch keine Verlaufshistorie vorhanden.</p>
    </Section>
    <Operations value={operations} now={s.at} />
  </div>;
}
function Metric({label,value,note}:{label:string;value:number;note?:string}) {
  return <div className="border border-slate-900/15 bg-white p-4"><p className="text-sm text-slate-600">{label}</p><p className="mt-2 font-mono text-3xl font-semibold">{value.toLocaleString("de-DE")}</p>{note && <p className="mt-2 text-xs text-slate-500">{note}</p>}</div>;
}
function Section({title,children}:{title:string;children:ReactNode}) {
  return <section className="min-w-0 border border-slate-900/15 bg-white p-4 sm:p-6"><h2 className="mb-4 text-lg font-semibold">{title}</h2>{children}</section>;
}
function Table({headers,rows}:{headers:string[];rows:ReactNode[][]}) {
  return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{headers.map(h => <th key={h} className="whitespace-nowrap border-b p-2 font-semibold">{h}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row,i) => <tr key={i} className="border-b border-slate-100">{row.map((v,j) => <td key={j} className="p-2 align-top">{v}</td>)}</tr>) : <tr><td colSpan={headers.length} className="p-4 text-slate-500">Noch keine Daten erfasst.</td></tr>}</tbody></table></div>;
}
function Operations({value,now}:{value:{at:string;data:string}|null;now:string}) {
  let rows: { label: string; value: string }[] = [];
  try {
    const parsed: unknown = JSON.parse(value?.data ?? "[]");
    if (Array.isArray(parsed)) rows = parsed.filter((r): r is {label:string;value:string} => typeof r?.label === "string" && typeof r?.value === "string").slice(0,30);
  } catch { /* Treat unavailable operational evidence as unknown. */ }
  const old = !value || Date.parse(now) - Date.parse(value.at) > 2 * 3600000;
  return <Section title="Support und Betrieb"><p className={`mb-3 text-sm ${old ? "text-amber-800" : "text-slate-500"}`}>{old ? "Betriebsstatus fehlt oder ist älter als zwei Stunden." : `Stand ${value!.at.replace("T"," ").slice(0,16)} UTC`}</p><Table headers={["Prüfung","Ergebnis"]} rows={rows.map(r => [r.label,r.value])} /></Section>;
}
