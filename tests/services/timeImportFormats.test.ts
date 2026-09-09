import { describe, expect, it } from "vitest";
import { suggestTimeImportFormats } from "@/services/timeImportFormatService";

describe("CSV format suggestions", () => {
  it.each(["2026-01-12", "12.01.2026"])("recognizes unambiguous dates: %s", (date) => {
    const formats = suggestTimeImportFormats([["Datum", "Dauer"], [date, "01:30:05"]], { date: 0, duration: 1 });
    expect(formats).toEqual({ dateFormat: date.includes(".") ? "DD.MM.YYYY" : "YYYY-MM-DD", durationFormat: "clock" });
  });
  it.each(["12/01/2026", "01/12/2026", "31/01/2026", "", "2026-1-2"])("requires a choice for unsupported or slash notation: %s", (date) => {
    expect(suggestTimeImportFormats([["Datum"], [date]], { date: 0 }).dateFormat).toBe("");
  });
  it("checks every start and end date, including overnight rows", () => {
    expect(suggestTimeImportFormats([["Datum", "Enddatum"], ["2026-01-12", "2026-01-13"], ["2026-01-14", "15.01.2026"]], { date: 0, endDate: 1 }).dateFormat).toBe("");
  });
  it.each(["1,5", "1.5", "90", "01:75"])("does not guess the unit for duration %s", (duration) => {
    expect(suggestTimeImportFormats([["Dauer"], [duration]], { duration: 0 }).durationFormat).toBe("");
  });
  it("ignores empty optional values and unassigned columns", () => {
    expect(suggestTimeImportFormats([["Datum", "Enddatum", "Dauer"], ["12.01.2026", "", "90"]], { date: 0, endDate: 1 }))
      .toEqual({ dateFormat: "DD.MM.YYYY", durationFormat: "clock" });
  });
});
