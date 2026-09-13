import { formatDateFullDE as formatDate } from "@/config/client/date-utils";
import type { Employee, TimeEntry } from "@/types/database";
import type { CockpitActionItem } from "@/types/cockpit";
import { normalizeWorkSchedule } from "@/types/work-schedule";
import { addDays, getWeekMonday } from "@/services/holidayService";
import { scheduledMinutesForDate } from "@/services/workScheduleService";
import { employmentStartDate } from "@/services/overtimeService";
import { absenceTypeOnDate, type CockpitAbsences } from "@/services/cockpitAbsenceService";
import { getCockpitMissingEntryStart } from "@/services/cockpitPeriodService";

interface MissingEntryInput {
  employees: Employee[];
  entries: TimeEntry[];
  missingEntryEntries?: TimeEntry[];
  absences: CockpitAbsences;
  holidaysByState: Map<string, ReadonlyMap<string, string>>;
  tenantState: string;
  startDate: string;
  endDate: string;
}

export function missingEntryActions(input: MissingEntryInput): CockpitActionItem[] {
  const actions: CockpitActionItem[] = [];
  const currentMonday = getWeekMonday(input.endDate);
  const firstDate = input.startDate > addDays(input.endDate, -6) ? input.startDate : addDays(input.endDate, -6);
  for (const employee of input.employees) {
    const name = `${employee.first_name} ${employee.last_name}`.trim();
    const holidays = input.holidaysByState.get(employee.bundesland ?? input.tenantState) ?? new Map<string, string>();
    const joinedOn = employmentStartDate(employee);
    const canWork = (date: string) => date >= joinedOn && !holidays.has(date) && !absenceTypeOnDate(employee.id, date, input.absences);
    const isExpected = (date: string) => canWork(date) && scheduledMinutesForDate(employee.work_schedule, date, employee.target_hours_week) > 0;
    const recordedDates = new Set((input.missingEntryEntries ?? input.entries)
      .filter((entry) => entry.employee_id === employee.id && !entry.deleted_at)
      .map((entry) => entry.date));
    const plannedDays = Object.values(normalizeWorkSchedule(employee.work_schedule, employee.target_hours_week))
      .filter((minutes) => minutes > 0).length;

    if (plannedDays < 5) {
      // A shifted day can fall anywhere in the same calendar week, including Sunday.
      // Assess only completed weeks and include the previous week in the weekly view.
      for (let monday = getCockpitMissingEntryStart(input.startDate, input.endDate); monday < currentMonday; monday = addDays(monday, 7)) {
        let expectedDays = 0;
        let recordedDays = 0;
        const sunday = addDays(monday, 6);
        for (let date = monday; date <= sunday; date = addDays(date, 1)) {
          if (isExpected(date)) expectedDays++;
          if (canWork(date) && recordedDates.has(date)) recordedDays++;
        }
        if (recordedDays >= expectedDays) continue;
        actions.push({
          id: `missing-week-${employee.id}-${monday}`,
          kind: "missing_entry", severity: "warning", title: "Zeiteintrag fehlt",
          description: `${name} · Woche ${formatDate(monday)} – ${formatDate(sunday)}`,
          detail: `${recordedDays} von ${expectedDays} erwarteten Arbeitstagen erfasst.`,
          employeeId: employee.id, employeeName: name, date: sunday, href: null,
        });
      }
    } else {
      for (let date = firstDate; date < input.endDate; date = addDays(date, 1)) {
        if (!isExpected(date) || recordedDates.has(date)) continue;
        actions.push({
          id: `missing-${employee.id}-${date}`,
          kind: "missing_entry", severity: "warning", title: "Zeiteintrag fehlt",
          description: `${name} · ${formatDate(date)}`,
          employeeId: employee.id, employeeName: name, date, href: null,
        });
      }
    }
  }
  return actions;
}
