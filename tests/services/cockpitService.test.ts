import { describe, expect, it } from "vitest";
import { buildCockpitData } from "@/services/cockpitService";
import type { Employee, Project, TimeEntry } from "@/types/database";
import type { CockpitAuditRecord } from "@/repos/cockpitRepo";
import type { CorrectionRequestWithEntry } from "@/types/correction";

const employee: Employee = {
  id: "11111111-1111-4111-8111-111111111111",
  tenant_id: "tenant-1",
  user_id: "user-1",
  first_name: "Anna",
  last_name: "Admin",
  email: "anna@example.test",
  role: "admin",
  target_hours_week: 40,
  work_schedule: {
    monday: 480, tuesday: 480, wednesday: 480, thursday: 480,
    friday: 480, saturday: 0, sunday: 0,
  },
  bundesland: "berlin",
  invitation_token: null,
  invited_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  deleted_at: null,
};

const project: Project = {
  id: "22222222-2222-4222-8222-222222222222",
  tenant_id: "tenant-1",
  name: "Website",
  customer_name: "Kunde",
  color: "#6658d3",
  active: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  deleted_at: null,
};

const completedEntry: TimeEntry = {
  id: "33333333-3333-4333-8333-333333333333",
  tenant_id: "tenant-1",
  employee_id: employee.id,
  date: "2026-08-10",
  clock_in: "2026-08-10T07:00:00.000Z",
  clock_out: "2026-08-10T15:30:00.000Z",
  break_minutes: 30,
  status: "completed",
  notes: null,
  project_id: project.id,
  created_at: "2026-08-10T07:00:00.000Z",
  updated_at: "2026-08-10T15:30:00.000Z",
  deleted_at: null,
};

const audit: CockpitAuditRecord = {
  id: "44444444-4444-4444-8444-444444444444",
  time_entry_id: completedEntry.id,
  tenant_id: "tenant-1",
  changed_by: employee.id,
  action: "create",
  field_name: "clock_in",
  old_value: null,
  new_value: completedEntry.clock_in,
  reason: "Clock in",
  changed_at: "2026-08-10T07:00:00.000Z",
  timeEntry: {
    employee_id: employee.id,
    date: completedEntry.date,
    project_id: project.id,
  },
};

const correction: CorrectionRequestWithEntry = {
  id: "55555555-5555-4555-8555-555555555555",
  tenant_id: "tenant-1",
  employee_id: employee.id,
  time_entry_id: completedEntry.id,
  proposed_change: {
    clock_out: "2026-08-10T16:00:00.000Z",
    break_minutes: 45,
  },
  reason: "Ausstempeln und Pause berichtigen",
  status: "pending",
  reviewed_by: null,
  review_note: null,
  created_at: "2026-08-10T16:00:00.000Z",
  updated_at: "2026-08-10T16:00:00.000Z",
  timeEntry: {
    employee_id: employee.id,
    date: completedEntry.date,
    project_id: completedEntry.project_id,
    clock_in: completedEntry.clock_in,
    clock_out: completedEntry.clock_out,
    break_minutes: completedEntry.break_minutes,
    notes: completedEntry.notes,
  },
};

function build(overrides: Partial<Parameters<typeof buildCockpitData>[0]> = {}) {
  return buildCockpitData({
    employees: [employee],
    scopedEmployees: [employee],
    entries: [completedEntry],
    projects: [project],
    audits: [audit],
    absences: { leaves: [], sicknesses: [] },
    corrections: [],
    holidaysByState: new Map([["berlin", new Map()]]),
    tenantState: "berlin",
    startDate: "2026-08-04",
    endDate: "2026-08-10",
    days: 7,
    nowIso: "2026-08-10T18:00:00.000Z",
    ...overrides,
  });
}

