import type { ReportEntry } from "@/types/export";
import type { ProjectReportBooking, ProjectReportRow } from "@/types/project";
import { netMinutesForEntry } from "@/services/overtimeService";

export function reportProjectName(entry: Pick<ReportEntry, "project_id" | "project_name">): string {
  return entry.project_name ?? (entry.project_id ? "Unbekanntes Projekt" : "Ohne Projekt");
}

export function reportNetMinutes(entry: ReportEntry): number {
  return Math.max(0, netMinutesForEntry(entry));
}

export function summarizeProjectBookings(bookings: ProjectReportBooking[]) {
  return {
    total_minutes: bookings.reduce((sum, booking) => sum + booking.net_minutes, 0),
    entry_count: bookings.length,
    employee_count: new Set(bookings.map((booking) => booking.employee_id)).size,
    bookings,
  };
}

export function buildProjectReport(entries: ReportEntry[]): ProjectReportRow[] {
  const projects = new Map<string | null, {
    project_name: string;
    customer_name: string | null;
    bookings: ProjectReportBooking[];
  }>();
  for (const entry of entries) {
    const projectId = entry.project_id ?? null;
    const project = projects.get(projectId) ?? {
      project_name: reportProjectName(entry),
      customer_name: entry.project_customer_name ?? null,
      bookings: [],
    };
    project.bookings.push({
      id: entry.id,
      employee_id: entry.employee_id,
      employee_name: `${entry.employee_first_name} ${entry.employee_last_name}`.trim(),
      date: entry.date,
      clock_in: entry.clock_in,
      clock_out: entry.clock_out,
      break_minutes: entry.break_minutes,
      net_minutes: reportNetMinutes(entry),
    });
    projects.set(projectId, project);
  }

  return Array.from(projects, ([project_id, { bookings, ...project }]) => ({
    project_id,
    ...project,
    ...summarizeProjectBookings(bookings),
  })).sort((a, b) => b.total_minutes - a.total_minutes || a.project_name.localeCompare(b.project_name, "de"));
}
