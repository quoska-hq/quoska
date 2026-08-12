import { describe, expect, it } from "vitest";
import {
  berlinDateTimeToIso,
  epochToDate,
  formatDateTimeDE,
  formatTimeLocal,
  getCurrentEpochDays,
  getDayOfWeekFromEpoch,
  isoToBerlinDateTime,
} from "@/config/client/date-utils";

describe("client date utilities", () => {
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
