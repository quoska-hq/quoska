import type { SupabaseClient } from "@supabase/supabase-js";
import type { ImportEntry, ImportField, ImportPreviewRow, TimeImportInput, TimeImportResult } from "@/types/time-import";
import { readTimeImportCsv } from "@/services/timeImportCsvService";
import { addImportSeconds, importDateInBerlin, importWallTimeToIso, parseImportDate } from "@/config/server/import-timestamps";

function durationSeconds(value: string, format: TimeImportInput["durationFormat"]): number {
  if (format === "clock") {
    const match = value.match(/^(\d{1,3}):([0-5]\d)(?::([0-5]\d))?$/);
    if (!match) throw new Error("Dauer muss als HH:MM oder HH:MM:SS angegeben werden.");
    return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] ?? 0);
  }
  if (!/^\d+(?:[.,]\d+)?$/.test(value)) throw new Error("Ungültige Dauer.");
  return Math.round(Number(value.replace(",", ".")) * (format === "hours" ? 3600 : 60));
}

export function parseTimeImport(input: TimeImportInput, nowIso: string): { entries: ImportEntry[]; errors: ImportPreviewRow[] } {
  const [headers, ...rows] = readTimeImportCsv(input.csv, input.delimiter);
  const { columns } = input;
  if (columns.date === undefined || columns.start === undefined || (columns.end === undefined && columns.duration === undefined)) {
    throw new Error("Ordne Startdatum, Beginn und Ende oder Arbeitsdauer zu. Tagessummen ohne Beginn sind nicht importierbar.");
  }
  const indexes = Object.values(columns).filter((i) => i !== undefined);
  if (new Set(indexes).size !== indexes.length || indexes.some((i) => i >= headers.length)) {
    throw new Error("Jede CSV-Spalte darf nur einmal zugeordnet werden.");
  }
  const targets = new Map(input.employees.map((e) => [e.source, e.employeeId]));
  if (targets.size !== input.employees.length) throw new Error("Mitarbeiterzuordnung enthält doppelte Quellen.");
  const entries: ImportEntry[] = [];
  const errors: ImportPreviewRow[] = [];
  rows.forEach((cells, index) => {
    const row = index + 2;
    try {
      if (cells.length !== headers.length) throw new Error("Die Anzahl der Spalten stimmt nicht mit der Kopfzeile überein.");
      const get = (field: ImportField) => columns[field] === undefined ? "" : cells[columns[field]!];
      const employeeId = targets.get(get("employee"));
      if (!employeeId) throw new Error(`Mitarbeiter „${get("employee") || "Alle Zeilen"}“ ist noch nicht zugeordnet.`);
      const date = parseImportDate(get("date"), input.dateFormat);
      const clockIn = importWallTimeToIso(date, get("start"), input.timezone);
      const pause = get("break");
      if (pause && !/^\d+$/.test(pause)) throw new Error("Pause muss in ganzen Minuten angegeben werden.");
      const breakMinutes = Number(pause || 0);
      const duration = get("duration") ? durationSeconds(get("duration"), input.durationFormat) : null;
      let clockOut: string;
      if (get("end")) {
        const endDate = get("endDate") ? parseImportDate(get("endDate"), input.dateFormat) : date;
        clockOut = importWallTimeToIso(endDate, get("end"), input.timezone);
      } else if (duration !== null) {
        clockOut = addImportSeconds(clockIn, duration + breakMinutes * 60);
        if (get("endDate") && parseImportDate(get("endDate"), input.dateFormat) !==
          new Intl.DateTimeFormat("sv-SE", { timeZone: input.timezone }).format(Date.parse(clockOut))) {
          throw new Error("Enddatum und berechnetes Ende stimmen nicht überein.");
        }
      } else throw new Error("Ende oder Arbeitsdauer fehlt.");
      const grossSeconds = (Date.parse(clockOut) - Date.parse(clockIn)) / 1000;
      if (grossSeconds <= 0) throw new Error("Ende muss nach Beginn liegen. Für Nachtschichten das Enddatum zuordnen.");
      if (grossSeconds > 24 * 3600) throw new Error("Ein Eintrag darf höchstens 24 Stunden umfassen.");
      if (breakMinutes * 60 >= grossSeconds) throw new Error("Die Pause muss kürzer als die Anwesenheit sein.");
      if (Date.parse(clockOut) > Date.parse(nowIso)) throw new Error("Nur abgeschlossene Zeiten aus der Vergangenheit können importiert werden.");
      if (duration !== null && Math.abs(grossSeconds - breakMinutes * 60 - duration) > 1) {
        throw new Error("Arbeitsdauer stimmt nicht mit Beginn, Ende und Pause überein. Bitte ungerundete Daten exportieren oder die Dauer-Spalte abwählen.");
      }
      const notes = [get("notes"), get("project") ? `Projekt: ${get("project")}` : ""].filter(Boolean).join("\n") || null;
      if (notes && notes.length > 500) throw new Error("Beschreibung und Projekt dürfen zusammen höchstens 500 Zeichen enthalten.");
      entries.push({ row, employee_id: employeeId, date: importDateInBerlin(clockIn), clock_in: clockIn, clock_out: clockOut, break_minutes: breakMinutes, notes });
    } catch (error) {
      errors.push({ row, status: "error", message: error instanceof Error ? error.message : "Ungültiger Eintrag." });
    }
  });
  return { entries, errors };
}

export async function runTimeImport(
  admin: SupabaseClient, tenantId: string, actorId: string, input: TimeImportInput, nowIso: string,
): Promise<TimeImportResult> {
  const { entries, errors } = parseTimeImport(input, nowIso);
  let result: TimeImportResult = { rows: [], readyCount: 0, duplicateCount: 0, errorCount: 0, importedCount: 0 };
  if (entries.length) {
    const { data, error } = await admin.rpc("import_time_entries", {
      p_tenant_id: tenantId, p_actor_id: actorId, p_rows: entries,
      p_commit: input.mode === "import" && errors.length === 0,
    });
    if (error) {
      console.error("Time import transaction failed:", error.code);
      throw new Error("Importprüfung fehlgeschlagen. Bitte versuche es erneut oder wende dich an die Administration.");
    }
    result = data as TimeImportResult;
  }
  return { ...result, rows: [...result.rows, ...errors].sort((a, b) => a.row - b.row), errorCount: result.errorCount + errors.length };
}
