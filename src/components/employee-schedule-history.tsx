import { formatDateFullDE } from "@/config/client/date-utils";
import type { Employee } from "@/types/database";
import {
  formatWorkMinutes, normalizeWorkSchedule, totalScheduleMinutes, WORKDAY_KEYS, WORKDAY_LABELS,
} from "@/types/work-schedule";

export function EmployeeScheduleHistory({ employee, today }: { employee: Employee; today: string }) {
  const datedSchedules = Object.entries(employee.work_schedule_history ?? {})
    .sort(([a], [b]) => b.localeCompare(a));
  if (datedSchedules.length === 0) return null;

  const baseline = normalizeWorkSchedule(employee.work_schedule, employee.target_hours_week);
  const schedules = [
    ...datedSchedules.map(([date, schedule]) => ({
      label: `Ab ${formatDateFullDE(date)}${date > today ? " (geplant)" : ""}`, schedule,
    })),
    { label: "Ausgangsmodell", schedule: baseline },
  ];
  return (
    <details className="rounded border p-3 text-sm">
      <summary className="cursor-pointer font-medium">Verlauf der Arbeitszeitmodelle</summary>
      <ul className="mt-2 divide-y">
        {schedules.map(({ label, schedule }) => (
          <li key={label} className="py-2">
            <div className="font-medium">
              {label} · {formatWorkMinutes(totalScheduleMinutes(schedule))}/Woche
            </div>
            <div className="text-muted-foreground">
              {WORKDAY_KEYS.filter((day) => schedule[day] > 0)
                .map((day) => `${WORKDAY_LABELS[day]} ${formatWorkMinutes(schedule[day])}`).join(" · ")}
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
