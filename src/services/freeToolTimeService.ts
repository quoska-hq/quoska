/* eslint-disable @quoska/legal/enforce-max-working-hours -- Duration and calendar constants are not configured legal hour limits. */
import type {
  TimesheetRow,
  TimesheetRowResult,
  WorkTimeError,
  WorkTimeResult,
} from "@/types/free-tools";

const MINUTES_PER_DAY = 24 * 60;

export function parseClockTime(value: string): number | null {
  const match = /^(\d{2}):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours <= 23 ? hours * 60 + minutes : null;
}

export function parseDuration(value: string, allowSign = false): number | null {
  const match = /^([+-])?(\d{1,4})(?::([0-5]\d))?$/.exec(value.trim());
  if (!match || (!allowSign && match[1])) return null;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0));
}

export function formatDuration(totalMinutes: number, signed = false): string {
  const rounded = Math.round(totalMinutes);
  const sign = rounded < 0 ? "−" : signed && rounded > 0 ? "+" : "";
  const absolute = Math.abs(rounded);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatDecimalHours(totalMinutes: number): string {
  return (totalMinutes / 60).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function calculateWorkTime(input: {
  start: string;
  end: string;
  breakMinutes: readonly number[];
  crossesMidnight: boolean;
  targetMinutes?: number | null;
}): { result: WorkTimeResult | null; error: WorkTimeError | null } {
  const start = parseClockTime(input.start);
  const parsedEnd = parseClockTime(input.end);
  if (start === null || parsedEnd === null) {
    return { result: null, error: "invalid-time" };
  }

  let end = parsedEnd;
  if (input.crossesMidnight) end += MINUTES_PER_DAY;
  if (!input.crossesMidnight && end < start) {
    return { result: null, error: "overnight-required" };
  }

  if (input.breakMinutes.some((minutes) => !Number.isInteger(minutes) || minutes < 0)) {
    return { result: null, error: "invalid-break" };
  }
  if (
    input.targetMinutes !== undefined &&
    input.targetMinutes !== null &&
    (!Number.isInteger(input.targetMinutes) || input.targetMinutes < 0)
  ) {
    return { result: null, error: "invalid-target" };
  }

  const grossMinutes = end - start;
  const breakMinutes = input.breakMinutes.reduce((sum, value) => sum + value, 0);
  if (breakMinutes > grossMinutes) {
    return { result: null, error: "break-exceeds-presence" };
  }

  const netMinutes = grossMinutes - breakMinutes;
  const target = input.targetMinutes ?? null;
  return {
    error: null,
    result: {
      grossMinutes,
      breakMinutes,
      netMinutes,
      decimalHours: netMinutes / 60,
      balanceMinutes: target === null ? null : netMinutes - target,
    },
  };
}

export function calculateTimesheetRow(row: TimesheetRow): TimesheetRowResult {
  const hasStart = row.start.trim() !== "";
  const hasEnd = row.end.trim() !== "";
  const hasBreak = row.breakMinutes > 0;
  if (!hasStart && !hasEnd && !hasBreak) {
    return { status: "empty", netMinutes: 0, error: null };
  }
  if (!hasStart || !hasEnd) {
    return { status: "incomplete", netMinutes: 0, error: null };
  }
  const calculation = calculateWorkTime({
    start: row.start,
    end: row.end,
    breakMinutes: [row.breakMinutes],
    crossesMidnight: row.crossesMidnight,
  });
  return calculation.result
    ? { status: "valid", netMinutes: calculation.result.netMinutes, error: null }
    : { status: "invalid", netMinutes: 0, error: calculation.error };
}

export function calculateOvertimeBalance(input: {
  targetMinutes: number;
  actualMinutes: number;
  priorBalanceMinutes: number;
  dailyMinutes: number;
}): { balanceMinutes: number; timeOffDays: number | null } {
  const balanceMinutes =
    input.actualMinutes - input.targetMinutes + input.priorBalanceMinutes;
  return {
    balanceMinutes,
    timeOffDays: input.dailyMinutes > 0 ? balanceMinutes / input.dailyMinutes : null,
  };
}

export function durationFromDecimal(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d{1,4}(?:\.\d{0,4})?$/.test(normalized)) return null;
  const decimal = Number(normalized);
  return Number.isFinite(decimal) ? Math.round(decimal * 60) : null;
}
