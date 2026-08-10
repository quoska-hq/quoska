export function formatCockpitMinutes(minutes: number): string {
  const absolute = Math.abs(Math.round(minutes));
  const hours = Math.floor(absolute / 60);
  const rest = absolute % 60;
  const value = hours > 0
    ? `${hours} Std.${rest ? ` ${rest} Min.` : ""}`
    : `${rest} Min.`;
  return minutes < 0 ? `−${value}` : value;
}

export function formatCockpitTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(Date.parse(iso));
}
