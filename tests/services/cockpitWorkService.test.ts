import { describe, expect, it } from "vitest";
import { buildCockpitProjects } from "@/services/cockpitWorkService";
import type { Employee, Project, TimeEntry } from "@/types/database";

const employees = [
  { id: "anna", first_name: "Anna", last_name: "Admin" },
  { id: "lukas", first_name: "Lukas", last_name: "Mitarbeiter" },
] as Employee[];
const projects = [{ id: "website", name: "Website", color: "#6658d3" }] as Project[];
const entry = (values: Partial<TimeEntry> = {}): TimeEntry => ({
  id: "entry", employee_id: "anna", project_id: "website", status: "completed",
  clock_in: "2026-09-07T07:00:00Z", clock_out: "2026-09-07T15:30:00Z",
  break_minutes: 30, ...values,
} as TimeEntry);

describe("cockpit project breakdown", () => {
  it("adds net minutes across entries and sorts contributors by time", () => {
    const result = buildCockpitProjects([
      entry(),
      entry({ employee_id: "lukas" }),
      entry({ employee_id: "lukas", clock_out: "2026-09-07T11:00:00Z" }),
      entry({ project_id: null, clock_out: "2026-09-07T09:00:00Z" }),
    ], projects, employees);

    expect(result).toEqual([
      {
        id: "website", name: "Website", color: "#6658d3", minutes: 1170, sharePercent: 93,
        contributors: [
          { employeeId: "lukas", name: "Lukas Mitarbeiter", minutes: 690 },
          { employeeId: "anna", name: "Anna Admin", minutes: 480 },
        ],
      },
      {
        id: null, name: "Ohne Projekt", color: null, minutes: 90, sharePercent: 7,
        contributors: [{ employeeId: "anna", name: "Anna Admin", minutes: 90 }],
      },
    ]);
  });

  it("excludes running, paused, incomplete and zero-net entries", () => {
    const result = buildCockpitProjects([
      entry({ status: "running", clock_out: null }),
      entry({ status: "paused", clock_out: null }),
      entry({ clock_out: null }),
      entry({ clock_out: "2026-09-07T07:20:00Z" }),
    ], projects, employees);
    expect(result).toEqual([]);
  });

  it("preserves unassigned time and historical references without merging their identities", () => {
    const result = buildCockpitProjects([
      entry({ employee_id: "former", project_id: "missing-project" }),
      entry({ project_id: null }),
    ], projects, employees);
    expect(result.map((row) => row.id)).toEqual(["missing-project", null]);
    expect(result[0].contributors).toEqual([{ employeeId: "former", name: "Unbekannter Mitarbeiter", minutes: 480 }]);
    for (const project of result) {
      expect(project.contributors.reduce((sum, person) => sum + person.minutes, 0)).toBe(project.minutes);
    }
  });
});
