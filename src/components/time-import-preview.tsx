"use client";

import type { TimeImportResult } from "@/types/time-import";

const formatter = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin", dateStyle: "short", timeStyle: "medium",
});

export function TimeImportPreview({ result }: { result: TimeImportResult }) {
  return (
    <div className="space-y-3" aria-live="polite">
      <p className="text-sm font-medium">
        {result.readyCount} neue Einträge · {result.duplicateCount} Duplikate · {result.errorCount} Fehler
      </p>
      {result.errorCount > 0 && <p className="text-sm text-destructive">Bitte korrigiere die markierten Datensätze und prüfe die Datei erneut. Es wurde nichts importiert.</p>}
      <p className="text-xs text-muted-foreground">Vorschau in deutscher Ortszeit (Europe/Berlin). Datensatznummern zählen die Kopfzeile mit.</p>
      <div className="max-h-96 overflow-auto rounded-md border">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-muted"><tr>
            {["Datensatz", "Mitarbeiter", "Beginn", "Ende", "Pause", "Beschreibung", "Prüfung"].map((label) => <th key={label} className="p-3 font-medium">{label}</th>)}
          </tr></thead>
          <tbody>{result.rows.map((row) => <tr key={row.row} className="border-t align-top">
            <td className="p-3">{row.row}</td>
            <td className="p-3">{row.employee_name ?? "–"}</td>
            <td className="whitespace-nowrap p-3">{row.clock_in ? formatter.format(Date.parse(row.clock_in)) : "–"}</td>
            <td className="whitespace-nowrap p-3">{row.clock_out ? formatter.format(Date.parse(row.clock_out)) : "–"}</td>
            <td className="whitespace-nowrap p-3">{row.break_minutes === undefined ? "–" : `${row.break_minutes} Min`}</td>
            <td className="min-w-40 max-w-64 whitespace-pre-wrap break-words p-3">{row.notes ?? "–"}</td>
            <td className={`min-w-44 p-3 ${row.status === "error" ? "text-destructive" : ""}`}>
              {row.message ?? (row.status === "ready" ? "Bereit" : "Duplikat")}
            </td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
