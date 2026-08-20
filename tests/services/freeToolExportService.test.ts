import { describe, expect, it } from "vitest";
import { createTimesheetRows } from "@/services/freeToolDateService";
import { buildTimesheetCsv, timesheetFileName } from "@/services/freeToolExportService";
import { calculateTimesheetRow } from "@/services/freeToolTimeService";

describe("free timesheet export", () => {
  it("creates every calendar row, including leap day", () => {
    expect(createTimesheetRows("2028-02")).toHaveLength(29);
    expect(createTimesheetRows("2027-02")).toHaveLength(28);
  });

  it("exports German spreadsheet-friendly CSV with monthly totals", () => {
    const rows = createTimesheetRows("2026-08");
    rows[0] = { ...rows[0], start: "08:00", end: "16:30", breakMinutes: 30 };
    const results = rows.map(calculateTimesheetRow);
    const csv = buildTimesheetCsv({
      company: "Musterbetrieb",
      employee: "Erika Beispiel",
      month: "2026-08",
      rows,
      results,
    });
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("01.08.2026;Sa;08:00;16:30;Nein;30;08:00;8,00;Vollständig");
    expect(csv).toContain("Monatssumme;;;;;;08:00;8,00;");
  });

  it("neutralizes spreadsheet formulas in user-entered names", () => {
    const csv = buildTimesheetCsv({
      company: "=HYPERLINK(\"bad\")",
      employee: "+SUM(1,1)",
      month: "2026-08",
      rows: [],
      results: [],
    });
    expect(csv).toContain("Unternehmen;\"'=HYPERLINK(\"\"bad\"\")\"");
    expect(csv).toContain("Mitarbeitende Person;'+SUM(1,1)");
  });

  it("creates a portable, bounded file name", () => {
    expect(timesheetFileName("Jörg Müller / Vertrieb", "2026-08"))
      .toBe("stundenzettel-2026-08-jorg-muller-vertrieb.csv");
  });
});
