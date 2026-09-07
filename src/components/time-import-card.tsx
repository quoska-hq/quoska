"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Employee } from "@/types/database";
import type { ApiResponse } from "@/types/api";
import { importFields, MAX_IMPORT_BYTES, type ImportColumns, type ImportField, type TimeImportInput, type TimeImportResult } from "@/types/time-import";
import { detectTimeImportDelimiter, readTimeImportCsv, suggestTimeImportColumns } from "@/services/timeImportCsvService";
import { TimeImportPreview } from "@/components/time-import-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { legalInfo } from "@/lib/site";

const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const supportMailto = `mailto:${legalInfo.email}?subject=${encodeURIComponent("Hilfe beim Import meiner Arbeitszeiten")}&body=${encodeURIComponent(
  "Hallo Quoska-Team,\n\nich brauche Hilfe beim Import meiner bisherigen Arbeitszeiten.\n\nBisheriges Zeiterfassungssystem:\nZeitraum der Daten:\nWas funktioniert nicht?\nDownload-Link (falls vorhanden):\n\nMeinen Export kann ich alternativ als Datei an diese E-Mail anhängen.\n",
)}`;

export function TimeImportCard() {
  const queryClient = useQueryClient();
  const [csv, setCsv] = useState("");
  const [delimiter, setDelimiter] = useState<TimeImportInput["delimiter"]>(",");
  const [columns, setColumns] = useState<ImportColumns>({});
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [dateFormat, setDateFormat] = useState<TimeImportInput["dateFormat"]>("YYYY-MM-DD");
  const [timezone, setTimezone] = useState<TimeImportInput["timezone"]>("Europe/Berlin");
  const [durationFormat, setDurationFormat] = useState<TimeImportInput["durationFormat"]>("clock");
  const [result, setResult] = useState<TimeImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const employees = useQuery({
    queryKey: ["import-employees"],
    queryFn: async () => {
      const response = await fetch("/api/v1/employees");
      const json: ApiResponse<{ active: Employee[] }> = await response.json();
      if (!response.ok || !json.data) throw new Error(json.error ?? "Mitarbeiter konnten nicht geladen werden.");
      return json.data.active;
    },
  });
  const parsed = useMemo(() => {
    if (!csv) return { rows: [], error: null };
    try { return { rows: readTimeImportCsv(csv, delimiter), error: null }; }
    catch (err) { return { rows: [], error: err instanceof Error ? err.message : "Ungültige CSV-Datei." }; }
  }, [csv, delimiter]);
  const sources = useMemo(() => columns.employee === undefined ? [""]
    : [...new Set(parsed.rows.slice(1).map((row) => row[columns.employee!] ?? ""))], [columns.employee, parsed.rows]);
  const suggestedEmployee = (source: string) => {
    if (Object.hasOwn(assignments, source)) return assignments[source];
    const matches = employees.data?.filter((employee) => employee.email.toLowerCase() === source.toLowerCase()) ?? [];
    return matches.length === 1 ? matches[0].id : "";
  };
  const resetPreview = () => { setResult(null); setCompleted(false); setError(null); };

  async function upload(file: File | undefined) {
    resetPreview();
    setCsv("");
    setAssignments({});
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) { setError("Die Datei darf höchstens 2 MB groß sein."); return; }
    setBusy(true);
    try {
      const content = await file.text();
      const detected = detectTimeImportDelimiter(content);
      const rows = readTimeImportCsv(content, detected);
      setDelimiter(detected);
      setColumns(suggestTimeImportColumns(rows[0]));
      setCsv(content);
    } catch (err) { setError(err instanceof Error ? err.message : "Datei konnte nicht gelesen werden."); }
    finally { setBusy(false); }
  }

  async function submit(mode: TimeImportInput["mode"]) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/time-entries/import", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, delimiter, columns, dateFormat, timezone, durationFormat, mode,
          employees: sources.filter((source) => suggestedEmployee(source)).map((source) => ({ source, employeeId: suggestedEmployee(source) })),
        }),
      });
      const json: ApiResponse<TimeImportResult> = await response.json();
      if (!response.ok || !json.data) throw new Error(json.error ?? "Import fehlgeschlagen.");
      setResult(json.data);
      if (mode === "import" && json.data.errorCount === 0) {
        setCompleted(true);
        await queryClient.invalidateQueries();
      }
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Netzwerkfehler. Bitte prüfe die Datei erneut; bereits importierte Einträge werden übersprungen.");
    } finally { setBusy(false); }
  }

  return (
    <Card id="zeitimport">
      <CardHeader><CardTitle>Vergangene Arbeitszeiten importieren</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Übernimm einzelne Zeiteinträge aus einem CSV-Detailbericht, etwa von Clockify oder Toggl Track.
          Exportiere Datum, Beginn und Ende oder Arbeitsdauer mit ungerundeten Zeiten. Bis zu 2.000 Einträge und 2 MB pro Datei.
        </p>
        <p className="text-sm text-muted-foreground">
          Pausen werden unverändert übernommen; ohne Pausenspalte sind es 0 Minuten. Projekte werden als Notiz übernommen.
          Weitere Spalten wie Kunden, Tags und Abrechnungsdaten werden nicht übernommen. Tagessummen ohne Beginn reichen nicht aus.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <a className="underline" href="/examples/arbeitszeiten-import.csv" download>CSV-Vorlage herunterladen</a>
          <a className="underline" href="https://clockify.me/help/reports/exporting-reports" target="_blank" rel="noreferrer">Export bei Clockify</a>
          <a className="underline" href="https://support.toggl.com/en-us/article/detailed-report-k9bzy2/" target="_blank" rel="noreferrer">Export bei Toggl</a>
        </div>
        <fieldset disabled={busy} className="space-y-5 disabled:opacity-60">
          <label className="block space-y-2 text-sm font-medium">
            <span>CSV-Datei auswählen</span>
            <Input type="file" accept=".csv,text/csv" onChange={(event) => void upload(event.target.files?.[0])} />
          </label>
          {csv && <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="space-y-2 text-sm"><span>Trennzeichen</span>
                <select className={selectClass} value={delimiter} onChange={(e) => { setDelimiter(e.target.value as typeof delimiter); setColumns({}); setAssignments({}); resetPreview(); }}>
                  <option value=",">Komma</option><option value=";">Semikolon</option><option value={"\t"}>Tabulator</option>
                </select>
              </label>
              <label className="space-y-2 text-sm"><span>Datumsformat der Datei</span>
                <select className={selectClass} value={dateFormat} onChange={(e) => { setDateFormat(e.target.value as typeof dateFormat); resetPreview(); }}>
                  {["YYYY-MM-DD", "DD.MM.YYYY", "DD/MM/YYYY", "MM/DD/YYYY"].map((format) => <option key={format}>{format}</option>)}
                </select>
              </label>
              <label className="space-y-2 text-sm"><span>Zeitzone der Datei</span>
                <select className={selectClass} value={timezone} onChange={(e) => { setTimezone(e.target.value as typeof timezone); resetPreview(); }}>
                  <option value="Europe/Berlin">Deutschland (Europe/Berlin)</option><option value="UTC">UTC</option>
                </select>
              </label>
              <label className="space-y-2 text-sm"><span>Format der Arbeitsdauer</span>
                <select className={selectClass} value={durationFormat} onChange={(e) => { setDurationFormat(e.target.value as typeof durationFormat); resetPreview(); }}>
                  <option value="clock">HH:MM:SS / HH:MM</option><option value="hours">Dezimalstunden (z. B. 1,5)</option><option value="minutes">Minuten (z. B. 90)</option>
                </select>
              </label>
            </div>
            {parsed.rows.length > 0 && <>
              <p className="text-sm font-medium">Spalten zuordnen · {parsed.rows.length - 1} Einträge</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(Object.entries(importFields) as [ImportField, string][]).map(([field, label]) => <label key={field} className="min-w-0 space-y-2 text-sm">
                  <span>{label}</span>
                  <select className={selectClass} value={columns[field] ?? ""} onChange={(e) => {
                    setColumns({ ...columns, [field]: e.target.value === "" ? undefined : Number(e.target.value) });
                    if (field === "employee") setAssignments({});
                    resetPreview();
                  }}>
                    <option value="">Nicht zugeordnet</option>
                    {parsed.rows[0].map((header, index) => <option key={index} value={index}>{header}</option>)}
                  </select>
                  {columns[field] !== undefined && <p className="truncate text-xs text-muted-foreground" title={parsed.rows[1]?.[columns[field]!]}>Beispiel: {parsed.rows[1]?.[columns[field]!] || "(leer)"}</p>}
                </label>)}
              </div>
              <p className="text-sm font-medium">Mitarbeiter in Quoska zuordnen</p>
              <p className="text-xs text-muted-foreground">E-Mail-Adressen werden vorgeschlagen. Prüfe jede Zuordnung. Lege fehlende Mitarbeiter zuerst in der Mitarbeiterverwaltung an.</p>
              <div className="grid max-h-72 gap-3 overflow-auto sm:grid-cols-2">
                {sources.map((source) => <label key={source} className="min-w-0 space-y-2 text-sm">
                  <span className="block break-words">{source || (columns.employee === undefined ? "Alle Zeilen" : "Leere Mitarbeiterangabe")}</span>
                  <select className={selectClass} value={suggestedEmployee(source)} onChange={(e) => { setAssignments({ ...assignments, [source]: e.target.value }); resetPreview(); }}>
                    <option value="">Mitarbeiter auswählen</option>
                    {employees.data?.map((employee) => <option key={employee.id} value={employee.id}>{employee.first_name} {employee.last_name} ({employee.email})</option>)}
                  </select>
                </label>)}
              </div>
            </>}
          </>}
        </fieldset>
        {(error || parsed.error || employees.error) && <p role="alert" className="text-sm text-destructive">{error || parsed.error || employees.error?.message}</p>}
        {csv && !completed && <Button variant="outline" disabled={busy || !!parsed.error || !employees.data} onClick={() => void submit("preview")}>
          {busy ? "Wird geprüft…" : "Import prüfen"}
        </Button>}
        {result && !completed && <TimeImportPreview result={result} />}
        {result && !completed && result.errorCount === 0 && result.readyCount > 0 && <div className="space-y-3">
          <p className="text-sm">Prüfe die Vorschau. Mit dem Import werden die neuen Zeiten für die zugeordneten Mitarbeiter gespeichert und protokolliert.</p>
          <Button disabled={busy} onClick={() => void submit("import")}>{busy ? "Wird importiert…" : `${result.readyCount} Einträge importieren`}</Button>
        </div>}
        {completed && result && <div role="status" className="space-y-2 rounded-md border p-4 text-sm">
          <p>{result.importedCount} Einträge importiert. {result.duplicateCount} Duplikate übersprungen.</p>
          <p>Prüfe für den Überstundensaldo das Startdatum und den Anfangssaldo in der <Link className="underline" href="/app/employees">Mitarbeiterverwaltung</Link>, damit mitgebrachte Überstunden nicht doppelt zählen.</p>
          <Link className="inline-block underline" href="/app/reports">Arbeitszeiten in den Berichten ansehen</Link>
        </div>}
        <div className="space-y-2 rounded-md bg-muted/50 p-4 text-sm">
          <p className="font-medium">Import klappt nicht?</p>
          <p className="text-muted-foreground">
            Wir helfen dir und können deine Arbeitszeiten auch manuell übernehmen.
            Schicke uns deinen Export als E-Mail-Anhang oder einen Download-Link.
            Schreib kurz dazu, aus welchem System die Daten stammen und was nicht funktioniert.
          </p>
          <a className="inline-block font-medium underline underline-offset-4" href={supportMailto}>
            {legalInfo.email}
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
