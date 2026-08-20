/**
 * Browser-local default for public calendar forms. This value is only a UI
 * convenience; it is never persisted as a work-time timestamp.
 */
export function currentGermanMonth(): { year: number; month: number; value: string } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
  });
  // eslint-disable-next-line @quoska/legal/no-client-timestamps -- Public calculator default, not a recorded or audit-relevant work timestamp.
  const parts = formatter.formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  return {
    year,
    month,
    value: `${year}-${String(month).padStart(2, "0")}`,
  };
}
