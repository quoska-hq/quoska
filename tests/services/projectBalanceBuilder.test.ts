import { describe, expect, it } from "vitest";
import { buildPersonalProjectGoals, buildProjectBalances } from "@/services/projectBalanceBuilder";
import { personalProjectWeekQuerySchema, type ProjectBalanceBooking } from "@/types/project-balance";
import type { ProjectWeeklyTarget } from "@/types/project-target";

const account = {
  projectId: "project-1",
  projectName: "Wartung",
  employeeId: "employee-1",
  employeeName: "Kaya Beispiel",
};

function target(effectiveFrom: string, weeklyMinutes: number): ProjectWeeklyTarget {
  return { ...account, effectiveFrom, weeklyMinutes };
}

function booking(date: string, netMinutes: number): ProjectBalanceBooking {
  return { projectId: account.projectId, employeeId: account.employeeId, date, netMinutes };
}

describe("buildProjectBalances", () => {
  it("adds the rounded weekday shares to the weekly target and caps the current week at today", () => {
    const targets = [target("2026-10-05", 61)];
    const bookings = [booking("2026-10-05", 12), booking("2026-10-07", 25), booking("2026-10-11", 99)];
    const currentWeek = { startDate: "2026-10-05", endDate: "2026-10-11" };

    expect(buildProjectBalances({ targets, bookings, ...currentWeek, todayDate: "2026-10-07" })).toEqual([
      { ...account, targetMinutes: 37, actualMinutes: 37, balanceMinutes: 0 },
    ]);
    expect(buildProjectBalances({ targets, bookings, ...currentWeek, todayDate: "2026-10-11" })).toEqual([
      { ...account, targetMinutes: 61, actualMinutes: 136, balanceMinutes: 75 },
    ]);
  });

  it("applies a new target from its exact effective date and keeps range splits additive", () => {
    const targets = [target("2026-10-07", 47), target("2026-10-05", 61)];
    const asOf = "2026-10-09";
    const getRow = (startDate: string, endDate: string) => buildProjectBalances({
      startDate, endDate, todayDate: asOf, targets, bookings: [],
    })[0];

    const before = getRow("2026-10-05", "2026-10-06");
    const after = getRow("2026-10-07", "2026-10-09");
    const combined = getRow("2026-10-05", "2026-10-09");
    expect(before).toMatchObject({ targetMinutes: 24, balanceMinutes: -24, actualMinutes: 0 });
    expect(after).toMatchObject({ targetMinutes: 28, balanceMinutes: -52, actualMinutes: 0 });
    expect(combined.targetMinutes).toBe(before.targetMinutes + after.targetMinutes);
  });

  it("keeps a closed account's historical balance and resumes accrual only when a later target opens", () => {
    const targets = [target("2026-10-05", 100), target("2026-10-12", 0), target("2026-10-14", 70)];
    const bookings = [
      booking("2026-10-04", 99), booking("2026-10-05", 70), booking("2026-10-10", 30),
      booking("2026-10-11", 20), booking("2026-10-13", 99),
      booking("2026-10-14", 10), booking("2026-10-15", 20), booking("2026-10-16", 99),
    ];
    const context = { targets, bookings, todayDate: "2026-10-15" };

    expect(buildProjectBalances({ ...context, startDate: "2026-10-12", endDate: "2026-10-13" })).toEqual([
      { ...account, targetMinutes: 0, actualMinutes: 0, balanceMinutes: 20 },
    ]);
    expect(buildProjectBalances({ ...context, startDate: "2026-10-12", endDate: "2026-10-18" })).toEqual([
      { ...account, targetMinutes: 28, actualMinutes: 30, balanceMinutes: 22 },
    ]);
    expect(buildProjectBalances({ ...context, startDate: "2026-10-19", endDate: "2026-10-25" })).toEqual([
      { ...account, targetMinutes: 0, actualMinutes: 0, balanceMinutes: 22 },
    ]);
  });

  it("filters both account dimensions and excludes pairs with no effective positive target", () => {
    const otherEmployee = { ...target("2026-10-05", 100), employeeId: "employee-2" };
    const otherProject = { ...target("2026-10-05", 100), projectId: "project-2" };
    const zeroOnly = { ...target("2026-10-05", 0), projectId: "project-3" };
    const future = { ...target("2026-10-26", 100), projectId: "project-4" };
    const targets = [target("2026-10-05", 100), otherEmployee, otherProject, zeroOnly, future];
    const bookings = [
      booking("2026-10-09", 15),
      { ...booking("2026-10-09", 20), employeeId: otherEmployee.employeeId },
      { ...booking("2026-10-09", 30), projectId: otherProject.projectId },
    ];
    const input = { targets, bookings, startDate: "2026-10-05", endDate: "2026-10-11", todayDate: "2026-10-24" };

    expect(buildProjectBalances(input)).toHaveLength(3);
    expect(buildProjectBalances({ ...input, projectId: account.projectId, employeeId: account.employeeId })).toEqual([
      { ...account, targetMinutes: 100, actualMinutes: 15, balanceMinutes: -85 },
    ]);
    expect(buildProjectBalances({ ...input, projectId: "none" })).toEqual([]);
  });
});

