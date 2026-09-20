import { createHash } from "node:crypto";
import type { DatevPreview, DatevRow, DatevSettings, DatevSnapshot } from "@/types/datev";
import { datevSettingsSchema } from "@/types/datev";
import { getNowIso, getTodayDate } from "@/config/server/timestamps";

const berlinDate = (instant: number) => new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit",
}).format(instant);

export function buildDatevPreview(snapshot: DatevSnapshot, month: string,
  today = getTodayDate(), now = getNowIso()): DatevPreview {
  const errors = new Set<string>();
  const warnings = new Set<string>();
  const settings = snapshot.settings;
  const valid = datevSettingsSchema.safeParse(settings);
  if (!valid.success || !settings?.advisorNumber || !settings.clientNumber)
    errors.add("Bitte gültige DATEV-Einstellungen mit Beraternummer und Mandantennummer speichern.");
  if (month > today.slice(0, 7)) errors.add("Zukünftige Monate können nicht exportiert werden.");
  if (month === today.slice(0, 7)) warnings.add("Dieser Monat läuft noch. Der Export enthält nur die bisher erfassten Zeiten.");
  if (snapshot.history.length) warnings.add("Für diesen Monat wurde bereits eine Datei erstellt. Ein erneuter Import kann Stunden doppelt buchen. Vorher mit dem Lohnbüro abstimmen.");
  const employees = new Map(snapshot.employees.map(e => [e.id, e]));
  const mappings = new Map((settings?.employees ?? []).map(e => [e.employeeId, e]));
  const pending = new Set(snapshot.pending);
  const totals = new Map<string, DatevRow>();
  const lastEnd = new Map<string, number>();
  for (const entry of [...snapshot.entries].sort((a, b) => a.clock_in.localeCompare(b.clock_in))) {
    const employee = employees.get(entry.employee_id);
    const name = employee ? `${employee.first_name} ${employee.last_name}` : "Unbekannte Person";
    const mapping = mappings.get(entry.employee_id);
    if (mapping?.mode === "exclude") {
      warnings.add(`${name}: ausdrücklich vom Stundenexport ausgeschlossen.`);
      continue;
    }
    if (!employee || !mapping || mapping.mode !== "include" || !mapping.personnelNumber || !mapping.wageType) {
      errors.add(`${name}: Exportzuordnung fehlt. Bitte Personalnummer und Lohnart angeben oder ausdrücklich ausschließen.`);
      continue;
    }
    if (entry.status !== "completed" || !entry.clock_out) {
      errors.add(`${name}: offene Zeiterfassung zuerst abschließen.`);
      continue;
    }
    if (pending.has(entry.id)) errors.add(`${name}: offene Korrekturanfrage zuerst bearbeiten.`);
    const start = Date.parse(entry.clock_in);
    const end = Date.parse(entry.clock_out);
    const seconds = (end - start) / 1000 - entry.break_minutes * 60;
    if (!Number.isFinite(seconds) || end <= start || seconds < 0 || !Number.isInteger(entry.break_minutes) || entry.break_minutes < 0) {
      errors.add(`${name}: ungültige Zeit oder Pausendauer.`);
      continue;
    }
    if (berlinDate(start) !== entry.date) errors.add(`${name}: Buchungsdatum und Beginn stimmen nicht überein.`);
    if (berlinDate(start).slice(0, 7) !== month || berlinDate(end - 1).slice(0, 7) !== month)
      errors.add(`${name}: Eintrag überschreitet eine Monatsgrenze. Bitte die Zeiten einschließlich Pausen vorher korrekt aufteilen.`);
    if (end > Date.parse(now)) errors.add(`${name}: abgeschlossene Zeit liegt in der Zukunft.`);
    if (start < (lastEnd.get(entry.employee_id) ?? -Infinity)) errors.add(`${name}: Zeiteinträge überschneiden sich.`);
    lastEnd.set(entry.employee_id, Math.max(end, lastEnd.get(entry.employee_id) ?? -Infinity));
    if (entry.entry_source === "import") warnings.add("Der Monat enthält importierte Zeiten. Prüfen, ob diese bereits im Lohnprogramm gebucht wurden.");
    const row = totals.get(employee.id) ?? { employeeId: employee.id, name,
      personnelNumber: mapping.personnelNumber, wageType: mapping.wageType, seconds: 0, entries: 0, hours: "" };
    row.seconds += seconds;
    row.entries++;
    totals.set(employee.id, row);
  }
  const rows = [...totals.values()].filter(row => row.seconds > 0).sort((a, b) => a.personnelNumber - b.personnelNumber);
  for (const row of rows) {
    row.hours = (Math.round(row.seconds / 36) / 100).toFixed(2).replace(".", ",");
    if (row.hours === "0,00") errors.add(`${row.name}: Stunden liegen unter der exportierbaren Genauigkeit.`);
  }
  if (!rows.length) errors.add("Keine abgeschlossenen Arbeitsstunden für den Export vorhanden.");
  // History is deliberately excluded: retries of an unchanged snapshot produce the same file.
  const fingerprint = createHash("sha256").update(JSON.stringify({ format: "lodas-hours-v1", month,
    settings, employees: snapshot.employees, entries: snapshot.entries, pending: snapshot.pending })).digest("hex");
  return { month, fingerprint, rows, errors: [...errors], warnings: [...warnings], history: snapshot.history };
}

/** Numeric ASCII payload: valid in Windows-1252, no BOM, CRLF, no user text/formulas. */
export function generateLodasFile(settings: DatevSettings, preview: DatevPreview): string {
  if (preview.errors.length) throw new Error("Export enthält ungeklärte Fehler.");
  const [year, month] = preview.month.split("-");
  return ["[Allgemein]", "Ziel=LODAS", `BeraterNr=${settings.advisorNumber}`,
    `MandantenNr=${settings.clientNumber}`, "Datumsformat=TT.MM.JJJJ", "Feldtrennzeichen=;", "Zahlenkomma=,", "",
    "[Satzbeschreibung]",
    "1;u_lod_bwd_buchung_standard;abrechnung_zeitraum#bwd;bs_wert_butab#bwd;bs_nr#bwd;la_eigene#bwd;pnr#bwd;", "",
    "[Bewegungsdaten]", ...preview.rows.map(row =>
      `1;01.${month}.${year};${row.hours};01;${row.wageType};${row.personnelNumber};`), ""].join("\r\n");
}
