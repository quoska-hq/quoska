import { expect, it } from "vitest";
import { planningFixture } from "../fixtures/planning";
import {
  generatePlanningPeriod,
  assignPlanningShift,
  publishPlanningPeriod,
} from "@/services/planningPeriodService";
import { refreshPlanningPeriod } from "@/services/planningRefreshService";
import {
  buildPlanningJob,
  applyPlanningJob,
} from "@/services/planningOptimizerService";
it("rebuilds changed templates while retaining binding shifts and published history", () => {
  const f = planningFixture(),
    p = generatePlanningPeriod(f.state, "2026-10-01", f.context.today);
  p.shifts.forEach((s) => {
    s.employeeId = f.context.employees[0].id;
  });
  f.state.periods.push(p);
  publishPlanningPeriod(f.state, f.context, p.month, "fixed");
  f.state.config.templates[0].active = false;
  const refreshed = refreshPlanningPeriod(f.state, f.context, p.month);
  expect(refreshed.periods[0].shifts).toHaveLength(5);
  expect(refreshed.periods[0].publishedShifts).toEqual(p.publishedShifts);
  p.shifts.forEach((s) => {
    s.locked = false;
  });
  expect(
    refreshPlanningPeriod(f.state, f.context, p.month).periods[0].shifts,
  ).toHaveLength(0);
});
it("allows an explicit unlock even when a new sickness has made the existing assignment invalid", () => {
  const f = planningFixture(),
    p = generatePlanningPeriod(f.state, "2026-10-01", f.context.today);
  p.shifts.forEach((s) => {
    s.employeeId = f.context.employees[0].id;
  });
  f.state.periods.push(p);
  publishPlanningPeriod(f.state, f.context, p.month, "fixed");
  f.context.absences.push({
    employeeId: f.context.employees[0].id,
    start: "2026-10-01",
    end: null,
  });
  const next = assignPlanningShift(
    f.state,
    f.context,
    { ...p.shifts[0], locked: false },
    "Krankmeldung; Ersatzbesetzung berechnen",
  );
  expect(next.periods[0].shifts[0].locked).toBe(false);
  expect(next.periods[0].publishedShifts[0].locked).toBe(true);
});
it("optimizes the remaining horizon together and keeps fixed assignments", () => {
  const f = planningFixture();
  for (const month of ["2026-10-01", "2026-11-01"])
    f.state.periods.push(
      generatePlanningPeriod(f.state, month, f.context.today),
    );
  f.state.periods[0].shifts.forEach((s) => {
    s.employeeId = f.context.employees[0].id;
    s.locked = true;
  });
  const payload = buildPlanningJob(f.state, f.context, 4, "2026-10-01");
  expect(payload.shifts).toHaveLength(9);
  expect(payload.shifts[0].candidates).toEqual([f.context.employees[0].id]);
  const next = applyPlanningJob(f.state, f.context, "2026-10-01", {
    status: "feasible",
    wallSeconds: 1,
    message: "",
    assignments: payload.shifts.map((s) => ({
      shiftId: s.id,
      employeeId: s.fixedEmployeeId ?? f.context.employees[1].id,
    })),
  });
  expect(next.periods.every((p) => p.shifts.every((s) => s.employeeId))).toBe(
    true,
  );
});
