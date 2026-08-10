import { describe, expect, it } from "vitest";
import {
  epochToDate,
  getCurrentEpochDays,
  getDayOfWeekFromEpoch,
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
});
