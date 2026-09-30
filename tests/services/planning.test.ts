import { describe, expect, it } from "vitest";
import { planningFixture } from "../fixtures/planning";
import {
  generatePlanningPeriod,
  assignPlanningShift,
  publishPlanningPeriod,
} from "@/services/planningPeriodService";
import {
  buildPlanningJob,
  applyPlanningJob,
} from "@/services/planningOptimizerService";
import { approvePlanningSwap } from "@/services/planningSwapService";
import { planningBalanceForecast } from "@/services/planningBalanceService";
import { planningDateSchema } from "@/types/planning-schemas";

describe("Planning period lifecycle", () => {
  it("generates the recurring slots without silently assigning people", () => {
    const f = planningFixture();
    const p = generatePlanningPeriod(f.state, "2026-10-01", f.context.today);
    expect(p.shifts).toHaveLength(5);
    expect(p.shifts.every((s) => s.employeeId === null)).toBe(true);
  });
  it("limits generation to three months and rejects repeated generation", () => {
    const f = planningFixture();
    expect(() =>
      generatePlanningPeriod(f.state, "2027-01-01", f.context.today),
    ).toThrow();
    f.state.periods.push(
      generatePlanningPeriod(f.state, "2026-10-01", f.context.today),
    );
    expect(() =>
      generatePlanningPeriod(f.state, "2026-10-01", f.context.today),
    ).toThrow();
  });
  it("blocks publication of unfilled plans", () => {
    const f = planningFixture();
    f.state.periods.push(
      generatePlanningPeriod(f.state, "2026-10-01", f.context.today),
    );
    expect(() =>
      publishPlanningPeriod(f.state, f.context, "2026-10-01", "announced"),
    ).toThrow("Freigabe gesperrt");
  });
  it("keeps a published snapshot and preserves fixed locks", () => {
    const f = planningFixture();
    const p = generatePlanningPeriod(f.state, "2026-10-01", f.context.today);
    p.shifts.forEach((s) => {
      s.employeeId = f.context.employees[0].id;
    });
    f.state.periods.push(p);
    publishPlanningPeriod(f.state, f.context, p.month, "fixed");
    expect(p.publishedShifts).not.toBe(p.shifts);
    expect(p.shifts.every((s) => s.locked)).toBe(true);
    expect(() =>
      assignPlanningShift(
        f.state,
        f.context,
        { ...p.shifts[0], employeeId: null },
        "",
      ),
    ).toThrow("Begründung");
  });
  it("sends only identifiers to the optimizer and excludes unavailable people", () => {
    const f = planningFixture();
    f.state.periods.push(
      generatePlanningPeriod(f.state, "2026-10-01", f.context.today),
    );
    f.state.config.profiles[0].availability = [];
    const payload = buildPlanningJob(f.state, f.context, 3, "2026-10-01");
    expect(payload.shifts[0].candidates).toEqual([f.context.employees[1].id]);
    expect(JSON.stringify(payload)).not.toContain("Testperson");
  });
  it("rejects incomplete and lock-changing solver results", () => {
    const f = planningFixture();
    f.state.periods.push(
      generatePlanningPeriod(f.state, "2026-10-01", f.context.today),
    );
    expect(() =>
      applyPlanningJob(f.state, f.context, "2026-10-01", {
        status: "feasible",
        assignments: [],
        wallSeconds: 1,
        message: "",
      }),
    ).toThrow("unvollständig");
  });
  it("rejects stale swap snapshots", () => {
    const f = planningFixture();
    expect(() =>
      approvePlanningSwap(f.state, f.context, f.shift, {
        ...f.shift,
        id: crypto.randomUUID(),
      }),
    ).toThrow("verändert");
  });
  it("keeps Soll, actual and forecast separate and marks ongoing sickness provisional", () => {
    const f = planningFixture();
    f.state.periods.push({
      month: "2026-10-01",
      shifts: [f.shift],
      publishedShifts: [],
      revision: 0,
      status: "draft",
    });
    f.context.absences.push({
      employeeId: f.context.employees[0].id,
      start: "2026-10-10",
      end: null,
    });
    const b = planningBalanceForecast(
      f.state,
      f.context,
      f.context.employees[0],
      "2026-10-01",
    );
    expect(b.plannedMinutes).toBe(360);
    expect(b.actualMinutes).toBe(0);
    expect(b.provisional).toBe(true);
  });
  it("validates actual calendar dates", () => {
    expect(planningDateSchema.safeParse("2026-02-30").success).toBe(false);
    expect(planningDateSchema.safeParse("2028-02-29").success).toBe(true);
  });
});
