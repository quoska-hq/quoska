import { expect, it } from "vitest";
import { planningFixture } from "../fixtures/planning";
import { planningTimelineIssues } from "@/services/planningTimelineRules";
import { planningWallTime } from "@/config/client/planning-calendar";
it("counts bakery Sunday hours after midnight, including a shift that starts on Saturday", () => {
  const f = planningFixture();
  f.shift.date = "2026-10-03";
  f.shift.start = planningWallTime(f.shift.date, "22:00");
  f.shift.end = planningWallTime("2026-10-04", "04:00");
  f.shift.breaks = [
    {
      start: planningWallTime("2026-10-04", "00:00"),
      end: planningWallTime("2026-10-04", "00:30"),
    },
  ];
  f.shift.substituteDate = "2026-10-05";
  f.state.config.templates[0].authorization = "bakery_production";
  expect(
    planningTimelineIssues(f.state, f.context, [f.shift]).map((i) => i.code),
  ).toContain("bakery_sunday_limit");
});
it("preserves a replacement rest reservation from an earlier published month", () => {
  const f = planningFixture();
  f.context.today = "2026-10-01";
  f.context.now = "2026-10-01T00:00:00Z";
  const old = {
    ...f.shift,
    id: crypto.randomUUID(),
    date: "2026-09-27",
    start: planningWallTime("2026-09-27", "06:00"),
    end: planningWallTime("2026-09-27", "09:00"),
    substituteDate: "2026-10-01",
  };
  f.state.periods = [
    {
      month: "2026-09-01",
      status: "closed",
      revision: 1,
      shifts: [old],
      publishedShifts: [old],
    },
  ];
  expect(
    planningTimelineIssues(f.state, f.context, [f.shift]).map((i) => i.code),
  ).toContain("substitute_busy");
});
it("aggregates continuous work over jobs when a gap is shorter than fifteen minutes", () => {
  const f = planningFixture();
  f.state.config.profiles[0].externalWork = [
    {
      start: planningWallTime(f.shift.date, "12:05"),
      end: planningWallTime(f.shift.date, "13:00"),
      breaks: [],
    },
  ];
  expect(
    planningTimelineIssues(f.state, f.context, [f.shift]).map((i) => i.code),
  ).toContain("continuous_aggregate");
});
it("accepts the eleven-hour rest period directly after a replacement day", () => {
  const f = planningFixture();
  f.shift.date = "2026-10-04";
  f.shift.start = planningWallTime(f.shift.date, "21:00");
  f.shift.end = planningWallTime("2026-10-05", "00:00");
  f.shift.substituteDate = "2026-10-05";
  f.state.config.templates[0].authorization = "bakery_production";
  expect(
    planningTimelineIssues(f.state, f.context, [f.shift]).map((i) => i.code),
  ).not.toContain("substitute_busy");
});
it("reserves different replacement days for different worked Sundays", () => {
  const f = planningFixture();
  const first = {
    ...f.shift,
    date: "2026-10-04",
    start: planningWallTime("2026-10-04", "06:00"),
    end: planningWallTime("2026-10-04", "09:00"),
    substituteDate: "2026-10-13",
  };
  const second = {
    ...first,
    id: crypto.randomUUID(),
    date: "2026-10-11",
    start: planningWallTime("2026-10-11", "06:00"),
    end: planningWallTime("2026-10-11", "09:00"),
  };
  f.state.config.templates[0].authorization = "bakery_production";
  expect(
    planningTimelineIssues(f.state, f.context, [first, second]).map(
      (i) => i.code,
    ),
  ).toContain("substitute_reused");
});
it("rejects invalid breaks in further employment and unsupported split days", () => {
  const f = planningFixture();
  f.state.config.profiles[0].externalWork = [
    {
      start: planningWallTime(f.shift.date, "13:00"),
      end: planningWallTime(f.shift.date, "14:00"),
      breaks: [
        {
          start: planningWallTime(f.shift.date, "12:00"),
          end: planningWallTime(f.shift.date, "12:30"),
        },
      ],
    },
  ];
  const codes = planningTimelineIssues(f.state, f.context, [f.shift]).map(
    (i) => i.code,
  );
  expect(codes).toContain("external_break");
  expect(codes).toContain("split_profile");
});
