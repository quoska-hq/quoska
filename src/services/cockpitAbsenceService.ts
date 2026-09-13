import type { LeaveRequest, SickEntry } from "@/types/database";

export interface CockpitAbsences {
  leaves: LeaveRequest[];
  sicknesses: SickEntry[];
}

export function absenceTypeOnDate(
  employeeId: string,
  date: string,
  absences: CockpitAbsences,
): "leave" | "sick" | null {
  const sick = absences.sicknesses.some((entry) =>
    entry.employee_id === employeeId &&
    entry.start_date <= date &&
    (entry.end_date === null || entry.end_date >= date));
  if (sick) return "sick";
  const leave = absences.leaves.some((entry) =>
    entry.employee_id === employeeId &&
    entry.start_date <= date &&
    entry.end_date >= date);
  return leave ? "leave" : null;
}

export function countEmployeeAbsenceDays(
  employeeId: string,
  dates: string[],
  absences: CockpitAbsences,
): { leaveDays: number; sickDays: number } {
  let leaveDays = 0;
  let sickDays = 0;
  for (const date of dates) {
    const type = absenceTypeOnDate(employeeId, date, absences);
    if (type === "leave") leaveDays++;
    if (type === "sick") sickDays++;
  }
  return { leaveDays, sickDays };
}

