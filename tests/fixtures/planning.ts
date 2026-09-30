import type {
  PlanningContext,
  PlanningShift,
  PlanningState,
} from "@/types/planning";
import { DEFAULT_WORK_SCHEDULE } from "@/types/work-schedule";
import { planningWallTime } from "@/config/client/planning-calendar";
export const P_IDS = {
  employee: "10000000-0000-4000-8000-000000000001",
  other: "10000000-0000-4000-8000-000000000002",
  location: "20000000-0000-4000-8000-000000000001",
  skill: "30000000-0000-4000-8000-000000000001",
  template: "40000000-0000-4000-8000-000000000001",
  demand: "50000000-0000-4000-8000-000000000001",
};
export function planningFixture(): {
  state: PlanningState;
  context: PlanningContext;
  shift: PlanningShift;
} {
  const state: PlanningState = {
    config: {
      firstMonth: null,
      enabled: true,
      travelMinutes: 30,
      locations: [
        {
          id: P_IDS.location,
          name: "Testfiliale",
          bundesland: "berlin",
          additionalHolidays: [],
          localHolidaysConfirmed: true,
        },
      ],
      skills: [{ id: P_IDS.skill, name: "Verkauf" }],
      profiles: [P_IDS.employee, P_IDS.other].map((employeeId) => ({
        employeeId,
        locationIds: [P_IDS.location],
        skillIds: [P_IDS.skill],
        eligibility: "adult_standard",
        validFrom: null,
        validUntil: null,
        availabilityExceptions: [],
        contractChanges: [],
        availability: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
          day,
          start: "00:00",
          end: "24:00",
        })),
        preferredDays: [],
        externalWork: [],
        externalWorkConfirmed: true,
        historyConfirmed: true,
        nightWorkConfirmed: true,
        maxWeeklyMinutes: 2880,
      })),
      templates: [
        {
          id: P_IDS.template,
          active: true,
          name: "Frühdienst",
          locationId: P_IDS.location,
          skillId: P_IDS.skill,
          days: [4],
          start: "06:00",
          end: "12:00",
          nextDay: false,
          count: 1,
          breaks: [],
          authorization: "none",
          authorizationReference: "",
          authorizationFrom: null,
          authorizationUntil: null,
          holidayMode: "skip",
        },
      ],
      demands: [
        {
          id: P_IDS.demand,
          locationId: P_IDS.location,
          skillId: P_IDS.skill,
          days: [4],
          start: "06:00",
          end: "12:00",
          count: 1,
          holidayMode: "skip",
        },
      ],
    },
    periods: [],
  };
  const context: PlanningContext = {
    today: "2026-09-30",
    now: "2026-09-30T10:00:00Z",
    absences: [],
    actual: [],
    employees: [P_IDS.employee, P_IDS.other].map((id, i) => ({
      id,
      name: `Testperson ${i + 1}`,
      targetHoursWeek: 40,
      workSchedule: DEFAULT_WORK_SCHEDULE,
      employmentStart: "2026-09-01",
      openingBalanceMinutes: 0,
      balanceMinutes: 0,
      balanceComplete: true,
      bundesland: "berlin",
    })),
    holidays: [
      { locationId: P_IDS.location, dates: ["2026-10-03"], complete: true },
    ],
    employeeHolidays: [P_IDS.employee, P_IDS.other].map((employeeId) => ({
      employeeId,
      dates: ["2026-10-03"],
    })),
  };
  const shift: PlanningShift = {
    id: "60000000-0000-4000-8000-000000000001",
    templateId: P_IDS.template,
    locationId: P_IDS.location,
    skillId: P_IDS.skill,
    date: "2026-10-01",
    start: planningWallTime("2026-10-01", "06:00"),
    end: planningWallTime("2026-10-01", "12:00"),
    breaks: [],
    employeeId: P_IDS.employee,
    locked: false,
    substituteDate: null,
  };
  return { state, context, shift };
}
