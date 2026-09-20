"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/providers/supabase-provider";
import { getLocalToday, formatDateFullDE, formatDateTimeDE } from "@/config/client/date-utils";
import type { DatevEmployee, DatevPreview, DatevSettings } from "@/types/datev";
import { datevSettingsSchema } from "@/types/datev";
import { DatevSettingsForm } from "@/components/datev-settings-form";
import { GermanDateInput } from "@/components/german-date-input";
import { Button } from "@/components/ui/button";

interface DatevData { settings: DatevSettings; employees: DatevEmployee[]; preview: DatevPreview }
const endpoint = "/api/v1/reports/datev";

export function DatevExportPanel() {
  const { user } = useSupabase();
  const [month, setMonth] = useState(() => getLocalToday().slice(0, 7));
  const query = useQuery<DatevData>({
    queryKey: ["datev", user?.id, month], enabled: Boolean(user && month), staleTime: 0, retry: false,
    queryFn: async () => {
      const response = await fetch(`${endpoint}?month=${month}`, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Laden fehlgeschlagen.");
      return json.data;
    },
  });
  return <section className="space-y-6 py-4" data-testid="datev-export">
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">In jedem Tarif ohne Aufpreis · Beta</p>
      <h2 className="text-xl font-semibold">DATEV LODAS: Arbeitsstunden exportieren</h2>
      <p className="text-sm text-muted-foreground">Monatliche Netto-Arbeitsstunden je Person und Lohnart. Urlaub, Krankheit, Feiertagsvergütung,
        Zuschläge und Überstundenauszahlung sind nicht enthalten. Die Datei ersetzt keine vollständige Lohnabrechnung.</p>
      <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">Beta: Ein Testimport in DATEV steht noch aus.
        Zuerst mit einem Testbestand im Lohnbüro prüfen. Unterstützt wird LODAS, nicht „Lohn und Gehalt“.</p>
      <Link href="/datev-export-zeiterfassung" className="text-sm underline underline-offset-4">Anleitung und Vorbereitung mit dem Lohnbüro</Link>
    </div>
    <div className="max-w-xs space-y-1">
      <label htmlFor="datev-month" className="text-sm font-medium">Abrechnungsmonat – Datum auswählen</label>
      <GermanDateInput id="datev-month" value={month ? `${month}-01` : ""} onChange={date => setMonth(date.slice(0, 7))} />
      <p className="text-xs text-muted-foreground">Ausgewertet wird der gesamte gewählte Kalendermonat.</p>
    </div>
    {query.isPending && month && <p>DATEV-Daten werden geladen …</p>}
    {query.error && <div role="alert" className="space-y-2 text-sm text-red-700"><p>{query.error.message}</p>
      <Button variant="outline" onClick={() => void query.refetch()}>Erneut laden</Button></div>}
    {query.data && !query.error && month && <DatevEditor key={`${user?.id}-${month}-${query.data.settings.revision}-${query.data.employees.map(employee => employee.id).join(",")}`}
      data={query.data} refresh={() => query.refetch()} />}
  </section>;
}

function DatevEditor({ data, refresh }: { data: DatevData; refresh: () => Promise<unknown> }) {
  const [settings, setSettings] = useState<DatevSettings>(() => ({ ...data.settings,
    employees: data.employees.map(employee => data.settings.employees.find(e => e.employeeId === employee.id) ?? {
      employeeId: employee.id, mode: "unconfigured", personnelNumber: null, wageType: null,
    }),
  }));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [repeatConfirmation, setRepeatConfirmation] = useState<string | null>(null);
  const preview = data.preview;
  // A changed snapshot/history requires a new explicit confirmation, including after download.
  const confirmationKey = `${preview.fingerprint}-${preview.history.map(h => h.id).join(",")}`;
  const ready = !busy && !dirty && !preview.errors.length && confirmation === confirmationKey
    && (!preview.history.length || repeatConfirmation === confirmationKey);

  async function save() {
    setError(""); setMessage("");
    const parsed = datevSettingsSchema.safeParse(settings);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    setBusy(true);
    try {
      const response = await fetch(endpoint, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      if (!response.ok) throw new Error((await response.json()).error);
      await refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Speichern fehlgeschlagen."); }
    finally { setBusy(false); }
  }
  async function download() {
    if (!ready) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: preview.month, fingerprint: preview.fingerprint, confirmed: true,
          repeatConfirmed: repeatConfirmation === confirmationKey }) });
      if (!response.ok) throw new Error((await response.json()).error);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "quoska-lodas.txt";
      anchor.click(); URL.revokeObjectURL(url);
      setConfirmation(null); setRepeatConfirmation(null);
      setMessage("Datei erstellt. Es wurden keine Daten an DATEV übertragen und keine Zeiten gesperrt.");
      await refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Download fehlgeschlagen."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-6">
    <DatevSettingsForm settings={settings} employees={data.employees} busy={busy} onSave={() => void save()}
      onChange={value => { setSettings(value); setDirty(true); setConfirmation(null); setMessage(""); }} />
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="text-sm text-green-800">{message}</p>}
    <div className="space-y-4 border-t pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">2. Monatsvorschau ab {formatDateFullDE(`${preview.month}-01`)}</h3>
        <Button variant="outline" disabled={busy || dirty} onClick={() => {
          setConfirmation(null); setRepeatConfirmation(null); void refresh();
        }}>Vorschau aktualisieren</Button>
      </div>
      {dirty ? <p role="status">Bitte die geänderte Zuordnung zuerst speichern.</p> : <>
        {!!preview.errors.length && <ul role="alert" className="list-disc space-y-1 rounded border border-red-200 bg-red-50 p-4 pl-8 text-sm text-red-800">
          {preview.errors.map(error => <li key={error}>{error}</li>)}
        </ul>}
        {!!preview.warnings.length && <ul className="list-disc space-y-1 rounded border border-amber-200 p-4 pl-8 text-sm">
          {preview.warnings.map(warning => <li key={warning}>{warning}</li>)}
        </ul>}
        <div className="space-y-2">
          {preview.rows.map(row => <div key={row.employeeId} className="flex flex-wrap justify-between gap-2 rounded border p-3 text-sm">
            <div><p className="font-medium">{row.name}</p><p>Personalnummer {row.personnelNumber} · Lohnart {row.wageType}</p></div>
            <div><p className="font-semibold tabular-nums">{row.hours} Stunden</p><p>{row.entries} Einträge</p></div>
          </div>)}
        </div>
        <p className="text-xs text-muted-foreground">Pausen werden einmal abgezogen. Die Monatssumme wird je Person einmal auf zwei Dezimalstellen gerundet.
          Fehlende Arbeitstage werden nicht automatisch ergänzt. Der Export ist kein Monatsabschluss.</p>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" disabled={busy || !!preview.errors.length}
          checked={confirmation === confirmationKey} onChange={e => setConfirmation(e.target.checked ? confirmationKey : null)} />
          Ich habe Vollständigkeit, Personalnummern und Lohnarten geprüft. Die Stunden sollen als Stundenbuchungen (Schlüssel 01) übernommen werden.</label>
        {!!preview.history.length && <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" disabled={busy}
          checked={repeatConfirmation === confirmationKey} onChange={e => setRepeatConfirmation(e.target.checked ? confirmationKey : null)} />
          Ich benötige die Datei erneut und kläre mit dem Lohnbüro, wie eine doppelte Buchung vermieden wird.</label>}
        <Button disabled={!ready} onClick={() => void download()}>{busy ? "Wird vorbereitet …" : "LODAS-Datei herunterladen"}</Button>
        {!!preview.history.length && <div className="space-y-1 text-xs text-muted-foreground"><p>Zuletzt erstellte Dateistände (keine Importbestätigung):</p>
          {preview.history.map(item => <p key={item.id}>{formatDateTimeDE(item.created_at)} · {item.id.slice(0, 8)}</p>)}
        </div>}
      </>}
    </div>
  </div>;
}
