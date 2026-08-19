import type { CorrectionRequestWithEntry } from "@/types/correction";

const CORRECTION_FIELDS = [
  "clock_in",
  "clock_out",
  "break_minutes",
  "notes",
] as const;

type CorrectionField = (typeof CORRECTION_FIELDS)[number];

const FIELD_LABELS: Record<CorrectionField, string> = {
  clock_in: "Beginn",
  clock_out: "Ende",
  break_minutes: "Pause",
  notes: "Notiz",
};

function formatDateTime(value: unknown): string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return "–";
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(Date.parse(value));
}

function formatValue(field: CorrectionField, value: unknown): string {
  if (value === null || value === undefined || value === "") return "–";
  if (field === "clock_in" || field === "clock_out") {
    return formatDateTime(value);
  }
  if (field === "break_minutes") return `${String(value)} Min.`;
  return String(value);
}

/**
 * Turn the stored JSON proposal into stable, human-readable old/new values.
 * The entry relation is optional so older API/mock payloads still degrade well.
 */
export function formatCorrectionChanges(
  request: Pick<CorrectionRequestWithEntry, "proposed_change" | "timeEntry">,
): string[] {
  const proposed = request.proposed_change ?? {};
  return CORRECTION_FIELDS.flatMap((field) => {
    if (!(field in proposed)) return [];
    const nextValue = formatValue(field, proposed[field]);
    const currentEntry = request.timeEntry;
    if (!currentEntry) return [`${FIELD_LABELS[field]}: ${nextValue}`];
    return [
      `${FIELD_LABELS[field]}: ${formatValue(field, currentEntry[field])} → ${nextValue}`,
    ];
  });
}

export function correctionChangeSummary(
  request: Pick<CorrectionRequestWithEntry, "proposed_change" | "timeEntry">,
): string {
  const changes = formatCorrectionChanges(request);
  return changes.length > 0
    ? changes.join(" · ")
    : "Keine Änderungsdetails verfügbar";
}
