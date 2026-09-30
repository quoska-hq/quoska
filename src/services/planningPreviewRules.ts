import {
  epochToDate,
  formatDateFullDE,
  getDayOfWeekFromEpoch,
} from "@/config/client/date-utils";
import {
  PLANNING_ABSENCES,
  PLANNING_TEMPLATES,
  PREVIEW_REST_MINUTES,
  PREVIEW_WEEKLY_MAX_MINUTES,
} from "@/config/planning-preview";
import type { PlanningEmployee, PlanningShift } from "@/types/planning-preview";

export const dayNumber = (date: string) =>
  Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
export const addPlanningDays = (date: string, count: number) =>
  epochToDate(dayNumber(date) + count);
export const planningWeek = (date: string) =>
  addPlanningDays(date, -((getDayOfWeekFromEpoch(dayNumber(date)) + 6) % 7));
export const planningDate = formatDateFullDE;
export const planningTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
export const planningHours = (minutes: number) =>
  (minutes / 60).toLocaleString("de-DE", { maximumFractionDigits: 1 });
export const getPlanningTemplate = (id: string) =>
  PLANNING_TEMPLATES.find((template) => template.id === id)!;
export const shiftMinutes = (shift: PlanningShift) => {
  const template = getPlanningTemplate(shift.templateId);
  return template.end - template.start - template.breakMinutes;
};

export function absenceFor(employeeId: string, date: string) {
  return PLANNING_ABSENCES.find(
    (absence) =>
      absence.employeeId === employeeId &&
      date >= absence.from &&
      date <= absence.to,
  );
}

export function weeklyMinutes(
  shifts: PlanningShift[],
  employeeId: string,
  date: string,
) {
  const start = planningWeek(date);
  const end = addPlanningDays(start, 6);
  return shifts
    .filter(
      (shift) =>
        shift.employeeId === employeeId &&
        shift.date >= start &&
        shift.date <= end,
    )
    .reduce((sum, shift) => sum + shiftMinutes(shift), 0);
}

// Deliberately small, deterministic demo validator. This is not a legal rule engine.
export function assignmentProblem(
  shifts: PlanningShift[],
  shift: PlanningShift,
  employee: PlanningEmployee,
): string | null {
  const template = getPlanningTemplate(shift.templateId);
  if (!employee.locations.includes(shift.locationId))
    return "Für diese Filiale nicht eingeplant";
  if (!template.skills.every((skill) => employee.skills.includes(skill)))
    return "Erforderliche Kompetenz fehlt";
  const absence = absenceFor(employee.id, shift.date);
  if (absence) return `${absence.label} am ${planningDate(shift.date)}`;
  const others = shifts.filter(
    (other) => other.id !== shift.id && other.employeeId === employee.id,
  );
  if (others.some((other) => other.date === shift.date))
    return "An diesem Tag bereits eingeteilt";
  const start = dayNumber(shift.date) * 1440 + template.start;
  const end = dayNumber(shift.date) * 1440 + template.end;
  for (const other of others) {
    const otherTemplate = getPlanningTemplate(other.templateId);
    const otherStart = dayNumber(other.date) * 1440 + otherTemplate.start;
    const otherEnd = dayNumber(other.date) * 1440 + otherTemplate.end;
    const gap = otherStart >= end ? otherStart - end : start - otherEnd;
    if (gap < PREVIEW_REST_MINUTES) return "Weniger als 11 Stunden Ruhezeit";
  }
  if (
    weeklyMinutes(others, employee.id, shift.date) + shiftMinutes(shift) >
    PREVIEW_WEEKLY_MAX_MINUTES
  )
    return "Mehr als 40 geplante Wochenstunden";
  return null;
}
