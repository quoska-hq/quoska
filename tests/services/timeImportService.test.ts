import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseTimeImport, runTimeImport } from "@/services/timeImportService";
import { detectTimeImportDelimiter, readTimeImportCsv, suggestTimeImportColumns } from "@/services/timeImportCsvService";
import { timeImportSchema, type TimeImportInput } from "@/types/time-import";

const employeeId = "11111111-1111-4111-8111-111111111111";
const now = "2026-09-07T12:00:00Z";
// Synthetic data using the documented Clockify detailed-report fields:
// https://clockify.me/help/reports/exporting-reports
const headers = "Project,Client,Description,Task,User,Email,Tags,Billable,Start Date,Start Time,End Date,End Time,Duration (h),Duration (decimal)";
const example = `${headers}\nWebsite,Example,Implementation,,Anna,anna@example.com,,Yes,2026-01-12,08:00:05,2026-01-12,09:30:35,01:30:30,1.51`;
function input(csv = example, overrides: Partial<TimeImportInput> = {}): TimeImportInput {
  const delimiter = detectTimeImportDelimiter(csv);
  return {
    csv, delimiter, columns: suggestTimeImportColumns(readTimeImportCsv(csv, delimiter)[0]),
    employees: [{ source: "anna@example.com", employeeId }], dateFormat: "YYYY-MM-DD",
    timezone: "Europe/Berlin", durationFormat: "clock", mode: "preview", ...overrides,
  };
}
function simple(row: string, overrides: Partial<TimeImportInput> = {}) {
  return input(`Email,Start date,Start time,End date,End time,Pause (Min),Description\nanna@example.com,${row}`, overrides);
}

