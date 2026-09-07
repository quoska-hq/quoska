import type { TimeImportInput } from "@/types/time-import";

export function parseImportDate(value: string, format: TimeImportInput["dateFormat"]): string {
  const pattern = format === "YYYY-MM-DD" ? /^(\d{4})-(\d{2})-(\d{2})$/
    : format === "DD.MM.YYYY" ? /^(\d{2})\.(\d{2})\.(\d{4})$/ : /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const parts = value.match(pattern);
  if (!parts) throw new Error(`Datum „${value}“ passt nicht zu ${format}.`);
  const a = Number(parts[1]), b = Number(parts[2]), c = Number(parts[3]);
  const [year, month, day] = format === "YYYY-MM-DD" ? [a, b, c]
    : format === "MM/DD/YYYY" ? [c, a, b] : [c, b, a];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (year < 1900 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`Ungültiges Kalenderdatum „${value}“.`);
  }
  return date.toISOString().slice(0, 10);
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function wallTime(epoch: number, timezone: string): string {
  let formatter = formatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("sv-SE", {
      timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    });
    formatters.set(timezone, formatter);
  }
  const parts = formatter.formatToParts(epoch);
  const value = (key: string) => parts.find((p) => p.type === key)!.value;
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}:${value("second")}`;
}

/** Reject nonexistent/ambiguous DST wall times instead of silently shifting them. */
export function importWallTimeToIso(date: string, time: string, timezone: TimeImportInput["timezone"]): string {
  const parts = time.match(/^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?(?:\s*(AM|PM))?$/i);
  if (!parts) throw new Error(`Ungültige Uhrzeit „${time}“. Erwartet: HH:MM oder HH:MM:SS.`);
  let hour = Number(parts[1]);
  if (parts[4]) {
    if (hour < 1 || hour > 12) throw new Error(`Ungültige Uhrzeit „${time}“.`);
    hour = hour % 12 + (parts[4].toUpperCase() === "PM" ? 12 : 0);
  } else if (hour > 23) throw new Error(`Ungültige Uhrzeit „${time}“.`);
  const desired = `${date}T${String(hour).padStart(2, "0")}:${parts[2]}:${parts[3] ?? "00"}`;
  const naive = Date.parse(`${desired}Z`);
  const candidates = (timezone === "UTC" ? [0] : [60, 120]).map((offset) => naive - offset * 60_000)
    .filter((epoch) => wallTime(epoch, timezone) === desired);
  if (candidates.length !== 1) throw new Error("Uhrzeit bei Zeitumstellung ist mehrdeutig oder existiert nicht. Bitte diese Zeilen separat in UTC exportieren.");
  return new Date(candidates[0]).toISOString();
}

export function addImportSeconds(iso: string, seconds: number): string {
  return new Date(Date.parse(iso) + seconds * 1000).toISOString();
}

export function importDateInBerlin(iso: string): string {
  return wallTime(Date.parse(iso), "Europe/Berlin").slice(0, 10);
}
