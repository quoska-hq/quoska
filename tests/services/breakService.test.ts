import { describe, expect, it } from "vitest";
import { createMockSupabase, createTableMock } from "../legal/helpers/supabase-mock";
import { endBreak } from "@/services/breakService";
import { countedBreakMinutes, isShortInterruption } from "@/config/break-policy";
import { allocateBreakMinutes } from "@/types/break";
import { calculateNetWorkMinutes, getBreakWarnings } from "@/services/complianceService";
import { netMinutesForEntry } from "@/services/overtimeService";
import { buildDatevPreview } from "@/services/datevExportService";
import { entriesToExportRows } from "@/services/exportService";
import type { BreakSession, TimeEntry } from "@/types/database";

const entry: TimeEntry = {
  id: "entry", tenant_id: "tenant", employee_id: "employee", date: "2026-09-29",
  clock_in: "2026-09-29T08:00:00.000Z", clock_out: null, break_minutes: 0,
  status: "paused", notes: null, created_at: "", updated_at: "", deleted_at: null,
};
const session: BreakSession = {
  id: "break", tenant_id: "tenant", time_entry_id: "entry",
  break_start: "2026-09-29T10:00:00.000Z", break_end: null, duration_minutes: null,
  created_at: "", updated_at: "",
};

async function resume(seconds: number, previous: BreakSession[] = [], automatic = 0) {
  const now = new Date(Date.parse(session.break_start) + seconds * 1000).toISOString();
  const ended = { ...session, break_end: now, duration_minutes: Math.floor(seconds / 60) };
  let reads = 0;
  const breaks = createTableMock({
    selectResolver: async () => ({ data: ++reads === 1 ? session : [...previous, ended] }),
    updateResolver: async () => ({ data: ended }),
  });
  const entries = createTableMock({ selectResolver: async () => ({ data: { ...entry, automatic_break_minutes: automatic } }) });
  const audit = createTableMock({});
  const db = createMockSupabase({ break_sessions: breaks, time_entries: entries, time_entry_audit: audit });
  const result = await endBreak(db, "tenant", "employee", "break", now);
  return { result, breaks, entries, audit, now, ended };
}

describe("Ending pauses without a minimum lock", () => {
  it.each([0, 1, 59, 60, 899, 899.999, 900, 901, 1200])("stores actual duration at %s seconds and only deducts qualifying blocks", async (seconds) => {
    const { result, breaks, entries, audit, now } = await resume(seconds);
    const deductible = seconds < 900 ? 0 : Math.floor(seconds / 60);
    expect(result.error).toBeNull();
    expect(result.data?.breakMinutes).toBe(deductible);
    expect(breaks.update).toHaveBeenCalledWith({ break_end: now, duration_minutes: Math.floor(seconds / 60) });
    expect(entries.update).toHaveBeenCalledWith({ break_minutes: deductible, status: "running" });
    expect(audit.insert).toHaveBeenCalledWith(expect.objectContaining({ action: "resume", reason: expect.stringContaining(seconds < 900 ? "Kurze Unterbrechung" : "Pause beendet") }));
  });

  it("does not combine short interruptions into a qualifying block, and keeps automatic deductions separate", async () => {
    const previous = [5, 10, 14, 15, 20].map((minutes, i) => ({
      ...session, id: String(i), duration_minutes: minutes,
      break_end: new Date(Date.parse(session.break_start) + minutes * 60000).toISOString(),
    }));
    const { result } = await resume(120, previous, 10);
    expect(result.data?.breakMinutes).toBe(45); // 15 + 20 recorded, 10 automatic
  });

  it.each([false, true])("keeps balance, warnings and exported minutes consistent (automatic=%s)", async (automatic) => {
    const { result } = await resume(14 * 60);
    const allocation = allocateBreakMinutes(480, result.data!.breakMinutes, automatic);
    expect(allocation.automaticMinutes).toBe(automatic ? 30 : 0);
    const completed = { ...entry, status: "completed" as const, clock_out: "2026-09-29T16:00:00.000Z", break_minutes: allocation.totalMinutes, automatic_break_minutes: allocation.automaticMinutes };
    const net = automatic ? 450 : 480;
    expect(netMinutesForEntry(completed)).toBe(net);
    expect(calculateNetWorkMinutes(completed.clock_in, completed.clock_out, completed.break_minutes, completed.clock_out)).toBe(net);
    expect(entriesToExportRows([{ ...completed, employee_first_name: "Test", employee_last_name: "Pause" }])[0]).toMatchObject({ breakMinutes: automatic ? 30 : 0, netMinutes: net });
    expect(getBreakWarnings(net, completed.break_minutes).length > 0).toBe(!automatic);
    const employeeId = "10000000-0000-4000-8000-000000000001";
    const datev = buildDatevPreview({
      settings: { revision: 1, advisorNumber: 12345, clientNumber: 6789,
        employees: [{ employeeId, mode: "include", personnelNumber: 14, wageType: 200 }] },
      employees: [{ id: employeeId, first_name: "Test", last_name: "Pause", deleted_at: null }],
      entries: [{ ...completed, employee_id: employeeId, entry_source: "clock" }], pending: [], history: [],
    }, "2026-09", "2026-10-01", "2026-10-01T12:00:00Z");
    expect(datev.errors).toEqual([]);
    expect(datev.rows[0].hours).toBe(automatic ? "7,50" : "8,00");
  });

  it("does not classify an active session as a completed short interruption", () => {
    expect(isShortInterruption(session)).toBe(false);
    expect(countedBreakMinutes(session)).toBe(0);
  });
});