const { projectId, projectName, employeeId } = account;

describe("personal project goals", () => {
  it("plans the entire week including a scheduled change and credits time through today", () => {
    const result = buildPersonalProjectGoals({
      employeeId,
      weekStart: "2026-10-12",
      todayDate: "2026-10-13",
      targets: [target("2026-10-05", 100), target("2026-10-14", 200)],
      bookings: [
        booking("2026-10-05", 35), booking("2026-10-11", 70),
        booking("2026-10-12", 22), booking("2026-10-13", 23), booking("2026-10-14", 100),
      ],
    });
    expect(result).toEqual([{ projectId, projectName, plannedMinutes: 160, actualMinutes: 45, balanceMinutes: 10 }]);
  });

  it("shows later starts and zero-booking active goals, omitting old closures and zero-only goals", () => {
    const result = buildPersonalProjectGoals({
      employeeId,
      weekStart: "2026-10-12",
      todayDate: "2026-10-14",
      targets: [
        target("2026-10-15", 90),
        { ...target("2026-10-18", 60), projectId: "weekend", projectName: "Wochenende" },
        { ...target("2026-10-05", 50), projectId: "closed" },
        { ...target("2026-10-12", 0), projectId: "closed" },
        { ...target("2026-10-12", 0), projectId: "zero-only" },
        { ...target("2026-10-12", 120), projectId: "other-person", employeeId: "employee-2" },
        { ...target("2026-10-19", 200), projectId: "next-week" },
      ],
      bookings: [{ ...booking("2026-10-13", 90), projectId: "closed" }],
    });
    expect(result).toEqual([
      { projectId, projectName, plannedMinutes: 36, actualMinutes: 0, balanceMinutes: 0 },
      { projectId: "weekend", projectName: "Wochenende", plannedMinutes: 0, actualMinutes: 0, balanceMinutes: 0 },
    ]);
  });

  it("keeps the historical week cutoff and only credits bookings during an active target", () => {
    expect(buildPersonalProjectGoals({
      employeeId,
      weekStart: "2026-10-12",
      todayDate: "2026-10-26",
      targets: [target("2026-10-05", 100), target("2026-10-16", 0), target("2026-10-19", 200)],
      bookings: [
        booking("2026-10-11", 110), booking("2026-10-12", 30), booking("2026-10-15", 60),
        booking("2026-10-16", 60), booking("2026-10-18", 40), booking("2026-10-19", 100),
      ],
    })).toEqual([{ projectId, projectName, plannedMinutes: 80, actualMinutes: 90, balanceMinutes: 20 }]);
  });

  it("validates an ISO Monday and rejects any additional query field", () => {
    expect(personalProjectWeekQuerySchema.safeParse({ weekStart: "2026-10-12" }).success).toBe(true);
    expect(personalProjectWeekQuerySchema.safeParse({ weekStart: "1969-12-29" }).success).toBe(true);
    for (const weekStart of [null, "2026-10-13", "12.10.2026", "2026-02-30", "0000-01-03", "9999-12-27"]) {
      expect(personalProjectWeekQuerySchema.safeParse({ weekStart }).success).toBe(false);
    }
    expect(personalProjectWeekQuerySchema.safeParse({ weekStart: "2026-10-12", employeeId }).success).toBe(false);
  });
});
