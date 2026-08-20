import { describe, expect, it } from "vitest";
import { calculateMonthlyWorkTime } from "@/services/monthlyWorkTimeService";
import { easterSunday, germanPublicHolidays, repentanceDay } from "@/services/publicHolidayService";

describe("German public holiday calendar for free tools", () => {
  it("calculates movable holidays for different Gregorian years", () => {
    expect(easterSunday(2026)).toBe("2026-04-05");
    expect(easterSunday(2027)).toBe("2027-03-28");
    expect(easterSunday(2038)).toBe("2038-04-25");
  });

  it("applies state-wide rules without municipality-only holidays", () => {
    const berlin = germanPublicHolidays(2026, "berlin");
    const bavaria = germanPublicHolidays(2026, "bayern");
    const northRhineWestphalia = germanPublicHolidays(2026, "nordrhein-westfalen");

    expect(berlin).toContainEqual({
      date: "2026-03-08", name: "Internationaler Frauentag", scope: "state",
    });
    expect(northRhineWestphalia).toContainEqual({
      date: "2026-06-04", name: "Fronleichnam", scope: "state",
    });
    expect(berlin.some((holiday) => holiday.name === "Fronleichnam")).toBe(false);
    expect(bavaria.some((holiday) => holiday.name === "Mariä Himmelfahrt")).toBe(false);
  });

  it("includes Sunday holidays for Brandenburg schedules that use Sundays", () => {
    const holidays = germanPublicHolidays(2026, "brandenburg");
    expect(holidays).toContainEqual({
      date: "2026-04-05", name: "Ostersonntag", scope: "state",
    });
    expect(holidays).toContainEqual({
      date: "2026-05-24", name: "Pfingstsonntag", scope: "state",
    });
  });

  it("finds Saxony's movable Day of Repentance and Prayer", () => {
    expect(repentanceDay(2026)).toBe("2026-11-18");
    expect(repentanceDay(2027)).toBe("2027-11-17");
  });

  it("calculates target, exact-date absences and actual balance without double counting", () => {
    const result = calculateMonthlyWorkTime({
      year: 2026,
      month: 5,
      state: "berlin",
      weeklyMinutes: 2_400,
      workdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      absences: [
        { id: "one", date: "2026-05-04", type: "vacation" },
        { id: "duplicate", date: "2026-05-04", type: "sickness" },
        { id: "holiday", date: "2026-05-14", type: "vacation" },
        { id: "weekend", date: "2026-05-10", type: "other" },
      ],
      actualMinutes: 8_160,
    });

    expect(result).toMatchObject({
      calendarDays: 31,
      scheduledDays: 18,
      scheduledMinutes: 8_640,
      absenceMinutes: 480,
      attendanceTargetMinutes: 8_160,
      balanceMinutes: 0,
    });
    expect(result?.holidaysOnWorkdays.map((holiday) => holiday.name))
      .toEqual(["Tag der Arbeit", "Christi Himmelfahrt", "Pfingstmontag"]);
    expect(result?.recognizedAbsences).toHaveLength(1);
    expect(result?.ignoredAbsences).toHaveLength(3);
  });

  it("rejects schedules that exceed ten hours on a selected workday", () => {
    expect(calculateMonthlyWorkTime({
      year: 2026,
      month: 8,
      state: "berlin",
      weeklyMinutes: 2_880,
      workdays: ["monday", "tuesday", "wednesday", "thursday"],
      absences: [],
      actualMinutes: null,
    })).toBeNull();
  });
});
