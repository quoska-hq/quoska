import {
  PLANNING_EMPLOYEES,
  PLANNING_LOCATIONS,
  PLANNING_MONTHS,
  PLANNING_TEMPLATES,
} from "@/config/planning-preview";
import type {
  PlanningEmployee,
  PlanningProposal,
  PlanningShift,
  PlanningState,
} from "@/types/planning-preview";
import {
  addPlanningDays,
  assignmentProblem,
  weeklyMinutes,
} from "./planningPreviewRules";
export * from "./planningPreviewRules";

function candidateScore(
  shifts: PlanningShift[],
  employee: PlanningEmployee,
  shift: PlanningShift,
) {
  const utilization =
    weeklyMinutes(shifts, employee.id, shift.date) /
    (employee.weeklyHours * 60);
  // Keep rare baking skills available for the backroom.
  const reserve =
    shift.templateId !== "backen" && employee.skills.includes("Backstube")
      ? 3
      : 0;
  return utilization + employee.balanceHours / 200 + reserve;
}

export function proposePlanning(
  state: PlanningState,
  monthId: string,
): PlanningProposal {
  if (state.months.find((month) => month.id === monthId)?.status === "fixed")
    return { changes: [], remaining: 0 };
  const shifts = state.shifts.map((shift) => ({ ...shift }));
  const changes: PlanningProposal["changes"] = [];
  for (const shift of shifts.filter(
    (item) => item.date.startsWith(monthId) && !item.employeeId && !item.locked,
  )) {
    const candidates = PLANNING_EMPLOYEES.filter(
      (employee) => !assignmentProblem(shifts, shift, employee),
    );
    candidates.sort(
      (a, b) =>
        candidateScore(shifts, a, shift) - candidateScore(shifts, b, shift) ||
        a.id.localeCompare(b.id),
    );
    if (candidates[0]) {
      shift.employeeId = candidates[0].id;
      changes.push({ shiftId: shift.id, employeeId: shift.employeeId });
    }
  }
  return {
    changes,
    remaining: shifts.filter(
      (shift) => shift.date.startsWith(monthId) && !shift.employeeId,
    ).length,
  };
}

export function applyPlanningProposal(
  state: PlanningState,
  monthId: string,
  proposal: PlanningProposal,
): PlanningState {
  if (state.months.find((month) => month.id === monthId)?.status === "fixed")
    return state;
  const shifts = state.shifts.map((shift) => ({ ...shift }));
  // Revalidate every assignment; stale suggestions cannot override an edited or locked shift.
  for (const change of proposal.changes) {
    const shift = shifts.find((item) => item.id === change.shiftId);
    const employee = PLANNING_EMPLOYEES.find(
      (item) => item.id === change.employeeId,
    );
    if (
      shift &&
      employee &&
      shift.date.startsWith(monthId) &&
      !shift.locked &&
      !shift.employeeId &&
      !assignmentProblem(shifts, shift, employee)
    )
      shift.employeeId = employee.id;
  }
  return { ...state, shifts };
}

export function makeMonthShifts(monthId: string): PlanningShift[] {
  const shifts: PlanningShift[] = [];
  for (
    let date = `${monthId}-01`;
    date.startsWith(monthId);
    date = addPlanningDays(date, 1)
  ) {
    for (const location of PLANNING_LOCATIONS) {
      for (const template of PLANNING_TEMPLATES) {
        shifts.push({
          id: `${date}-${location.id}-${template.id}`,
          date,
          locationId: location.id,
          templateId: template.id,
          employeeId: null,
          locked: false,
        });
      }
    }
  }
  return shifts;
}

export function initialPlanningState(): PlanningState {
  let state: PlanningState = {
    months: PLANNING_MONTHS.map((month) => ({ ...month, status: "draft" })),
    shifts: PLANNING_MONTHS.flatMap((month) => makeMonthShifts(month.id)),
  };
  for (const month of state.months)
    state = applyPlanningProposal(
      state,
      month.id,
      proposePlanning(state, month.id),
    );
  // Intentional gaps for the interactive repair flow, plus one protected assignment.
  const gaps = [
    "2026-11-03-markt-frueh",
    "2026-11-05-bahnhof-spaet",
    "2026-12-07-markt-backen",
  ];
  return {
    months: PLANNING_MONTHS.map((month) => ({ ...month })),
    shifts: state.shifts.map((shift) => ({
      ...shift,
      employeeId: gaps.includes(shift.id) ? null : shift.employeeId,
      locked:
        shift.date === "2026-11-02" &&
        shift.locationId === "markt" &&
        shift.templateId === "backen",
    })),
  };
}

