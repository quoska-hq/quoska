import { formatDateFullDE as formatDate } from "@/config/client/date-utils";
import type { Employee, TimeEntry } from "@/types/database";
import type { CockpitActionItem } from "@/types/cockpit";
import { employeeScheduleForDate } from "@/types/work-schedule";
import { addDays, getWeekMonday } from "@/services/holidayService";
import { scheduledEmployeeMinutesForDate } from "@/services/workScheduleService";
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
  const firstMonday = getCockpitMissingEntryStart(input.startDate, input.endDate);
  for (const employee of input.employees) {
    const name = `${employee.first_name} ${employee.last_name}`.trim();
    const holidays = input.holidaysByState.get(employee.bundesland ?? input.tenantState) ?? new Map<string, string>();
    const joinedOn = employmentStartDate(employee);
    const canWork = (date: string) => date >= joinedOn && !holidays.has(date) && !absenceTypeOnDate(employee.id, date, input.absences);
    const recordedDates = new Set((input.missingEntryEntries ?? input.entries)
      .filter((entry) => entry.employee_id === employee.id && !entry.deleted_at)
      .map((entry) => entry.date));

    for (let monday = firstMonday; monday <= currentMonday; monday = addDays(monday, 7)) {
      const sunday = addDays(monday, 6);
      const scheduleDate = sunday < input.endDate ? sunday : input.endDate;
      const plannedDays = Object.values(employeeScheduleForDate(employee, scheduleDate))
        .filter((minutes) => minutes > 0).length;

      const expectedDates: string[] = [];
      let recordedDays = 0;
      for (let date = monday; date <= sunday && date < input.endDate; date = addDays(date, 1)) {
        if (!canWork(date)) continue;
        if (scheduledEmployeeMinutesForDate(employee, date) > 0) expectedDates.push(date);
        if (recordedDates.has(date)) recordedDays++;
      }

      // A shifted day can fall anywhere in the same calendar week, including Sunday.
      // Assess flexible schedules after the week ends.
      if (plannedDays < 5) {
        if (monday === currentMonday || recordedDays >= expectedDates.length) continue;
        actions.push({
          id: `missing-week-${employee.id}-${monday}`,
          kind: "missing_entry", severity: "warning", title: "Zeiteintrag fehlt",
          description: `${name} · Woche ${formatDate(monday)} – ${formatDate(sunday)}`,
          detail: `${recordedDays} von ${expectedDates.length} erwarteten Arbeitstagen erfasst.`,
          employeeId: employee.id, employeeName: name, date: sunday, href: null,
        });
        continue;
      }

      for (const date of expectedDates) {
        if (date < firstDate || recordedDates.has(date)) continue;
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