describe("CockpitService", () => {
  it("aggregates worked time, targets and projects", () => {
    const data = build();
    expect(data.summary.workedMinutes).toBe(480);
    expect(data.summary.targetMinutes).toBe(2_400);
    expect(data.projects[0]).toMatchObject({ name: "Website", minutes: 480, sharePercent: 100 });
    expect(data.employeeRows[0]).toMatchObject({ name: "Anna Admin", projectName: "Website" });
  });

  it("removes holidays from an employee's target", () => {
    const data = build({
      holidaysByState: new Map([["berlin", new Map([["2026-08-10", "Feiertag"]])]]),
    });
    expect(data.summary.targetMinutes).toBe(1_920);
    expect(data.daily.at(-1)?.targetMinutes).toBe(0);
  });

  it("removes approved leave and sickness from the target", () => {
    const data = build({
      absences: {
        leaves: [{
          id: "leave-1", tenant_id: "tenant-1", employee_id: employee.id,
          type: "urlaub", start_date: "2026-08-04", end_date: "2026-08-04",
          work_days_count: 1, reason: null, status: "approved", reviewed_by: employee.id,
          reviewed_at: "2026-08-01T10:00:00.000Z", review_note: null,
          created_at: "2026-08-01T09:00:00.000Z", updated_at: "2026-08-01T10:00:00.000Z",
          deleted_at: null,
        }],
        sicknesses: [{
          id: "sick-1", tenant_id: "tenant-1", employee_id: employee.id,
          start_date: "2026-08-05", end_date: "2026-08-05", work_days_count: 1,
          au_certificate_url: null, au_uploaded_at: null, notes: null,
          created_by: employee.id, created_at: "2026-08-05T06:00:00.000Z",
          updated_at: "2026-08-05T06:00:00.000Z", deleted_at: null,
        }],
      },
    });
    expect(data.summary.targetMinutes).toBe(1_440);
    expect(data.employeeRows[0]).toMatchObject({ leaveDays: 1, sickDays: 1 });
  });

  it("does not count an active entry as completed work", () => {
    const active: TimeEntry = {
      ...completedEntry,
      id: "55555555-5555-4555-8555-555555555555",
      clock_out: null,
      status: "running",
    };
    const data = build({ entries: [active] });
    expect(data.summary.workedMinutes).toBe(0);
    expect(data.summary.activeNow).toBe(1);
    expect(data.employeeRows[0]?.status).toBe("running");
  });

  it("turns immutable audit records into readable activity", () => {
    const data = build();
    expect(data.activity[0]).toMatchObject({
      title: "Eingestempelt",
      category: "clock",
      employeeName: "Anna Admin",
      actorName: "Anna Admin",
      projectName: "Website",
    });
  });

  it("shows requested correction values in actions and activity", () => {
    const data = build({
      corrections: [correction],
    });

    const action = data.actions.find((item) => item.kind === "pending_correction");
    expect(action).toMatchObject({
      title: "Korrekturanfrage offen",
      employeeName: "Anna Admin",
    });
    expect(action?.detail).toContain("Ende:");
    expect(action?.detail).toContain("17:30");
    expect(action?.detail).toContain("18:00");
    expect(action?.detail).toContain("Pause: 30 Min. → 45 Min.");

    const activity = data.activity.find((item) => item.id === `correction-request-${correction.id}`);
    expect(activity).toMatchObject({
      title: "Korrektur angefragt",
      reason: correction.reason,
      employeeName: "Anna Admin",
    });
    expect(activity?.detail).toContain("17:30");
    expect(activity?.detail).toContain("18:00");
  });

  it("prioritizes compliance exceptions in the Action Center", () => {
    const longEntry: TimeEntry = {
      ...completedEntry,
      clock_out: "2026-08-10T18:30:00.000Z",
      break_minutes: 0,
    };
    const data = build({ entries: [longEntry] });
    expect(data.actions[0]?.severity).toBe("critical");
    expect(data.actions.map((item) => item.kind)).toEqual(
      expect.arrayContaining(["long_shift", "break_violation"]),
    );
  });

  it("does not treat time without a project as an Action Center issue", () => {
    const data = build({
      entries: [{ ...completedEntry, project_id: null }],
    });

    expect(data.actions).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Zeit ohne Projekt" }),
      ]),
    );
    expect(data.projects[0]).toMatchObject({ name: "Ohne Projekt", minutes: 480 });
  });
});