export function reassignPlanningShift(
  state: PlanningState,
  shiftId: string,
  employeeId: string | null,
  locked: boolean,
): { state: PlanningState; error: string | null } {
  const shift = state.shifts.find((item) => item.id === shiftId);
  if (
    !shift ||
    state.months.find((month) => shift.date.startsWith(month.id))?.status ===
      "fixed"
  )
    return { state, error: "Dieser Monat ist verbindlich und gesperrt." };
  const employee = PLANNING_EMPLOYEES.find((item) => item.id === employeeId);
  if (employeeId && !employee)
    return { state, error: "Mitarbeitende nicht gefunden." };
  if (employee) {
    const error = assignmentProblem(state.shifts, shift, employee);
    if (error) return { state, error };
  }
  return {
    state: {
      ...state,
      shifts: state.shifts.map((item) =>
        item.id === shiftId
          ? { ...item, employeeId, locked: !!employeeId && locked }
          : item,
      ),
    },
    error: null,
  };
}

export function swapPlanningShifts(
  state: PlanningState,
  firstId: string,
  secondId: string,
): { state: PlanningState; error: string | null } {
  const first = state.shifts.find((shift) => shift.id === firstId);
  const second = state.shifts.find((shift) => shift.id === secondId);
  if (
    !first?.employeeId ||
    !second?.employeeId ||
    first.employeeId === second.employeeId
  )
    return {
      state,
      error: "Bitte zwei Dienste unterschiedlicher Personen wählen.",
    };
  if (first.locked || second.locked)
    return { state, error: "Eine der Schichten ist fixiert." };
  if (
    first.date.slice(0, 7) !== second.date.slice(0, 7) ||
    state.months.find((month) => first.date.startsWith(month.id))?.status !==
      "announced"
  )
    return { state, error: "Tausch ist in angekündigten Monaten möglich." };
  const shifts = state.shifts.map((shift) =>
    shift.id === firstId
      ? { ...shift, employeeId: second.employeeId }
      : shift.id === secondId
        ? { ...shift, employeeId: first.employeeId }
        : shift,
  );
  for (const id of [firstId, secondId]) {
    const shift = shifts.find((item) => item.id === id)!;
    const employee = PLANNING_EMPLOYEES.find(
      (item) => item.id === shift.employeeId,
    )!;
    const error = assignmentProblem(shifts, shift, employee);
    if (error) return { state, error };
  }
  return { state: { ...state, shifts }, error: null };
}

export function advancePlanningMonth(
  state: PlanningState,
  monthId: string,
): { state: PlanningState; error: string | null } {
  const month = state.months.find((item) => item.id === monthId);
  if (!month || month.status === "fixed")
    return { state, error: "Dieser Monat ist bereits verbindlich." };
  const shifts = state.shifts.filter((shift) => shift.date.startsWith(monthId));
  if (!shifts.length || shifts.some((shift) => !shift.employeeId))
    return { state, error: "Bitte zuerst alle offenen Schichten besetzen." };
  for (const shift of shifts) {
    const employee = PLANNING_EMPLOYEES.find(
      (item) => item.id === shift.employeeId,
    )!;
    const error = assignmentProblem(state.shifts, shift, employee);
    if (error) return { state, error };
  }
  return {
    state: {
      ...state,
      months: state.months.map((item) =>
        item.id === monthId
          ? { ...item, status: item.status === "draft" ? "announced" : "fixed" }
          : item,
      ),
    },
    error: null,
  };
}

export function rollPlanningHorizon(state: PlanningState): {
  state: PlanningState;
  error: string | null;
} {
  if (state.months[1]?.status !== "fixed")
    return {
      state,
      error:
        "Bitte den nächsten Monat zuerst vollständig besetzen und verbindlich freigeben.",
    };
  const last = state.months.at(-1)!;
  const id = addPlanningDays(`${last.id}-28`, 4).slice(0, 7);
  const names = [
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
  ];
  const next: PlanningState = {
    months: [
      ...state.months.slice(1),
      { id, name: names[Number(id.slice(5)) - 1], status: "draft" },
    ],
    // Keep past assignments so week totals and rest periods remain correct at the boundary.
    shifts: [...state.shifts, ...makeMonthShifts(id)],
  };
  return {
    state: applyPlanningProposal(next, id, proposePlanning(next, id)),
    error: null,
  };
}
