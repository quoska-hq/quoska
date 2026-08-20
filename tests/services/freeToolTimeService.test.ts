import { describe, expect, it } from "vitest";
import {
  calculateOvertimeBalance,
  calculateTimesheetRow,
  calculateWorkTime,
  durationFromDecimal,
  formatDuration,
  parseDuration,
} from "@/services/freeToolTimeService";

describe("free working-time calculations", () => {
  it("calculates a normal shift with several breaks and a target", () => {
    const calculation = calculateWorkTime({
      start: "08:00",
      end: "17:00",
      breakMinutes: [30, 15],
      crossesMidnight: false,
      targetMinutes: 8 * 60,
    });
    expect(calculation).toEqual({
      error: null,
      result: {
        grossMinutes: 540,
        breakMinutes: 45,
        netMinutes: 495,
        decimalHours: 8.25,
        balanceMinutes: 15,
      },
    });
  });

  it("only treats an earlier end as overnight when explicitly selected", () => {
    expect(calculateWorkTime({
      start: "22:00", end: "06:30", breakMinutes: [30], crossesMidnight: false,
    }).error).toBe("overnight-required");
    expect(calculateWorkTime({
      start: "22:00", end: "06:30", breakMinutes: [30], crossesMidnight: true,
    }).result?.netMinutes).toBe(480);
  });

  it("distinguishes zero duration from a full overnight day", () => {
    expect(calculateWorkTime({
      start: "08:00", end: "08:00", breakMinutes: [0], crossesMidnight: false,
    }).result?.grossMinutes).toBe(0);
    expect(calculateWorkTime({
      start: "08:00", end: "08:00", breakMinutes: [0], crossesMidnight: true,
    }).result?.grossMinutes).toBe(1_440);
  });

  it("rejects impossible breaks and malformed input", () => {
    expect(calculateWorkTime({
      start: "08:00", end: "09:00", breakMinutes: [61], crossesMidnight: false,
    }).error).toBe("break-exceeds-presence");
    expect(parseDuration("7:75")).toBeNull();
    expect(parseDuration("-01:30", true)).toBe(-90);
  });

  it("converts decimal hours to minutes without floating-point residue", () => {
    expect(durationFromDecimal("7,75")).toBe(465);
    expect(formatDuration(465)).toBe("07:45");
    expect(formatDuration(-15, true)).toBe("−00:15");
  });

  it("classifies blank, incomplete and valid timesheet rows", () => {
    const base = { date: "2026-08-20", breakMinutes: 0, crossesMidnight: false };
    expect(calculateTimesheetRow({ ...base, start: "", end: "" }).status).toBe("empty");
    expect(calculateTimesheetRow({ ...base, start: "08:00", end: "" }).status).toBe("incomplete");
    expect(calculateTimesheetRow({ ...base, start: "08:00", end: "16:00" })).toMatchObject({
      status: "valid", netMinutes: 480,
    });
  });

  it("adds a prior balance and converts the result into days off", () => {
    expect(calculateOvertimeBalance({
      targetMinutes: 2_400,
      actualMinutes: 2_520,
      priorBalanceMinutes: -30,
      dailyMinutes: 480,
    })).toEqual({ balanceMinutes: 90, timeOffDays: 0.1875 });
  });
});
