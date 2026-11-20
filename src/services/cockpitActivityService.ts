import type { Employee, Project } from "@/types/database";
import type { CorrectionRequestWithEntry } from "@/types/correction";
import type {
  CockpitActivityCategory,
  CockpitActivityRow,
} from "@/types/cockpit";
import type { CockpitAuditRecord } from "@/repos/cockpitRepo";
import { correctionChangeSummary, correctionEntryDate } from "@/lib/correction-format";

const FIELD_LABELS: Record<string, string> = {
  clock_in: "Startzeit",
  clock_out: "Endzeit",
  break_minutes: "Pausenzeit",
  notes: "Notiz",
  status: "Status",
  project_id: "Projekt",
};

// Internal attribution changes remain in the immutable audit trail, but are
// implementation details of the visible break correction in the activity log.
const INTERNAL_AUDIT_FIELDS = new Set(["automatic_break_minutes"]);

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
  if (record.action === "create" && record.field_name === "manual_entry") return "Zeit manuell hinzugefügt";
  if (record.action === "create") return "Eingestempelt";
  if (record.action === "pause") return "Pause gestartet";
  if (record.action === "resume") return "Pause beendet";
  if (record.action === "delete") return record.field_name === "deleted_at" ? "Zeiteintrag storniert" : "Zeiteintrag gelöscht";
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

function activityDetail(record: CockpitAuditRecord, projectNames: Map<string, string>): string | null {
  if (record.action === "delete" && record.field_name === "deleted_at") return null;
  if (record.field_name === "project_id") {
    const projectName = (id: string | null) => id ? projectNames.get(id) ?? "Unbekanntes Projekt" : "Kein Projekt";
    return `${projectName(record.old_value)} → ${projectName(record.new_value)}`;
  }
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

  const auditRows = records
    .filter((record) => !INTERNAL_AUDIT_FIELDS.has(record.field_name ?? ""))
    .map((record) => {
      const targetId = record.timeEntry.employee_id;
      return {
        id: record.id,
        occurredAt: record.changed_at,
        category: activityCategory(record),
        title: activityTitle(record),
        detail: activityDetail(record, projectNames),
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
      title: request.request_type === "missing_entry"
        ? request.status === "approved" ? request.reviewed_by ? "Zeitnachtrag genehmigt" : "Zeitnachtrag direkt gebucht"
          : request.status === "rejected" ? "Zeitnachtrag abgelehnt" : "Zeitnachtrag angefragt"
        : request.status === "approved"
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
      entryDate: correctionEntryDate(request),
    };
  });

  return [...auditRows, ...correctionRows]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}
