/**
 * Client-safe date utilities for week calculations.
 *
 * Uses epoch math (Date.now()) with an eslint-disable for
 * display-only week navigation. No timestamps are stored —
 * the server API handles all data timestamps.
 *
 * The disable is safe because Date.now() here is only used
 * to determine which week to display, not to create or modify
 * any data records.
 */

/** Convert epoch days to YYYY-MM-DD. */
export function epochToDate(days: number): string {
  const dim = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const isLeap = (y: number) =>
    (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  let r = days;
  let y = 1970;
  while (r >= (isLeap(y) ? 366 : 365)) {
    r -= isLeap(y) ? 366 : 365;
    y++;
  }
  const m = [...dim];
  if (isLeap(y)) m[1] = 29;
  let mo = 0;
  for (let i = 0; i < 12; i++) {
    if (r < m[i]) {
      mo = i;
      break;
    }
    r -= m[i];
    if (i === 11) mo = 11;
  }
  return `${y}-${String(mo + 1).padStart(2, "0")}-${String(r + 1).padStart(2, "0")}`;
}

/**
 * Get the current German calendar date as an epoch-day number.
 *
 * Dividing Date.now() by 24 hours uses the UTC date and therefore shows the
 * previous day/week between German midnight and UTC midnight. Quoska serves
 * German employers, so navigation boundaries must follow Europe/Berlin.
 */
export function getCurrentEpochDays(
  // eslint-disable-next-line @quoska/legal/no-client-timestamps
  nowMs = Date.now(),
): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(nowMs);
  const value = (type: "year" | "month" | "day") =>
    Number(parts.find((part) => part.type === type)?.value);
  const year = value("year");
  const month = value("month");
  const day = value("day");

  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

/** Get day of week (0=Sun, 1=Mon, ... 6=Sat) from epoch days. */
export function getDayOfWeekFromEpoch(epochDays: number): number {
  return (epochDays + 4) % 7;
}

/** Get the Monday date for a week offset from current week. */
export function getWeekMondayForOffset(offset: number): string {
  const epoch = getCurrentEpochDays();
  const dow = getDayOfWeekFromEpoch(epoch);
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  return epochToDate(epoch + mondayOffset + offset * 7);
}

/** Get week bounds (Monday-Sunday) for a week offset. */
export function getWeekBoundsForOffset(
  offset: number,
): { start: string; end: string } {
  const mondayEpoch = getCurrentEpochDays();
  const dow = getDayOfWeekFromEpoch(mondayEpoch);
  const mondayOff = mondayEpoch + (dow === 0 ? -6 : 1 - dow) + offset * 7;
  return {
    start: epochToDate(mondayOff),
    end: epochToDate(mondayOff + 6),
  };
}

/**
 * Format an ISO timestamp (UTC) as local time HH:MM.
 * Uses the browser's timezone automatically.
 */
export function formatTimeLocal(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(Date.parse(iso));
}

/**
 * Get today's date as YYYY-MM-DD in the user's local timezone.
 */
export function getLocalToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  // eslint-disable-next-line @quoska/legal/no-client-timestamps -- display/input default only; server timestamps remain authoritative
  }).formatToParts(Date.now());
  const value = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

/** Format an ISO timestamp as DD.MM.YYYY, HH:mm in the German app timezone. */
export function formatDateTimeDE(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(Date.parse(iso));
}

/** Validate a German 24-hour clock value (HH:mm). */
export function isGermanTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Split a stored UTC timestamp into German wall-date and 24-hour time. */
export function isoToBerlinDateTime(iso: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(Date.parse(iso));
  const value = (type: "year" | "month" | "day" | "hour" | "minute") =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    time: `${value("hour")}:${value("minute")}`,
  };
}

/** Convert a German wall-date/time to the UTC ISO representation used by the database. */
export function berlinDateTimeToIso(date: string, time: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const desiredUtc = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = desiredUtc;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = formatter.formatToParts(candidate);
    const value = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value);
    const observedUtc = Date.UTC(
      value("year"), value("month") - 1, value("day"), value("hour"), value("minute"),
    );
    candidate += desiredUtc - observedUtc;
  }
  // eslint-disable-next-line @quoska/legal/no-client-timestamps -- converts explicit user input; it does not generate a timestamp
  return new Date(candidate).toISOString();
}

/**
 * Format an ISO date string (YYYY-MM-DD) as DD.MM.YYYY.
 */
export function formatDateDE(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}.${m}`;
}

/**
 * Format an ISO date string (YYYY-MM-DD) as DD.MM.YYYY.
 */
export function formatDateFullDE(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}
