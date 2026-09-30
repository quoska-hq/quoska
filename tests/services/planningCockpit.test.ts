import { expect, it } from "vitest";
import { planningExpectedDays } from "@/services/planningCockpitService";
import { missingEntryActions } from "@/services/cockpitMissingEntryService";
import { planningFixture } from "../fixtures/planning";
import type { Employee } from "@/types/database";
it("uses binding duties for missing-entry reminders without rewriting contractual Soll", () => {
  const f = planningFixture();
  f.state.periods = [
    {
      month: "2026-10-01",
      status: "fixed",
      revision: 1,
      shifts: [f.shift],
      publishedShifts: [f.shift],
    },
  ];
  const planningDays = planningExpectedDays(f.state);
  const employee = {
    id: f.shift.employeeId,
    first_name: "Test",
    last_name: "Person",
    work_schedule: f.context.employees[0].workSchedule,
    target_hours_week: 40,
    bundesland: "berlin",
    employment_start_date: "2026-01-01",
    created_at: "2026-01-01T00:00:00Z",
  } as Employee;
  const actions = missingEntryActions({
    employees: [employee],
    entries: [],
    absences: { leaves: [], sicknesses: [] },
    holidaysByState: new Map(),
    tenantState: "berlin",
    startDate: "2026-10-01",
    endDate: "2026-10-05",
    planningDays,
  });
  expect(actions.map((a) => a.date)).toEqual(["2026-10-01"]);
  expect(employee.work_schedule!.friday).toBe(480);
  f.state.periods[0].status = "announced";
  expect(planningExpectedDays(f.state)).toEqual({});
});
