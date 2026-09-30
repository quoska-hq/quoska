import { describe, expect, it } from "vitest";
import { PLANNING_EMPLOYEES } from "@/config/planning-preview";
import {
  advancePlanningMonth,
  applyPlanningProposal,
  assignmentProblem,
  initialPlanningState,
  proposePlanning,
  reassignPlanningShift,
  rollPlanningHorizon,
  swapPlanningShifts,
} from "@/services/planningPreviewService";

describe("fictional planning preview", () => {
  it("generates assignments that satisfy its demo constraints, including across month boundaries", () => {
    const state = initialPlanningState();
    const conflicts = state.shifts
      .filter((shift) => shift.employeeId)
      .flatMap((shift) => {
        const person = PLANNING_EMPLOYEES.find(
          (employee) => employee.id === shift.employeeId,
        )!;
        const error = assignmentProblem(state.shifts, shift, person);
        return error ? [`${shift.id}: ${error}`] : [];
      });
    expect(conflicts).toEqual([]);
    expect(
      state.shifts.filter(
        (shift) => shift.date.startsWith("2026-10") && !shift.employeeId,
      ),
    ).toHaveLength(0);
  });

  it("does not mutate a plan when computing or discarding a suggestion", () => {
    const state = initialPlanningState();
    const before = structuredClone(state);
    const proposal = proposePlanning(state, "2026-11");
    expect(state).toEqual(before);
    expect(proposal.changes.length).toBeGreaterThan(0);
    expect(proposal.remaining).toBe(0);
    const next = applyPlanningProposal(state, "2026-11", proposal);
    expect(
      next.shifts.filter(
        (shift) => shift.date.startsWith("2026-11") && !shift.employeeId,
      ),
    ).toHaveLength(0);
    expect(state).toEqual(before);
    expect(next.shifts.filter((shift) => shift.locked)).toEqual(
      before.shifts.filter((shift) => shift.locked),
    );
  });

  it("protects fixed months from direct edits, suggestions and swaps", () => {
    const state = initialPlanningState();
    const fixed = state.shifts.find((shift) =>
      shift.date.startsWith("2026-10"),
    )!;
    expect(proposePlanning(state, "2026-10").changes).toEqual([]);
    expect(
      reassignPlanningShift(state, fixed.id, null, false).error,
    ).toBeTruthy();
    expect(
      applyPlanningProposal(state, "2026-10", {
        changes: [{ shiftId: fixed.id, employeeId: "e1" }],
        remaining: 0,
      }),
    ).toBe(state);
    const other = state.shifts.find(
      (shift) =>
        shift.date.startsWith("2026-10") &&
        shift.employeeId !== fixed.employeeId,
    )!;
    expect(swapPlanningShifts(state, fixed.id, other.id).error).toBeTruthy();
  });

  it("rejects vacation, missing skills, incompatible branches and adjacent late/early shifts", () => {
    const state = initialPlanningState();
    const vacation = state.shifts.find(
      (shift) => shift.id === "2026-11-02-markt-backen",
    )!;
    expect(assignmentProblem([], vacation, PLANNING_EMPLOYEES[0])).toContain(
      "Urlaub",
    );
    expect(assignmentProblem([], vacation, PLANNING_EMPLOYEES[10])).toContain(
      "Kompetenz",
    );
    const early = state.shifts.find(
      (shift) => shift.id === "2026-11-03-bahnhof-frueh",
    )!;
    expect(assignmentProblem([], early, PLANNING_EMPLOYEES[6])).toContain(
      "Filiale",
    );
    const late = {
      ...state.shifts.find((shift) => shift.id === "2026-11-02-markt-spaet")!,
      employeeId: "e5",
    };
    expect(assignmentProblem([late], early, PLANNING_EMPLOYEES[4])).toContain(
      "Ruhezeit",
    );
  });

  it("revalidates stale suggestions and never overwrites manually assigned or locked slots", () => {
    const state = initialPlanningState();
    const proposal = proposePlanning(state, "2026-11");
    const change = proposal.changes[0];
    const edited = reassignPlanningShift(
      state,
      change.shiftId,
      change.employeeId,
      true,
    ).state;
    const next = applyPlanningProposal(edited, "2026-11", proposal);
    expect(next.shifts.find((shift) => shift.id === change.shiftId)).toEqual(
      edited.shifts.find((shift) => shift.id === change.shiftId),
    );
  });

  it("requires full coverage before publishing and locks the announced month after approval", () => {
    const state = initialPlanningState();
    expect(advancePlanningMonth(state, "2026-11").error).toContain("offenen");
    const filled = applyPlanningProposal(
      state,
      "2026-11",
      proposePlanning(state, "2026-11"),
    );
    const result = advancePlanningMonth(filled, "2026-11");
    expect(result.error).toBeNull();
    expect(
      result.state.months.find((month) => month.id === "2026-11")?.status,
    ).toBe("fixed");
    expect(state.months.find((month) => month.id === "2026-11")?.status).toBe(
      "announced",
    );
  });

  it("only swaps compatible services in announced months and preserves valid assignments", () => {
    const state = initialPlanningState();
    const first = state.shifts.find(
      (shift) => shift.date.startsWith("2026-11") && shift.employeeId === "e5",
    )!;
    const compatible = state.shifts.find(
      (shift) =>
        shift.id !== first.id &&
        !swapPlanningShifts(state, first.id, shift.id).error,
    )!;
    expect(compatible).toBeDefined();
    const result = swapPlanningShifts(state, first.id, compatible.id);
    expect(result.error).toBeNull();
    expect(
      result.state.shifts.find((shift) => shift.id === first.id)?.employeeId,
    ).toBe(compatible.employeeId);
    expect(
      result.state.shifts.find((shift) => shift.id === compatible.id)
        ?.employeeId,
    ).toBe(first.employeeId);
    for (const id of [first.id, compatible.id]) {
      const shift = result.state.shifts.find((item) => item.id === id)!;
      expect(
        assignmentProblem(
          result.state.shifts,
          shift,
          PLANNING_EMPLOYEES.find(
            (employee) => employee.id === shift.employeeId,
          )!,
        ),
      ).toBeNull();
    }
  });

  it("rolls exactly three months and validates the new year across the retained month boundary", () => {
    const state = initialPlanningState();
    expect(rollPlanningHorizon(state).error).toBeTruthy();
    const filled = applyPlanningProposal(
      state,
      "2026-11",
      proposePlanning(state, "2026-11"),
    );
    const fixed = advancePlanningMonth(filled, "2026-11").state;
    const result = rollPlanningHorizon(fixed);
    expect(result.error).toBeNull();
    expect(result.state.months.map((month) => month.id)).toEqual([
      "2026-11",
      "2026-12",
      "2027-01",
    ]);
    expect(result.state.months[2].status).toBe("draft");
    expect(
      result.state.shifts.filter((shift) => shift.date < "2027-01-01"),
    ).toEqual(fixed.shifts);
    const next = result.state.shifts.filter((shift) =>
      shift.date.startsWith("2027-01"),
    );
    expect(next).toHaveLength(186);
    expect(next.every((shift) => shift.employeeId)).toBe(true);
    for (const shift of next)
      expect(
        assignmentProblem(
          result.state.shifts,
          shift,
          PLANNING_EMPLOYEES.find(
            (employee) => employee.id === shift.employeeId,
          )!,
        ),
      ).toBeNull();
  });
});
