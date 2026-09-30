import type {
  PlanningContext,
  PlanningIssue,
  PlanningShift,
  PlanningState,
} from "@/types/planning";
import {
  planningAddDays,
  planningDay,
  planningLocal,
  planningWallTime,
} from "@/config/client/planning-calendar";

export function planningNetMinutes(
  shift: Pick<PlanningShift, "start" | "end" | "breaks">,
): number {
  return (
    (Date.parse(shift.end) -
      Date.parse(shift.start) -
      shift.breaks.reduce(
        (sum, b) => sum + Date.parse(b.end) - Date.parse(b.start),
        0,
      )) /
    60000
  );
}
export function planningWorkSegments(
  shift: Pick<PlanningShift, "start" | "end" | "breaks">,
): [number, number][] {
  const segments: [number, number][] = [];
  let cursor = Date.parse(shift.start);
  for (const pause of [...shift.breaks].sort(
    (a, b) => Date.parse(a.start) - Date.parse(b.start),
  )) {
    segments.push([cursor, Date.parse(pause.start)]);
    cursor = Date.parse(pause.end);
  }
  segments.push([cursor, Date.parse(shift.end)]);
  return segments.filter(([a, b]) => b > a);
}
export function planningShiftIssues(
  state: PlanningState,
  context: PlanningContext,
  shift: PlanningShift,
): PlanningIssue[] {
  const issues: PlanningIssue[] = [];
  const fail = (code: string, message: string) =>
    issues.push({
      code,
      message,
      shiftId: shift.id,
      employeeId: shift.employeeId ?? undefined,
      date: shift.date,
      severity: "error",
    });
  const start = Date.parse(shift.start),
    end = Date.parse(shift.end);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start ||
    end - start > 24 * 3600000
  ) {
    fail("interval", "Die Schichtzeiten sind ungültig.");
    return issues;
  }
  if (planningLocal(start).date !== shift.date)
    fail("date", "Schichtdatum und Beginn stimmen nicht überein.");
  let cursor = start,
    breakMinutes = 0;
  for (const pause of [...shift.breaks].sort(
    (a, b) => Date.parse(a.start) - Date.parse(b.start),
  )) {
    const a = Date.parse(pause.start),
      b = Date.parse(pause.end);
    if (a < cursor || b > end || b - a < 15 * 60000)
      fail(
        "break_interval",
        "Pausen müssen mindestens 15 Minuten dauern und ohne Überschneidung in der Schicht liegen.",
      );
    if (a - cursor > 360 * 60000)
      fail(
        "continuous_work",
        "Mehr als sechs Stunden ohne Ruhepause (§ 4 ArbZG).",
      );
    cursor = b;
    breakMinutes += (b - a) / 60000;
  }
  if (end - cursor > 360 * 60000)
    fail(
      "continuous_work",
      "Mehr als sechs Stunden ohne Ruhepause (§ 4 ArbZG).",
    );
  const net = planningNetMinutes(shift);
  if (net > 480)
    fail(
      "daily_limit",
      "Das Standardprofil erlaubt höchstens acht Arbeitsstunden täglich. Verlängerungen benötigen ein eigenes geprüftes Ausgleichsprofil (§§ 3, 6 ArbZG).",
    );
  if (net > 360 && breakMinutes < 30)
    fail(
      "break_total",
      "Bei mehr als sechs Arbeitsstunden sind mindestens 30 Minuten Pause erforderlich (§ 4 ArbZG).",
    );
  if (!shift.employeeId) {
    fail("unfilled", "Diese Schicht ist noch unbesetzt.");
    return issues;
  }
  const employee = context.employees.find((e) => e.id === shift.employeeId);
  const profile = state.config.profiles.find(
    (p) => p.employeeId === shift.employeeId,
  );
  const location = state.config.locations.find(
    (l) => l.id === shift.locationId,
  );
  const template = state.config.templates.find(
    (t) => t.id === shift.templateId,
  );
  if (
    !employee ||
    !profile ||
    !location ||
    !template ||
    !state.config.skills.some((s) => s.id === shift.skillId)
  ) {
    fail("reference", "Person, Filiale, Kompetenz oder Schichtvorlage fehlt.");
    return issues;
  }
  if (
    profile.eligibility !== "adult_standard" ||
    !profile.externalWorkConfirmed ||
    !profile.historyConfirmed
  )
    fail(
      "profile",
      "Regelprofil, weitere Beschäftigungen und Arbeitszeithistorie müssen bestätigt sein. Minderjährigkeit, Mutterschutz und Sonderregelungen benötigen ein eigenes geprüftes Profil.",
    );
  if (employee.employmentStart > shift.date)
    fail("employment", "Die Schicht liegt vor dem Beschäftigungsbeginn.");
  if (
    !profile.locationIds.includes(shift.locationId) ||
    !profile.skillIds.includes(shift.skillId)
  )
    fail(
      "qualification",
      "Die Person ist für diese Filiale oder Kompetenz nicht freigegeben.",
    );
  const lastDate = planningLocal(end - 1).date;
  if (
    (profile.validFrom && shift.date < profile.validFrom) ||
    (profile.validUntil && lastDate > profile.validUntil)
  )
    fail(
      "qualification_dates",
      "Die Einsatzberechtigung gilt nicht für den gesamten Dienst.",
    );
  if (
    context.absences.some(
      (a) =>
        a.employeeId === employee.id &&
        a.start <= lastDate &&
        (a.end === null || a.end >= shift.date),
    )
  )
    fail(
      "absence",
      "Genehmigte Abwesenheit oder eine laufende Krankmeldung überschneidet die Schicht.",
    );
  for (
    let date = shift.date;
    date <= lastDate;
    date = planningAddDays(date, 1)
  ) {
    const a = Math.max(start, Date.parse(planningWallTime(date, "00:00")));
    const b = Math.min(
      end,
      Date.parse(planningWallTime(planningAddDays(date, 1), "00:00")),
    );
    const windows =
      profile.availabilityExceptions.find((e) => e.date === date)?.windows ??
      profile.availability.filter((w) => w.day === planningDay(date));
    if (
      !windows.some(
        (w) =>
          Date.parse(planningWallTime(date, w.start)) <= a &&
          Date.parse(planningWallTime(date, w.end)) >= b,
      )
    )
      fail(
        "availability",
        "Die Schicht liegt außerhalb der vereinbarten Verfügbarkeit.",
      );
    const holidays = context.holidays.find((h) => h.locationId === location.id);
    if (!holidays?.complete || !location.localHolidaysConfirmed)
      fail(
        "holidays_unknown",
        "Feiertagsdaten oder örtliche Feiertage sind noch nicht vollständig bestätigt.",
      );
    if (
      planningDay(date) === 0 ||
      holidays?.dates.includes(date) ||
      location.additionalHolidays.includes(date)
    ) {
      if (
        template.authorization === "none" ||
        template.authorizationReference.trim().length < 10 ||
        !template.authorizationFrom ||
        !template.authorizationUntil ||
        date < template.authorizationFrom ||
        date > template.authorizationUntil
      )
        fail(
          "sunday_authorization",
          "Für Sonn- oder Feiertagsarbeit fehlt eine dokumentierte, zeitlich gültige Berechtigung (§§ 9, 10 ArbZG).",
        );
      if (!shift.substituteDate)
        fail(
          "substitute_rest",
          "Ein ausdrücklich festgelegter Ersatzruhetag fehlt (§ 11 ArbZG).",
        );
    }
  }
  let nightMinutes = 0;
  for (
    let d = planningAddDays(shift.date, -1);
    d <= lastDate;
    d = planningAddDays(d, 1)
  ) {
    const nightStart = Date.parse(planningWallTime(d, "22:00"));
    const nightEnd = Date.parse(
      planningWallTime(planningAddDays(d, 1), "05:00"),
    );
    for (const [a, b] of planningWorkSegments(shift))
      nightMinutes +=
        Math.max(0, Math.min(b, nightEnd) - Math.max(a, nightStart)) / 60000;
  }
  if (nightMinutes > 120 && !profile.nightWorkConfirmed)
    fail(
      "night_profile",
      "Bei Nachtarbeit müssen Eignung, Vorsorge und Ausgleich gesondert bestätigt werden (§ 6 ArbZG; Nachtzeit in Bäckereien 22–5 Uhr).",
    );
  return issues;
}
