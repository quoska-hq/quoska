/** Legal minimum duration for a single break block (§4 ArbZG). */
export const MIN_BREAK_BLOCK_MINUTES = 15;
export const MIN_BREAK_BLOCK_SECONDS = MIN_BREAK_BLOCK_MINUTES * 60;
export const MIN_BREAK_BLOCK_MILLISECONDS = MIN_BREAK_BLOCK_SECONDS * 1000;

/** Only completed blocks of at least 15 minutes are deductible pauses. */
export function isShortInterruption(session: { break_start: string; break_end: string | null }): boolean {
  if (!session.break_end) return false;
  const duration = Date.parse(session.break_end) - Date.parse(session.break_start);
  return Number.isFinite(duration) && duration >= 0 && duration < MIN_BREAK_BLOCK_MILLISECONDS;
}

export function countedBreakMinutes(session: { break_start: string; break_end: string | null; duration_minutes: number | null }): number {
  if (!session.break_end) return 0;
  const duration = Date.parse(session.break_end) - Date.parse(session.break_start);
  if (!Number.isFinite(duration) || duration < MIN_BREAK_BLOCK_MILLISECONDS) return 0;
  return session.duration_minutes ?? 0;
}
