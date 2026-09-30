import type { EmploymentSchedule } from "@/types/employment-schedule";
import { normalizeEmploymentScheduleForDate } from "@/types/employment-schedule";
import { totalScheduleMinutes, type WorkSchedule } from "@/types/work-schedule";
import { getTodayDate } from "@/config/server/timestamps";
const MINUTES_PER_HOUR = 60;
export function presentEmploymentSchedule<
  T extends {
    employment_schedule?: EmploymentSchedule | null;
    work_schedule?: WorkSchedule;
    target_hours_week: number;
  },
>(employee: T, date = getTodayDate()): T {
  if (!employee.employment_schedule) return employee;
  const schedule = normalizeEmploymentScheduleForDate(
    employee.employment_schedule,
    date,
    employee.target_hours_week,
  );
  return {
    ...employee,
    work_schedule: schedule,
    target_hours_week: totalScheduleMinutes(schedule) / MINUTES_PER_HOUR,
  };
}
