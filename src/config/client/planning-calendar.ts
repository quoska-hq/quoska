import { PLANNING_TIME_ZONE } from "@/config/planning";

const formatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: PLANNING_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Explicit calendar calculations, never a source of recorded timestamps. */
export function planningLocal(instant: string | number): {
  date: string;
  time: string;
} {
  const p = formatter.formatToParts(
    typeof instant === "number" ? instant : Date.parse(instant),
  );
  const get = (key: Intl.DateTimeFormatPartTypes) =>
    p.find((part) => part.type === key)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}
export function planningDay(date: string): number {
  return (
    (((Math.floor(Date.parse(`${date}T12:00:00Z`) / 86400000) + 4) % 7) + 7) % 7
  );
}
export function planningAddDays(date: string, count: number): string {
  // eslint-disable-next-line @quoska/legal/no-client-timestamps -- Explicit calendar arithmetic, no recorded timestamps.
  return new Date(Date.parse(`${date}T12:00:00Z`) + count * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function planningAddMonths(month: string, count: number): string {
  const [y, m] = month.split("-").map(Number);
  // eslint-disable-next-line @quoska/legal/no-client-timestamps -- Explicit calendar arithmetic, no recorded timestamps.
  return new Date(Date.UTC(y, m - 1 + count, 1, 12)).toISOString().slice(0, 10);
}
export function planningFirstMonth(
  today: string,
  configured: string | null,
): string {
  const current = today.slice(0, 7) + "-01";
  return configured && configured > current ? configured : current;
}
export function planningIso(epoch: number): string {
  // eslint-disable-next-line @quoska/legal/no-client-timestamps -- Explicit calendar arithmetic, no recorded timestamps.
  return new Date(epoch).toISOString();
}
/** DST gaps and folds require a distinct, explicit time; never silently guess an offset. */
export function planningWallTime(date: string, time: string): string {
  if (time === "24:00")
    return planningWallTime(planningAddDays(date, 1), "00:00");
  const nominal = Date.parse(`${date}T${time}:00Z`);
  const matches = [nominal - 3600000, nominal - 7200000].filter((epoch) => {
    const local = planningLocal(epoch);
    return local.date === date && local.time === time;
  });
  if (matches.length !== 1)
    throw new Error(
      matches.length
        ? "Die Uhrzeit ist durch die Zeitumstellung doppeldeutig."
        : "Die Uhrzeit existiert wegen der Zeitumstellung nicht.",
    );
  return planningIso(matches[0]);
}
