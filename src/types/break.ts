export interface BreakAllocation {
  requiredMinutes: number;
  automaticMinutes: number;
  totalMinutes: number;
}
/** Statutory default under §4 ArbZG: >6h = 30m, >9h = 45m. */
export function requiredBreakMinutesForGross(grossMinutes: number): number {
  if (grossMinutes > 9 * 60) return 45;
  if (grossMinutes > 6 * 60) return 30;
  return 0;
}

export function allocateBreakMinutes(
  grossMinutes: number,
  recordedMinutes: number,
  automaticEnabled: boolean,
): BreakAllocation {
  const requiredMinutes = requiredBreakMinutesForGross(grossMinutes);
  const automaticMinutes = automaticEnabled
    ? Math.max(0, requiredMinutes - recordedMinutes)
    : 0;

  return {
    requiredMinutes,
    automaticMinutes,
    totalMinutes: recordedMinutes + automaticMinutes,
  };
}
