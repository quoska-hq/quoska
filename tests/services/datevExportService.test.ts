import { describe, expect, it } from "vitest";
import { buildDatevPreview, generateLodasFile } from "@/services/datevExportService";
import { datevSettingsSchema, type DatevSnapshot } from "@/types/datev";

const employeeId = "10000000-0000-4000-8000-000000000001";
const secondId = "10000000-0000-4000-8000-000000000002";
function snapshot(): DatevSnapshot {
  return { settings: { revision: 1, advisorNumber: 12345, clientNumber: 6789,
    employees: [{ employeeId, mode: "include", personnelNumber: 14, wageType: 200 }] },
  employees: [{ id: employeeId, first_name: "Mia", last_name: "Beispiel", deleted_at: null }],
  entries: [{ id: "entry", employee_id: employeeId, date: "2026-08-03", clock_in: "2026-08-03T06:00:00Z",
    clock_out: "2026-08-03T08:30:00Z", status: "completed", break_minutes: 30, entry_source: "clock" }], pending: [], history: [] };
}
const preview = (s: DatevSnapshot) => buildDatevPreview(s, "2026-08", "2026-09-19", "2026-09-19T12:00:00Z");

describe("LODAS hours export", () => {
  it("writes the documented standard-hours record, ASCII CRLF, numeric data only", () => {
    const s = snapshot();
    const p = preview(s);
    expect(p.errors).toEqual([]);
    expect(p.rows[0]).toMatchObject({ hours: "2,00", personnelNumber: 14, wageType: 200 });
    const file = generateLodasFile(s.settings!, p);
    expect(file).toBe('[Allgemein]\r\nZiel=LODAS\r\nBeraterNr=12345\r\nMandantenNr=6789\r\nDatumsformat=TT.MM.JJJJ\r\nFeldtrennzeichen=;\r\nZahlenkomma=,\r\n\r\n[Satzbeschreibung]\r\n1;u_lod_bwd_buchung_standard;abrechnung_zeitraum#bwd;bs_wert_butab#bwd;bs_nr#bwd;la_eigene#bwd;pnr#bwd;\r\n\r\n[Bewegungsdaten]\r\n1;01.08.2026;2,00;01;200;14;\r\n');
    expect([...file].every(char => char.charCodeAt(0) < 128)).toBe(true);
    expect(file).not.toContain("Mia");
  });
  it("rounds once after summing seconds, not per entry", () => {
    const s = snapshot();
    s.entries = Array.from({ length: 3 }, (_, i) => ({ ...s.entries[0], id: String(i), break_minutes: 0,
      clock_in: `2026-08-03T06:0${i}:00Z`, clock_out: `2026-08-03T06:0${i}:20Z` }));
    expect(preview(s).rows[0].hours).toBe("0,02");
  });
  it("handles actual elapsed time across DST and subtracts breaks only once", () => {
    const s = snapshot();
    s.entries[0] = { ...s.entries[0], date: "2026-10-25", clock_in: "2026-10-24T23:00:00Z", clock_out: "2026-10-25T03:00:00Z", break_minutes: 30 };
    const p = buildDatevPreview(s, "2026-10", "2026-11-01", "2026-11-01T12:00:00Z");
    expect(p.errors).toEqual([]); expect(p.rows[0].hours).toBe("3,50");
  });
  it.each([
    ["open", { status: "running", clock_out: null }, "offene Zeiterfassung"],
    ["negative duration", { clock_out: "2026-08-03T05:00:00Z" }, "ungültige Zeit"],
    ["excessive break", { break_minutes: 500 }, "ungültige Zeit"],
    ["negative break", { break_minutes: -1 }, "ungültige Zeit"],
    ["wrong date", { date: "2026-08-04" }, "Buchungsdatum"],
    ["cross month", { clock_in: "2026-08-31T21:00:00Z", clock_out: "2026-08-31T23:00:00Z", date: "2026-08-31" }, "Monatsgrenze"],
  ])("blocks %s", (_label, patch, error) => {
    const s = snapshot(); Object.assign(s.entries[0], patch);
    const p = preview(s); expect(p.errors.join(" ")).toContain(error);
    expect(() => generateLodasFile(s.settings!, p)).toThrow();
  });
  it("blocks pending corrections, overlapping records and missing mappings", () => {
    const s = snapshot(); s.pending = ["entry"];
    s.entries.push({ ...s.entries[0], id: "overlap" });
    expect(preview(s).errors.join(" ")).toMatch(/Korrekturanfrage.*überschneiden/);
    s.settings!.employees = [];
    expect(preview(s).errors.join(" ")).toContain("Exportzuordnung fehlt");
  });
  it("includes deactivated people and imported work, but explicitly warns about imported records", () => {
    const s = snapshot(); s.employees[0].deleted_at = "2026-09-01T00:00:00Z"; s.entries[0].entry_source = "import";
    const p = preview(s); expect(p.errors).toEqual([]); expect(p.rows).toHaveLength(1);
    expect(p.warnings.join(" ")).toContain("importierte Zeiten");
  });
  it("requires explicit exclusions and refuses empty exports", () => {
    const s = snapshot(); s.settings!.employees[0].mode = "exclude";
    const p = preview(s); expect(p.rows).toHaveLength(0); expect(p.errors).toHaveLength(1);
    expect(p.warnings.join(" ")).toContain("ausgeschlossen");
  });
  it("fingerprints data changes but ignores generated-file history", () => {
    const s = snapshot(); const original = preview(s).fingerprint;
    s.history.push({ id: "history", created_at: "2026-09-01T00:00:00Z", fingerprint: original });
    expect(preview(s).fingerprint).toBe(original);
    expect(preview(s).warnings.join(" ")).toContain("doppelt");
    s.entries[0].break_minutes = 20;
    expect(preview(s).fingerprint).not.toBe(original);
  });
  it("rejects duplicate personnel numbers, forged fields and invalid DATEV numbers", () => {
    const s = snapshot().settings!;
    expect(datevSettingsSchema.safeParse({ ...s, tenantId: "forged" }).success).toBe(false);
    expect(datevSettingsSchema.safeParse({ ...s, advisorNumber: 999 }).success).toBe(false);
    expect(datevSettingsSchema.safeParse({ ...s, employees: [...s.employees, { ...s.employees[0], employeeId: secondId }] }).success).toBe(false);
    expect(datevSettingsSchema.safeParse({ ...s, employees: [{ ...s.employees[0], personnelNumber: 100000 }] }).success).toBe(false);
  });
});
