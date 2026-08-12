import { describe, expect, it } from "vitest";
import { addCalendarDay, berlinLocalDateTimeToIso } from "@/config/server/timestamps";

describe("manual Europe/Berlin timestamps", () => {
  it("converts winter and summer wall times to UTC", () => {
    expect(berlinLocalDateTimeToIso("2026-01-15", "08:00")).toBe("2026-01-15T07:00:00.000Z");
    expect(berlinLocalDateTimeToIso("2026-07-15", "08:00")).toBe("2026-07-15T06:00:00.000Z");
  });

  it("advances dates across month and year boundaries", () => {
    expect(addCalendarDay("2026-01-31")).toBe("2026-02-01");
    expect(addCalendarDay("2026-12-31")).toBe("2027-01-01");
  });
});
