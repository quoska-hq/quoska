const DAY_MS = 86_400_000;
export function productDay(iso: string): string {
  return new Date(iso).toLocaleString("sv-SE", { timeZone: "Europe/Berlin" }).slice(0, 10);
}
export function shiftProductDay(day: string, offset: number): string {
  return new Date(Date.parse(day + "T12:00:00Z") + offset * DAY_MS).toISOString().slice(0, 10);
}
export function productWeek(day: string): string {
  const weekday = new Date(day + "T12:00:00Z").getUTCDay();
  return shiftProductDay(day, -(weekday === 0 ? 6 : weekday - 1));
}
export function isStaleEntry(clockIn: string, now: string): boolean {
  return Date.parse(now) - Date.parse(clockIn) > DAY_MS;
}
