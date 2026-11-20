import { describe, expect, it, vi } from "vitest";
import {
  berlinDateTimeToIso,
  epochToDate,
  formatDateTimeDE,
  formatDateFullDE,
  formatDateDE,
  parseGermanDate,
  formatTimeLocal,
  getCurrentEpochDays,
  getDayOfWeekFromEpoch,
  getMonthBoundsForOffset,
  isoToBerlinDateTime,
} from "@/config/client/date-utils";

describe("client date utilities", () => {
  it("formats date-only values consistently with a four-digit year", () => {
    expect(formatDateFullDE("2026-09-01")).toBe("01.09.2026");
    expect(formatDateDE("2026-09-01")).toBe("01.09.2026");
    expect(formatDateFullDE("2026-09-01T12:30:00Z")).toBe("01.09.2026");
    expect(formatDateFullDE("")).toBe("");
  });

  it("parses typed German dates, including leap years, without swapping month and day", () => {
    expect(parseGermanDate("01.09.2026")).toBe("2026-09-01");
    expect(parseGermanDate("1.9.2026")).toBe("2026-09-01");
    expect(parseGermanDate("01092026")).toBe("2026-09-01");
    expect(parseGermanDate("29.02.2024")).toBe("2024-02-29");
    for (const invalid of ["31.02.2026", "29.02.2026", "31.04.2026", "01.13.2026", "00.09.2026", "2026-09-01", "01.09."]) {
      expect(parseGermanDate(invalid), invalid).toBeNull();
    }
  });
  it("uses the German calendar date between German and UTC midnight", () => {
    const sundayUtc = Date.parse("2026-08-09T22:30:00.000Z");
    const germanEpochDay = getCurrentEpochDays(sundayUtc);

    expect(epochToDate(germanEpochDay)).toBe("2026-08-10");
    expect(getDayOfWeekFromEpoch(germanEpochDay)).toBe(1);
  });

  it("handles the winter offset in Europe/Berlin", () => {
    const previousUtcDate = Date.parse("2026-01-04T23:30:00.000Z");
    expect(epochToDate(getCurrentEpochDays(previousUtcDate))).toBe("2026-01-05");
  });

  it("calculates month bounds from the German calendar across a year boundary", () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-12-31T23:30:00Z"));
    try {
      expect(getMonthBoundsForOffset(0)).toEqual({ start: "2027-01-01", end: "2027-01-31" });
      expect(getMonthBoundsForOffset(-1)).toEqual({ start: "2026-12-01", end: "2026-12-31" });
    } finally {
      now.mockRestore();
    }
  });

  it("always formats German dates and 24-hour Berlin times", () => {
    const summer = "2026-07-15T16:05:00.000Z";
    expect(formatTimeLocal(summer)).toBe("18:05");
    expect(formatDateTimeDE(summer)).toBe("15.07.2026, 18:05");
    expect(isoToBerlinDateTime(summer)).toEqual({ date: "2026-07-15", time: "18:05" });
  });

  it("converts entered German wall time back to UTC across DST", () => {
    expect(berlinDateTimeToIso("2026-01-15", "08:30")).toBe("2026-01-15T07:30:00.000Z");
    expect(berlinDateTimeToIso("2026-07-15", "08:30")).toBe("2026-07-15T06:30:00.000Z");
  });
});
