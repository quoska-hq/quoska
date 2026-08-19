import type { Employee, Project } from "@/types/database";
import type { CorrectionRequestWithEntry } from "@/types/correction";
import type {
  CockpitActivityCategory,
  CockpitActivityRow,
} from "@/types/cockpit";
import type { CockpitAuditRecord } from "@/repos/cockpitRepo";
import { correctionChangeSummary } from "@/lib/correction-format";

const FIELD_LABELS: Record<string, string> = {
  clock_in: "Startzeit",
  clock_out: "Endzeit",
  break_minutes: "Pausenzeit",
  notes: "Notiz",
  status: "Status",
  project_id: "Projekt",
};

function activityCategory(
  record: CockpitAuditRecord,
): CockpitActivityCategory {
  if (record.action === "pause" || record.action === "resume") return "break";
  if (record.action === "create") return "clock";
  if (
    record.action === "update" &&
    record.field_name === "clock_out" &&
    record.reason === "Clock out"
  ) {
    return "clock";
  }
  return "correction";
}

function activityTitle(record: CockpitAuditRecord): string {
  if (record.action === "create") return "Eingestempelt";
  if (record.action === "pause") return "Pause gestartet";
  if (record.action === "resume") return "Pause beendet";
  if (record.action === "delete") return "Zeiteintrag gelöscht";
  if (
    record.action === "update" &&
    record.field_name === "clock_out" &&
    record.reason === "Clock out"
  ) {
    return "Ausgestempelt";
  }
  return "Zeiteintrag korrigiert";
}

function formatValue(field: string | null, value: string | null): string {
  if (value === null || value === "") return "–";
  if ((field === "clock_in" || field === "clock_out") && value.includes("T")) {
    return new Intl.DateTimeFormat("de-DE", {
      timeZone: "Europe/Berlin",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(Date.parse(value));
  }
  if (field === "break_minutes") return `${value} Min.`;
  return value;
}

function activityDetail(record: CockpitAuditRecord): string | null {
  const category = activityCategory(record);
  if (category === "correction") {
    const field = FIELD_LABELS[record.field_name ?? ""] ?? "Eintrag";
    if (record.old_value !== null || record.new_value !== null) {
      return `${field}: ${formatValue(record.field_name, record.old_value)} → ${formatValue(record.field_name, record.new_value)}`;
    }
    return field;
  }
  return null;
}

export function buildCockpitActivity(
  records: CockpitAuditRecord[],
  employees: Employee[],
  projects: Project[],
  corrections: CorrectionRequestWithEntry[] = [],
): CockpitActivityRow[] {
  const employeeNames = new Map(
    employees.map((employee) => [
      employee.id,
      `${employee.first_name} ${employee.last_name}`.trim(),
    ]),
  );
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));

  const auditRows = records.map((record) => {
    const targetId = record.timeEntry.employee_id;
    return {
      id: record.id,
      occurredAt: record.changed_at,
      category: activityCategory(record),
      title: activityTitle(record),
      detail: activityDetail(record),
      reason: record.reason && !["Clock in", "Clock out"].includes(record.reason)
        ? record.reason
        : null,
      employeeId: targetId,
      employeeName: employeeNames.get(targetId) ?? "Unbekannt",
      actorName: record.changed_by
        ? employeeNames.get(record.changed_by) ?? "Unbekannt"
        : "System",
      projectName: record.timeEntry.project_id
        ? projectNames.get(record.timeEntry.project_id) ?? "Unbekanntes Projekt"
        : null,
      entryDate: record.timeEntry.date,
    };
  });

  const correctionRows: CockpitActivityRow[] = corrections.map((request) => {
    const targetId = request.employee_id;
    const actorId = request.status === "pending"
      ? request.employee_id
      : request.reviewed_by ?? request.employee_id;
    return {
      id: `correction-request-${request.id}`,
      occurredAt: request.status === "pending" ? request.created_at : request.updated_at,
      category: "correction",
      title: request.status === "approved"
        ? "Korrekturanfrage genehmigt"
        : request.status === "rejected"
          ? "Korrekturanfrage abgelehnt"
          : "Korrektur angefragt",
      detail: correctionChangeSummary({
        proposed_change: request.proposed_change,
        // Once approved, the related entry already contains the new value;
        // the immutable audit row below owns the true old/new comparison.
        timeEntry: request.status === "approved" ? null : request.timeEntry,
      }),
      reason: request.reason,
      employeeId: targetId,
      employeeName: employeeNames.get(targetId) ?? "Unbekannt",
      actorName: employeeNames.get(actorId) ?? "Unbekannt",
      projectName: request.timeEntry?.project_id
        ? projectNames.get(request.timeEntry.project_id) ?? "Unbekanntes Projekt"
        : null,
      entryDate: request.timeEntry?.date ?? request.created_at.slice(0, 10),
    };
  });

  return [...auditRows, ...correctionRows]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}
