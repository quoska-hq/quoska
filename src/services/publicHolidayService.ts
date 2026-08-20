/* eslint-disable @quoska/legal/enforce-max-working-hours -- Numeric literals here are calendar months and days, not working-hour limits. */
import { offsetDate } from "@/services/freeToolDateService";
import type { GermanPublicHoliday } from "@/types/free-tools";
import type { Bundesland } from "@/types/tenant";

const EPIPHANY_STATES: readonly Bundesland[] = [
  "baden-wuerttemberg", "bayern", "sachsen-anhalt",
];
const WOMENS_DAY_STATES: readonly Bundesland[] = ["berlin", "mecklenburg-vorpommern"];
const CORPUS_CHRISTI_STATES: readonly Bundesland[] = [
  "baden-wuerttemberg", "bayern", "hessen", "nordrhein-westfalen",
  "rheinland-pfalz", "saarland",
];
const REFORMATION_STATES: readonly Bundesland[] = [
  "brandenburg", "bremen", "hamburg", "mecklenburg-vorpommern",
  "niedersachsen", "sachsen", "sachsen-anhalt", "schleswig-holstein", "thueringen",
];
const ALL_SAINTS_STATES: readonly Bundesland[] = [
  "baden-wuerttemberg", "bayern", "nordrhein-westfalen", "rheinland-pfalz", "saarland",
];

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Gregorian Easter Sunday using the Meeus/Jones/Butcher algorithm. */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(year, month, day);
}

function add(
  holidays: GermanPublicHoliday[],
  date: string,
  name: string,
  scope: GermanPublicHoliday["scope"],
): void {
  holidays.push({ date, name, scope });
}

function inState(state: Bundesland, states: readonly Bundesland[]): boolean {
  return states.includes(state);
}

export function germanPublicHolidays(
  year: number,
  state: Bundesland,
): GermanPublicHoliday[] {
  const easter = easterSunday(year);
  const holidays: GermanPublicHoliday[] = [];

  add(holidays, iso(year, 1, 1), "Neujahr", "nationwide");
  add(holidays, offsetDate(easter, -2), "Karfreitag", "nationwide");
  add(holidays, offsetDate(easter, 1), "Ostermontag", "nationwide");
  add(holidays, iso(year, 5, 1), "Tag der Arbeit", "nationwide");
  add(holidays, offsetDate(easter, 39), "Christi Himmelfahrt", "nationwide");
  add(holidays, offsetDate(easter, 50), "Pfingstmontag", "nationwide");
  add(holidays, iso(year, 10, 3), "Tag der Deutschen Einheit", "nationwide");
  add(holidays, iso(year, 12, 25), "1. Weihnachtsfeiertag", "nationwide");
  add(holidays, iso(year, 12, 26), "2. Weihnachtsfeiertag", "nationwide");

  if (inState(state, EPIPHANY_STATES)) add(holidays, iso(year, 1, 6), "Heilige Drei Könige", "state");
  if (inState(state, WOMENS_DAY_STATES)) add(holidays, iso(year, 3, 8), "Internationaler Frauentag", "state");
  if (state === "brandenburg") {
    add(holidays, easter, "Ostersonntag", "state");
    add(holidays, offsetDate(easter, 49), "Pfingstsonntag", "state");
  }
  if (inState(state, CORPUS_CHRISTI_STATES)) add(holidays, offsetDate(easter, 60), "Fronleichnam", "state");
  if (state === "saarland") add(holidays, iso(year, 8, 15), "Mariä Himmelfahrt", "state");
  if (state === "thueringen") add(holidays, iso(year, 9, 20), "Weltkindertag", "state");
  if (inState(state, REFORMATION_STATES)) add(holidays, iso(year, 10, 31), "Reformationstag", "state");
  if (inState(state, ALL_SAINTS_STATES)) add(holidays, iso(year, 11, 1), "Allerheiligen", "state");
  if (state === "sachsen") add(holidays, repentanceDay(year), "Buß- und Bettag", "state");

  return holidays.sort((left, right) => left.date.localeCompare(right.date));
}

/** Wednesday between 16 and 22 November. */
export function repentanceDay(year: number): string {
  const november23 = iso(year, 11, 23);
  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = offsetDate(november23, -offset);
    const epochDays = Math.floor(Date.parse(`${candidate}T12:00:00Z`) / 86_400_000);
    if ((epochDays + 4) % 7 === 3) return candidate;
  }
  return iso(year, 11, 18);
}
