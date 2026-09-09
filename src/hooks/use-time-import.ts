"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Employee } from "@/types/database";
import type { ApiResponse } from "@/types/api";
import { MAX_IMPORT_BYTES, type ImportColumns, type ImportField, type TimeImportInput, type TimeImportResult } from "@/types/time-import";
import { suggestTimeImportFormats } from "@/services/timeImportFormatService";
import { detectTimeImportDelimiter, readTimeImportCsv, suggestTimeImportColumns } from "@/services/timeImportCsvService";

export function useTimeImport() {
  const queryClient = useQueryClient();
  const [csv, setCsv] = useState("");
  const [filename, setFilename] = useState("");
  const [delimiter, setDelimiter] = useState<TimeImportInput["delimiter"]>(",");
  const [columns, setColumns] = useState<ImportColumns>({});
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [dateFormat, setDateFormat] = useState<TimeImportInput["dateFormat"] | "">("");
  const [timezone, setTimezone] = useState<TimeImportInput["timezone"]>("Europe/Berlin");
  const [durationFormat, setDurationFormat] = useState<TimeImportInput["durationFormat"] | "">("clock");
  const [result, setResult] = useState<TimeImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [editing, setEditing] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
  const missingColumns = columns.date === undefined || columns.start === undefined || (columns.end === undefined && columns.duration === undefined);
  const missingFormats = !dateFormat || !durationFormat;
  const missingEmployees = sources.some((source) => !suggestedEmployee(source));
  const canPreview = !!csv && !parsed.error && !!employees.data && !missingColumns && !missingFormats && !missingEmployees;
  const resetPreview = () => { setResult(null); setCompleted(false); setError(null); setEditing(true); };

  function changeColumn(field: ImportField, index: number | undefined) {
    const next = { ...columns, [field]: index };
    setColumns(next);
    if (field === "employee") setAssignments({});
    const formats = suggestTimeImportFormats(parsed.rows, next);
    if (field === "date" || field === "endDate") setDateFormat(formats.dateFormat);
    if (field === "duration") setDurationFormat(formats.durationFormat);
    resetPreview();
  }

  function changeDelimiter(value: TimeImportInput["delimiter"]) {
    setDelimiter(value);
    setAssignments({});
    resetPreview();
    try {
      const rows = readTimeImportCsv(csv, value);
      const next = suggestTimeImportColumns(rows[0]);
      const formats = suggestTimeImportFormats(rows, next);
      setColumns(next); setDateFormat(formats.dateFormat); setDurationFormat(formats.durationFormat);
    } catch { setColumns({}); }
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    resetPreview(); setCsv(""); setFilename(""); setAssignments({}); setSettingsOpen(false);
    if (/\.(xlsx?|ods)$/i.test(file.name)) {
      setError("Excel-Dateien lassen sich hier nicht direkt hochladen. Speichere einzelne Zeiteinträge als CSV UTF-8 oder schicke uns die Excel-Datei über die Importhilfe unten.");
      return;
    }
    if (file.size > MAX_IMPORT_BYTES) { setError("Die Datei darf höchstens 2 MB groß sein."); return; }
    setBusy(true);
    try {
      const content = await file.text();
      const detected = detectTimeImportDelimiter(content);
      const rows = readTimeImportCsv(content, detected);
      const next = suggestTimeImportColumns(rows[0]);
      const formats = suggestTimeImportFormats(rows, next);
      setDelimiter(detected); setColumns(next); setCsv(content); setFilename(file.name);
      setDateFormat(formats.dateFormat); setDurationFormat(formats.durationFormat); setTimezone("Europe/Berlin");
      setSettingsOpen(!formats.dateFormat || !formats.durationFormat || next.date === undefined || next.start === undefined || (next.end === undefined && next.duration === undefined));
    } catch (err) { setError(err instanceof Error ? err.message : "Datei konnte nicht gelesen werden."); }
    finally { setBusy(false); }
  }

  async function submit(mode: TimeImportInput["mode"]) {
    if (!canPreview || busy || (mode === "import" && (!result || result.errorCount > 0 || result.readyCount === 0))) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/v1/time-entries/import", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, delimiter, columns, dateFormat, timezone, durationFormat, mode,
          employees: sources.map((source) => ({ source, employeeId: suggestedEmployee(source) })),
        }),
      });
      const json: ApiResponse<TimeImportResult> = await response.json();
      if (!response.ok || !json.data) throw new Error(json.error ?? "Import fehlgeschlagen.");
      setResult(json.data); setEditing(false);
      if (mode === "import" && json.data.errorCount === 0) {
        setCompleted(true);
        await queryClient.invalidateQueries();
      }
    } catch (err) {
      setResult(null); setEditing(true);
      setError(err instanceof Error ? err.message : "Netzwerkfehler. Bitte prüfe die Datei erneut; bereits importierte Einträge werden übersprungen.");
    } finally { setBusy(false); }
  }

  return {
    csv, filename, delimiter, columns, dateFormat, timezone, durationFormat, result, busy, completed, editing,
    settingsOpen, setSettingsOpen, employees: employees.data ?? [], employeesLoading: employees.isPending,
    error: error || parsed.error || employees.error?.message, rows: parsed.rows, sources, suggestedEmployee,
    missingColumns, missingFormats, missingEmployees, canPreview, resetPreview, upload, submit, changeColumn, changeDelimiter,
    assignEmployee: (source: string, employeeId: string) => { setAssignments({ ...assignments, [source]: employeeId }); resetPreview(); },
    changeDateFormat: (value: typeof dateFormat) => { setDateFormat(value); resetPreview(); },
    changeTimezone: (value: typeof timezone) => { setTimezone(value); resetPreview(); },
    changeDurationFormat: (value: typeof durationFormat) => { setDurationFormat(value); resetPreview(); },
  };
}

export type TimeImportState = ReturnType<typeof useTimeImport>;
