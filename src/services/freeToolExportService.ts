import { germanDateLabel } from "@/services/freeToolDateService";
import { formatDecimalHours, formatDuration } from "@/services/freeToolTimeService";
import type { TimesheetRow, TimesheetRowResult } from "@/types/free-tools";

const STATUS_LABELS: Record<TimesheetRowResult["status"], string> = {
  empty: "Leer",
  incomplete: "Unvollständig",
  valid: "Vollständig",
  invalid: "Fehlerhaft",
};

function spreadsheetSafe(value: string): string {
  return /^[=+\-@]/.test(value.trimStart()) ? `'${value}` : value;
}

function csvCell(value: string | number): string {
  const safe = spreadsheetSafe(String(value));
  return /[;"\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function buildTimesheetCsv(input: {
  company: string;
  employee: string;
  month: string;
  rows: readonly TimesheetRow[];
  results: readonly TimesheetRowResult[];
}): string {
  const lines: Array<Array<string | number>> = [
    ["Unternehmen", input.company],
    ["Mitarbeitende Person", input.employee],
    ["Monat", input.month],
    [],
    [
      "Datum", "Wochentag", "Beginn", "Ende", "Folgetag",
      "Pause (Minuten)", "Arbeitszeit (hh:mm)", "Arbeitszeit (dezimal)", "Status",
    ],
  ];
  input.rows.forEach((row, index) => {
    const result = input.results[index];
    const [year, month, day] = row.date.split("-");
    const weekday = germanDateLabel(row.date).split(",")[0];
    lines.push([
      `${day}.${month}.${year}`,
      weekday,
      row.start,
      row.end,
      row.crossesMidnight ? "Ja" : "Nein",
      row.breakMinutes,
      result?.status === "valid" ? formatDuration(result.netMinutes) : "",
      result?.status === "valid" ? formatDecimalHours(result.netMinutes) : "",
      STATUS_LABELS[result?.status ?? "empty"],
    ]);
  });
  const total = input.results.reduce(
    (sum, result) => sum + (result.status === "valid" ? result.netMinutes : 0),
    0,
  );
  lines.push([], ["Monatssumme", "", "", "", "", "", formatDuration(total), formatDecimalHours(total), ""]);
  return `\uFEFF${lines.map((line) => line.map(csvCell).join(";")).join("\r\n")}`;
}

export function timesheetFileName(employee: string, month: string): string {
  const safeEmployee = employee
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  return `stundenzettel-${month}${safeEmployee ? `-${safeEmployee.toLowerCase()}` : ""}.csv`;
}