describe("Historical CSV import", () => {
  it("maps a documented Clockify report and preserves seconds and project context", () => {
    const parsed = parseTimeImport(input(), now);
    expect(parsed.errors).toEqual([]);
    expect(parsed.entries[0]).toMatchObject({
      employee_id: employeeId, clock_in: "2026-01-12T07:00:05.000Z", clock_out: "2026-01-12T08:30:35.000Z",
      notes: "Implementation\nProjekt: Website", break_minutes: 0,
    });
  });
  it("handles Toggl-style headers, BOM, semicolons, embedded quotes and newlines", () => {
    const csv = '\uFEFFUser;Email;Start date;Start time;End date;End time;Duration;Description\r\nAnna;anna@example.com;2026-07-01;08:00:00;2026-07-01;09:00:00;01:00:00;"Bericht; ""fertig""\nZweite Zeile"\r\n';
    expect(detectTimeImportDelimiter(csv)).toBe(";");
    const parsed = parseTimeImport(input(csv), now);
    expect(parsed.errors).toEqual([]);
    expect(parsed.entries[0].notes).toBe('Bericht; "fertig"\nZweite Zeile');
    expect(parsed.entries[0].clock_in).toBe("2026-07-01T06:00:00.000Z");
  });
  it("preserves an explicitly supplied historical pause without automatic deductions", () => {
    const parsed = parseTimeImport(simple("2026-01-12,08:00,2026-01-12,18:00,10,Original"), now);
    expect(parsed.entries[0].break_minutes).toBe(10);
  });
  it("supports explicit overnight dates", () => {
    const parsed = parseTimeImport(simple("2026-01-12,22:00,2026-01-13,06:30,30,Nacht"), now);
    expect(parsed.entries[0]).toMatchObject({ date: "2026-01-12", clock_out: "2026-01-13T05:30:00.000Z" });
  });
  it("uses the Berlin entry date even when the source is UTC", () => {
    const parsed = parseTimeImport(simple("2026-01-12,23:30,2026-01-13,01:00,0,", { timezone: "UTC" }), now);
    expect(parsed.entries[0].date).toBe("2026-01-13");
  });
  it.each([
    ["DD.MM.YYYY", "12.01.2026"], ["DD/MM/YYYY", "12/01/2026"], ["MM/DD/YYYY", "01/12/2026"],
  ] as const)("supports explicit %s dates and 12-hour times", (dateFormat, date) => {
    const parsed = parseTimeImport(simple(`${date},08:00 AM,${date},12:00 PM,0,`, { dateFormat }), now);
    expect(parsed.entries[0].clock_out).toBe("2026-01-12T11:00:00.000Z");
  });
  it("calculates end from net decimal hours plus original pause", () => {
    const csv = 'Email;Start date;Start time;Duration;Pause (Min)\nanna@example.com;2026-01-12;08:00;7,5;30';
    const parsed = parseTimeImport(input(csv, { durationFormat: "hours" }), now);
    expect(parsed.entries[0].clock_out).toBe("2026-01-12T15:00:00.000Z");
  });
  it("supports duration in minutes and tab separated files", () => {
    const csv = 'Email\tStart date\tStart time\tDuration\nanna@example.com\t2026-01-12\t08:00\t90';
    const parsed = parseTimeImport(input(csv, { durationFormat: "minutes" }), now);
    expect(parsed.entries[0].clock_out).toBe("2026-01-12T08:30:00.000Z");
  });
  it.each([
    ["2026-02-30,08:00,2026-02-30,09:00,0,", "Kalenderdatum"],
    ["2026-01-12,08:00,,06:00,0,", "Nachtschichten"],
    ["2026-01-12,08:00,2026-01-12,09:00,60,", "Pause"],
    ["2026-01-12,08:00,2026-01-12,09:00,-1,", "Pause"],
    ["2026-01-12,08:00,2026-01-12,09:00,1.5,", "Pause"],
    ["2026-01-12,08:00,2026-01-14,09:00,0,", "24 Stunden"],
    ["2027-01-12,08:00,2027-01-12,09:00,0,", "Vergangenheit"],
    ["2026-03-29,02:30,2026-03-29,04:00,0,", "Zeitumstellung"],
    ["2025-10-26,02:30,2025-10-26,04:00,0,", "Zeitumstellung"],
    ["2026-01-12,25:00,2026-01-12,09:00,0,", "Uhrzeit"],
    ["2026-01-12,08:00,2026-01-12,09:00,0,extra,column", "Anzahl"],
  ])("reports row errors without importing invalid data: %s", (row, message) => {
    const parsed = parseTimeImport(simple(row), now);
    expect(parsed.entries).toEqual([]);
    expect(parsed.errors[0]).toMatchObject({ row: 2, status: "error", message: expect.stringContaining(message) });
  });
  it("handles valid intervals across DST using elapsed time", () => {
    const parsed = parseTimeImport(simple("2026-03-29,01:30,2026-03-29,03:30,0,"), now);
    expect(Date.parse(parsed.entries[0].clock_out) - Date.parse(parsed.entries[0].clock_in)).toBe(3600000);
  });
  it("rejects rounded duration mismatches instead of inventing breaks", () => {
    const parsed = parseTimeImport(input(example.replace("01:30:30", "01:30:00")), now);
    expect(parsed.errors[0].message).toContain("Arbeitsdauer stimmt nicht");
  });
  it("requires an explicit employee mapping", () => {
    expect(parseTimeImport(input(example, { employees: [] }), now).errors[0].message).toContain("zugeordnet");
  });
  it("can map all rows to one employee if the CSV has no person column", () => {
    const parsed = parseTimeImport(input('Start date,Start time,End time\n2026-01-12,08:00,09:00', { employees: [{ source: "", employeeId }] }), now);
    expect(parsed.entries[0].employee_id).toBe(employeeId);
  });
  it("rejects summaries, invalid mappings, malformed CSV, invalid encoding and limits", () => {
    expect(() => parseTimeImport(input('Email,Duration\nanna@example.com,08:00'), now)).toThrow("Startdatum");
    expect(() => parseTimeImport(input(example, { columns: { date: 0, start: 0, end: 99 } }), now)).toThrow("einmal");
    expect(() => readTimeImportCsv('a,b\n"unfinished,b', ",")).toThrow("geschlossen");
    expect(() => readTimeImportCsv('a,b\n"done"x,b', ",")).toThrow("Anführungszeichen");
    expect(() => readTimeImportCsv('a,a\nx,y', ",")).toThrow("eindeutige");
    expect(() => readTimeImportCsv('a,b\nx,\uFFFD', ",")).toThrow("UTF-8");
    expect(() => readTimeImportCsv('a,b\n' + 'x,y\n'.repeat(2001), ",")).toThrow("2000");
    expect(() => readTimeImportCsv('a,b\n' + 'x'.repeat(2 * 1024 * 1024), ",")).toThrow("2 MB");
    expect(timeImportSchema.safeParse(input(example, { employees: [{ source: "a", employeeId: "bad-id" }] })).success).toBe(false);
  });
  it("never asks the database to commit a batch with parse errors", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { rows: [], readyCount: 1, duplicateCount: 0, errorCount: 0, importedCount: 0 }, error: null });
    const csv = `${example}\n${example.split('\n')[1].replace('2026-01-12', '2026-02-30')}`;
    const result = await runTimeImport({ rpc } as unknown as SupabaseClient, "tenant", "actor", input(csv, { mode: "import" }), now);
    expect(rpc).toHaveBeenCalledWith("import_time_entries", expect.objectContaining({ p_commit: false, p_tenant_id: "tenant", p_actor_id: "actor" }));
    expect(result.errorCount).toBe(1);
    expect(result.importedCount).toBe(0);
  });
  it("does not mistake a failed database read for an empty history", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: { code: "08006" }, data: null });
    await expect(runTimeImport({ rpc } as unknown as SupabaseClient, "tenant", "actor", input(), now)).rejects.toThrow("Importprüfung fehlgeschlagen");
  });
});
