"use client";

import { ChevronDown } from "lucide-react";
import type { TimeImportState } from "@/hooks/use-time-import";
import { importFields, type ImportField } from "@/types/time-import";

export const importSelectClass = "h-10 w-full min-w-0 cursor-pointer rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default";
const fieldLabels: Record<ImportField, string> = {
  employee: "Mitarbeiter", date: "Startdatum", start: "Beginn", endDate: "Enddatum", end: "Ende",
  duration: "Arbeitsdauer", break: "Pause", notes: "Beschreibung", project: "Projekt als Notiz",
};
const dateLabels = { "YYYY-MM-DD": "Jahr-Monat-Tag", "DD.MM.YYYY": "Tag.Monat.Jahr", "DD/MM/YYYY": "Tag/Monat/Jahr", "MM/DD/YYYY": "Monat/Tag/Jahr" };

export function TimeImportSettings({ state }: { state: TimeImportState }) {
  const { columns, rows, settingsOpen } = state;
  const mapped = (Object.keys(columns) as ImportField[]).filter((field) => columns[field] !== undefined);
  const ignored = Math.max(0, (rows[0]?.length ?? 0) - new Set(mapped.map((field) => columns[field])).size);
  return (
    <div className="rounded-md border">
      <div className="space-y-2 p-4 text-sm">
        <p className="font-medium">Angaben aus deiner Datei</p>
        {mapped.length > 0 && <p className="text-muted-foreground">Übernommen: {mapped.map((field) => fieldLabels[field]).join(", ")}.</p>}
        {columns.break === undefined && <p className="text-muted-foreground">Keine Pausenspalte zugeordnet: Es werden 0 Minuten Pause übernommen.</p>}
        {ignored > 0 && <p className="text-xs text-muted-foreground">{ignored} weitere {ignored === 1 ? "Spalte wird" : "Spalten werden"} nicht übernommen.</p>}
        <p className="text-muted-foreground">
          Zeitzone: {state.timezone === "UTC" ? "UTC" : "Deutschland (Europe/Berlin)"}
          {state.dateFormat && <> · Datum: {dateLabels[state.dateFormat]}</>}
        </p>
        {state.missingColumns && <p className="text-destructive">Ordne unten Startdatum, Beginn und Ende oder Arbeitsdauer zu.</p>}
        {state.missingFormats && <p className="text-destructive">Das Dateiformat ist nicht eindeutig. Wähle unten die passende Einstellung.</p>}
        <button type="button" aria-expanded={settingsOpen} aria-controls="time-import-settings" disabled={state.busy}
          className="flex cursor-pointer items-center gap-2 rounded-sm py-1 font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          onClick={() => state.setSettingsOpen(!settingsOpen)}>
          Spalten & Dateiformat anpassen
          <ChevronDown aria-hidden="true" className={`size-4 transition-transform ${settingsOpen ? "rotate-180" : ""}`} />
        </button>
      </div>
      {settingsOpen && <div id="time-import-settings" className="space-y-5 border-t bg-muted/20 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm"><span>Trennzeichen</span>
            <select className={importSelectClass} value={state.delimiter} onChange={(e) => state.changeDelimiter(e.target.value as typeof state.delimiter)}>
              <option value=",">Komma</option><option value=";">Semikolon</option><option value={"\t"}>Tabulator</option>
            </select>
          </label>
          <label className="space-y-2 text-sm"><span>Datumsformat der Datei</span>
            <select className={importSelectClass} value={state.dateFormat} aria-invalid={!state.dateFormat} onChange={(e) => state.changeDateFormat(e.target.value as typeof state.dateFormat)}>
              <option value="">Datumsformat auswählen</option>
              <option value="YYYY-MM-DD">2026-01-12 (Jahr-Monat-Tag)</option>
              <option value="DD.MM.YYYY">12.01.2026 (Tag.Monat.Jahr)</option>
              <option value="DD/MM/YYYY">12/01/2026 (Tag/Monat/Jahr)</option>
              <option value="MM/DD/YYYY">01/12/2026 (Monat/Tag/Jahr)</option>
            </select>
          </label>
          <label className="space-y-2 text-sm"><span>Zeitzone der Datei</span>
            <select className={importSelectClass} value={state.timezone} onChange={(e) => state.changeTimezone(e.target.value as typeof state.timezone)}>
              <option value="Europe/Berlin">Deutschland (Europe/Berlin)</option><option value="UTC">UTC</option>
            </select>
          </label>
          {columns.duration !== undefined && <label className="space-y-2 text-sm"><span>Format der Arbeitsdauer</span>
            <select className={importSelectClass} value={state.durationFormat} aria-invalid={!state.durationFormat} onChange={(e) => state.changeDurationFormat(e.target.value as typeof state.durationFormat)}>
              <option value="">Format der Arbeitsdauer auswählen</option>
              <option value="clock">HH:MM:SS / HH:MM</option><option value="hours">Dezimalstunden (z. B. 1,5)</option><option value="minutes">Minuten (z. B. 90)</option>
            </select>
          </label>}
        </div>
        {rows.length > 0 && <div className="space-y-3">
          <p className="text-sm font-medium">Spalten zuordnen</p>
          <p className="text-xs text-muted-foreground">Benötigt werden Startdatum, Beginn und Ende oder Arbeitsdauer. Alle weiteren Angaben sind optional.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.entries(importFields) as [ImportField, string][]).map(([field, label]) => <div key={field} className="min-w-0 space-y-2 text-sm">
              <label htmlFor={`import-column-${field}`}>{label}</label>
              <select id={`import-column-${field}`} aria-describedby={columns[field] !== undefined ? `import-example-${field}` : undefined}
                className={importSelectClass} value={columns[field] ?? ""} onChange={(e) => state.changeColumn(field, e.target.value === "" ? undefined : Number(e.target.value))}>
                <option value="">Nicht zugeordnet</option>
                {rows[0].map((header, index) => <option key={index} value={index}>{header}</option>)}
              </select>
              {columns[field] !== undefined && <p id={`import-example-${field}`} className="truncate text-xs text-muted-foreground" title={rows[1]?.[columns[field]!]}>
                Beispiel: {rows[1]?.[columns[field]!] || "(leer)"}
              </p>}
            </div>)}
          </div>
        </div>}
      </div>}
    </div>
  );
}
