import { describe, expect, it } from "vitest";
import {
  planningDemandsFromTemplates,
  planningProfileMissing,
} from "@/config/client/planning-setup";
import { planningConfigSchema } from "@/types/planning-schemas";
import { planningCoverageIssues } from "@/services/planningCoverageService";
import { planningWallTime } from "@/config/client/planning-calendar";
import { planningFixture, P_IDS } from "../fixtures/planning";

describe("Simple planning setup preserves safety checks", () => {
  it("requires explicit confirmations and actual availability", () => {
    const profile = planningFixture().state.config.profiles[0];
    profile.eligibility = "unconfirmed";
    profile.locationIds = [];
    profile.skillIds = [];
    profile.availability = [];
    profile.historyConfirmed = false;
    profile.externalWorkConfirmed = false;
    expect(planningProfileMissing(profile)).toEqual([
      "Arbeitszeitregeln prüfen",
      "Filiale auswählen",
      "Aufgaben auswählen",
      "verfügbare Zeiten eintragen",
      "bisherige Arbeitszeiten prüfen",
      "weitere Beschäftigungen prüfen",
    ]);
  });
  it("does not require night permission for ordinary daytime availability", () => {
    const profile = planningFixture().state.config.profiles[0];
    profile.nightWorkConfirmed = false;
    expect(planningProfileMissing(profile)).toEqual([]);
    profile.availability[0].end = "invalid";
    expect(planningProfileMissing(profile)).toContain(
      "ungültige Zeitangaben korrigieren",
    );
  });
  it("copies active templates without sharing IDs, days or holiday settings", () => {
    const config = planningFixture().state.config;
    config.templates.push({
      ...config.templates[0],
      active: false,
      id: P_IDS.other,
    });
    config.templates[0].holidayMode = "include";
    config.demands = planningDemandsFromTemplates(
      config.templates,
      () => P_IDS.demand,
    )!;
    expect(config.demands).toEqual([
      {
        id: P_IDS.demand,
        locationId: P_IDS.location,
        skillId: P_IDS.skill,
        days: [4],
        start: "06:00",
        end: "12:00",
        count: 1,
        holidayMode: "include",
      },
    ]);
    expect(config.demands[0].days).not.toBe(config.templates[0].days);
    expect(planningConfigSchema.safeParse(config).success).toBe(true);
  });
  it("retains continuous minimum coverage through breaks", () => {
    const { state, shift } = planningFixture();
    state.config.templates[0].end = "13:30";
    state.config.templates[0].breaks = [{ offsetMinutes: 240, minutes: 30 }];
    state.config.demands = planningDemandsFromTemplates(
      state.config.templates,
      () => P_IDS.demand,
    )!;
    shift.employeeId = P_IDS.employee;
    shift.end = planningWallTime(shift.date, "13:30");
    shift.breaks = [
      {
        start: planningWallTime(shift.date, "10:00"),
        end: planningWallTime(shift.date, "10:30"),
      },
    ];
    const period = {
      month: "2026-10-01",
      status: "draft" as const,
      revision: 0,
      shifts: [shift],
      publishedShifts: [],
    };
    expect(
      planningCoverageIssues(state, period).some(
        (issue) => issue.date === shift.date && issue.code === "coverage",
      ),
    ).toBe(true);
    shift.breaks = [];
    expect(
      planningCoverageIssues(state, period).some(
        (issue) => issue.date === shift.date && issue.code === "coverage",
      ),
    ).toBe(false);
  });
  it("requires explicit overnight day coverage instead of guessing weekdays", () => {
    const template = planningFixture().state.config.templates[0];
    template.nextDay = true;
    template.start = "22:00";
    template.end = "06:00";
    expect(
      planningDemandsFromTemplates([template], () => P_IDS.demand),
    ).toBeNull();
  });
});
