const DAY_MS = 86_400_000;

export function analyticsPeriodStart(nowIso: string, days: number): string {
  return new Date(Date.parse(nowIso) - (days - 1) * DAY_MS)
    .toISOString()
    .slice(0, 10) + "T00:00:00.000Z";
}

export function analyticsRetentionCutoff(nowIso: string): string {
  return new Date(Date.parse(nowIso) - 180 * DAY_MS).toISOString();
}
