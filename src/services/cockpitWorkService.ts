import type { Employee, Project, TimeEntry } from "@/types/database";
import type { CockpitProjectRow } from "@/types/cockpit";

export function completedWorkMinutes(entry: TimeEntry): number {
  if (entry.status !== "completed" || !entry.clock_out) return 0;
  const elapsed = (Date.parse(entry.clock_out) - Date.parse(entry.clock_in)) / 60_000;
  return Math.max(0, Math.round(elapsed - (entry.break_minutes ?? 0)));
}

export function buildCockpitProjects(entries: TimeEntry[], projects: Project[], employees: Employee[]): CockpitProjectRow[] {
  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));
  const totals = new Map<string, { minutes: number; employees: Map<string, number> }>();
  for (const entry of entries) {
    const minutes = completedWorkMinutes(entry);
    if (minutes === 0) continue;
    const key = entry.project_id ?? "__none__";
    const total = totals.get(key) ?? { minutes: 0, employees: new Map<string, number>() };
    total.minutes += minutes;
    total.employees.set(entry.employee_id, (total.employees.get(entry.employee_id) ?? 0) + minutes);
    totals.set(key, total);
  }
  const totalMinutes = [...totals.values()].reduce((sum, total) => sum + total.minutes, 0);
  return [...totals]
    .map(([key, total]) => {
      const project = projectMap.get(key);
      return {
        id: key === "__none__" ? null : key,
        name: project?.name ?? (key === "__none__" ? "Ohne Projekt" : "Unbekanntes Projekt"),
        color: project?.color ?? null,
        minutes: total.minutes,
        sharePercent: totalMinutes ? Math.round((total.minutes / totalMinutes) * 100) : 0,
        contributors: [...total.employees].map(([employeeId, minutes]) => {
          const employee = employeeMap.get(employeeId);
          return {
            employeeId,
            name: employee ? `${employee.first_name} ${employee.last_name}`.trim() : "Unbekannter Mitarbeiter",
            minutes,
          };
        }).sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name, "de")),
      };
    })
    .sort((a, b) => b.minutes - a.minutes);
}
