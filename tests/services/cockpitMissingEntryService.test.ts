import { describe, expect, it } from "vitest";
import { missingEntryActions } from "@/services/cockpitMissingEntryService";
import { getCockpitMissingEntryStart } from "@/services/cockpitPeriodService";
import { FOUR_DAY_WORK_SCHEDULE, DEFAULT_WORK_SCHEDULE } from "@/types/work-schedule";
import type { Employee, LeaveRequest, SickEntry, TimeEntry } from "@/types/database";

const employee = {
  id: "employee-1", first_name: "Anna", last_name: "Test", bundesland: "berlin",
  target_hours_week: 32, work_schedule: FOUR_DAY_WORK_SCHEDULE,
  employment_start_date: "2026-08-10", created_at: "2026-08-01T00:00:00Z",
} as Employee;
const entry = (date: string, overrides: Partial<TimeEntry> = {}) => ({
  id: date, employee_id: employee.id, date, status: "completed", deleted_at: null, ...overrides,
}) as TimeEntry;
function input(overrides: Partial<Parameters<typeof missingEntryActions>[0]> = {}) {
  return {
    employees: [employee], entries: [],
    missingEntryEntries: ["2026-08-10", "2026-08-11", "2026-08-12"].map((date) => entry(date)),
    absences: { leaves: [], sicknesses: [] },
    holidaysByState: new Map([["berlin", new Map<string, string>()]]),
    tenantState: "berlin", startDate: "2026-08-17", endDate: "2026-08-17", ...overrides,
  };
}

describe("Missing Cockpit entries for shorter working weeks", () => {
  it.each(["2026-08-13", "2026-08-14", "2026-08-15", "2026-08-16"])("waits for the week to finish on %s", (endDate) => {
    expect(missingEntryActions(input({ startDate: "2026-08-10", endDate }))).toEqual([]);
  });

  it("shows one hint on Monday for an incomplete previous week", () => {
    expect(missingEntryActions(input())).toEqual([expect.objectContaining({
      id: "missing-week-employee-1-2026-08-10", date: "2026-08-16",
      detail: "3 von 4 erwarteten Arbeitstagen erfasst.",
    })]);
  });

  it.each(["2026-08-14", "2026-08-15", "2026-08-16"])("counts a replacement day on %s", (replacement) => {
    const data = input();
    data.missingEntryEntries.push(entry(replacement));
    expect(missingEntryActions(data)).toEqual([]);
  });

  it("does not mistake multiple sessions in one day for an extra workday", () => {
    const data = input();
    data.missingEntryEntries.push(entry("2026-08-12", { id: "second-session" }));
    expect(missingEntryActions(data)).toHaveLength(1);
  });

  it("does not count a replacement from another week, person, or deleted record", () => {
    const data = input();
    data.missingEntryEntries.push(entry("2026-08-17"), entry("2026-08-14", { employee_id: "other" }), entry("2026-08-14", { deleted_at: "2026-08-15T00:00:00Z" }));
    expect(missingEntryActions(data)).toHaveLength(1);
  });

  it("accounts for regional holidays", () => {
    expect(missingEntryActions(input({ holidaysByState: new Map([["berlin", new Map([["2026-08-13", "Feiertag"]])]]) }))).toEqual([]);
  });

  it.each(["leave", "sick"])("accounts for %s on an expected day", (type) => {
    const absence = { employee_id: employee.id, start_date: "2026-08-13", end_date: "2026-08-13" };
    expect(missingEntryActions(input({ absences: {
      leaves: type === "leave" ? [absence as LeaveRequest] : [],
      sicknesses: type === "sick" ? [absence as SickEntry] : [],
    } }))).toEqual([]);
  });

  it("does not double-credit work on an excused day", () => {
    expect(missingEntryActions(input({
      missingEntryEntries: [entry("2026-08-10"), entry("2026-08-11"), entry("2026-08-13")],
      holidaysByState: new Map([["berlin", new Map([["2026-08-13", "Feiertag"]])]]),
    }))).toHaveLength(1);
  });

  it("only expects days after employment starts", () => {
    expect(missingEntryActions(input({
      employees: [{ ...employee, employment_start_date: "2026-08-13" }],
      missingEntryEntries: [entry("2026-08-14")],
    }))).toEqual([]);
  });

  it("keeps daily checks for a five-day schedule", () => {
    const actions = missingEntryActions(input({
      employees: [{ ...employee, work_schedule: DEFAULT_WORK_SCHEDULE }],
      startDate: "2026-08-10", endDate: "2026-08-14",
    }));
    expect(actions).toEqual([expect.objectContaining({ id: "missing-employee-1-2026-08-13" })]);
  });

  it("keeps completed-week hints available throughout the following week", () => {
    expect(missingEntryActions(input({ endDate: "2026-08-23" }))).toHaveLength(1);
    expect(getCockpitMissingEntryStart("2026-08-17", "2026-08-23")).toBe("2026-08-10");
  });

  it("loads the full earliest week for a rolling period, across year boundaries", () => {
    expect(getCockpitMissingEntryStart("2026-12-30", "2027-01-28")).toBe("2026-12-28");
  });
});
