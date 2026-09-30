import {
  planningAddDays,
  planningWallTime,
} from "@/config/client/planning-calendar";
/** Calendar-day rest plus eleven uninterrupted hours directly before or after it. */
export function planningRestWindows(date: string): [number, number][] {
  const a = Date.parse(planningWallTime(date, "00:00")),
    b = Date.parse(planningWallTime(planningAddDays(date, 1), "00:00"));
  return [
    [a - 660 * 60000, b],
    [a, b + 660 * 60000],
  ];
}
