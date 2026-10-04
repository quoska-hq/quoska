import { describe, expect, it } from "vitest";
import { planningFixture, P_IDS } from "@/../tests/fixtures/planning";
import { planningShiftIssues } from "@/services/planningShiftRules";
import { planningTimelineIssues } from "@/services/planningTimelineRules";
import { planningCoverageIssues } from "@/services/planningCoverageService";
import { planningWallTime } from "@/config/client/planning-calendar";

describe("German planning hard constraints", () => {
  it("accepts six hours without a break and does not infer availability from Soll", () => {
    const f = planningFixture();
    f.context.employees[0].workSchedule = {
      ...f.context.employees[0].workSchedule,
      thursday: 0,
    };
    expect(planningShiftIssues(f.state, f.context, f.shift)).toEqual([]);
  });
  it("rejects a missing break above six hours", () => {
    const f = planningFixture();
    f.shift.end = planningWallTime(f.shift.date, "12:01");
    expect(
      planningShiftIssues(f.state, f.context, f.shift).map((i) => i.code),
    ).toContain("break_total");
  });
  it("requires advance break placement within six continuous hours", () => {
    const f = planningFixture();
    f.shift.end = planningWallTime(f.shift.date, "14:30");
    f.shift.breaks = [
      {
        start: planningWallTime(f.shift.date, "12:01"),
        end: planningWallTime(f.shift.date, "12:31"),
      },
    ];
    expect(
      planningShiftIssues(f.state, f.context, f.shift).map((i) => i.code),
    ).toContain("continuous_work");
  });
  it("rejects nine hours without a verified averaging profile", () => {
    const f = planningFixture();
    f.shift.end = planningWallTime(f.shift.date, "15:30");
    f.shift.breaks = [
      {
        start: planningWallTime(f.shift.date, "10:00"),
        end: planningWallTime(f.shift.date, "10:30"),
      },
    ];
    expect(
      planningShiftIssues(f.state, f.context, f.shift).map((i) => i.code),
    ).toContain("daily_limit");
  });
  it("keeps ongoing sickness blocking in future months", () => {
    const f = planningFixture();
    f.context.absences = [
      { employeeId: P_IDS.employee, start: "2026-09-29", end: null },
    ];
    expect(
      planningShiftIssues(f.state, f.context, f.shift).map((i) => i.code),
    ).toContain("absence");
  });
  it("blocks unknown local holidays and protected profiles", () => {
    const f = planningFixture();
    f.state.config.locations[0].localHolidaysConfirmed = false;
    f.state.config.profiles[0].eligibility = "unsupported";
    expect(
      planningShiftIssues(f.state, f.context, f.shift).map((i) => i.code),
    ).toEqual(expect.arrayContaining(["holidays_unknown", "profile"]));
  });
  it("blocks holiday work without explicit authorization", () => {
    const f = planningFixture();
    f.context.holidays[0].dates.push(f.shift.date);
    expect(
      planningShiftIssues(f.state, f.context, f.shift).map((i) => i.code),
    ).toContain("sunday_authorization");
  });
  it("checks rest across month boundaries including other employment", () => {
    const f = planningFixture();
    f.state.config.profiles[0].externalWork = [
      {
        start: "2026-09-30T16:00:00Z",
        end: "2026-09-30T20:00:00Z",
        breaks: [],
      },
    ];
    expect(
      planningTimelineIssues(f.state, f.context, [f.shift]).map((i) => i.code),
    ).toContain("rest");
  });
  it("aggregates daily hours from other employment", () => {
    const f = planningFixture();
    f.state.config.profiles[0].externalWork = [
      {
        start: "2026-10-01T13:00:00Z",
        end: "2026-10-01T16:00:00Z",
        breaks: [],
      },
    ];
    expect(
      planningTimelineIssues(f.state, f.context, [f.shift]).map((i) => i.code),
    ).toContain("daily_aggregate");
  });
  it("removes people on break from demand coverage", () => {
    const f = planningFixture();
    f.shift.breaks = [
      { start: "2026-10-01T08:00:00Z", end: "2026-10-01T08:30:00Z" },
    ];
    expect(
      planningCoverageIssues(f.state, {
        month: "2026-10-01",
        shifts: [f.shift],
        publishedShifts: [],
        revision: 0,
        status: "draft",
      }).some((i) => i.date === f.shift.date),
    ).toBe(true);
  });
  it("does not count a multiskilled person twice", () => {
    const f = planningFixture();
    const id = "30000000-0000-4000-8000-000000000002";
    f.state.config.skills.push({ id, name: "Backen" });
    f.state.config.profiles[0].skillIds.push(id);
    f.state.config.demands.push({
      ...f.state.config.demands[0],
      id: "50000000-0000-4000-8000-000000000002",
      skillId: id,
    });
    expect(
      planningCoverageIssues(f.state, {
        month: "2026-10-01",
        shifts: [f.shift],
        publishedShifts: [],
        revision: 0,
        status: "draft",
      }).some((i) => i.date === f.shift.date),
    ).toBe(true);
  });
  it("rejects nonexistent and ambiguous wall times", () => {
    expect(() => planningWallTime("2027-03-28", "02:30")).toThrow("existiert");
    expect(() => planningWallTime("2026-10-25", "02:30")).toThrow(
      "doppeldeutig",
    );
    expect(planningWallTime("2026-10-25", "00:00")).toBe(
      "2026-10-24T22:00:00.000Z",
    );
  });
});
