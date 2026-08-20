"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FreeToolViewTracker, ToolResultCta } from "@/components/free-tools/free-tool-analytics";
import { Field, ResultMetric, ToolPanel, ToolPanelHeader } from "@/components/free-tools/tool-elements";
import { trackFreeToolEvent } from "@/lib/free-tool-analytics";
import { currentGermanMonth } from "@/lib/current-german-month";
import { daysInMonth, monthDate } from "@/services/freeToolDateService";
import { formatDecimalHours, formatDuration, parseDuration } from "@/services/freeToolTimeService";
import { calculateMonthlyWorkTime } from "@/services/monthlyWorkTimeService";
import type { AbsenceType, MonthlyAbsence, MonthlyWorkTimeResult } from "@/types/free-tools";
import { BUNDESLAENDER, BUNDESLAND_LABELS, type Bundesland } from "@/types/tenant";
import { WORKDAY_KEYS, WORKDAY_LABELS, type WorkdayKey } from "@/types/work-schedule";

const TOOL = "monatsarbeitszeit-rechner" as const;
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const ABSENCE_LABELS: Record<AbsenceType, string> = {
  vacation: "Urlaub",
  sickness: "Krankheit",
  other: "Sonstige Abwesenheit",
};
const SELECT_CLASS = "mt-2 h-11 w-full rounded-sm border border-input bg-white px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

export function MonthlyWorkTimeCalculator({
  initialYear,
  initialMonth,
}: {
  initialYear: number;
  initialMonth: number;
}) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [state, setState] = useState<Bundesland>("berlin");
  const [weeklyHours, setWeeklyHours] = useState("40");
  const [workdays, setWorkdays] = useState<WorkdayKey[]>(["monday", "tuesday", "wednesday", "thursday", "friday"]);
  const [absences, setAbsences] = useState<MonthlyAbsence[]>([]);
  const [nextAbsenceId, setNextAbsenceId] = useState(1);
  const [actual, setActual] = useState("");
  const [result, setResult] = useState<MonthlyWorkTimeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
  const lastDate = monthDate(year, month, daysInMonth(year, month));

  useEffect(() => {
    const current = currentGermanMonth();
    if (current.year < 2026 || current.year > 2035) return;
    const timer = window.setTimeout(() => {
      setYear((selectedYear) => selectedYear === initialYear ? current.year : selectedYear);
      setMonth((selectedMonth) => selectedMonth === initialMonth ? current.month : selectedMonth);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialMonth, initialYear]);

  function toggleWorkday(day: WorkdayKey) {
    setWorkdays((current) => current.includes(day)
      ? current.filter((item) => item !== day)
      : WORKDAY_KEYS.filter((item) => [...current, day].includes(item)));
    setResult(null);
  }

  function addAbsence() {
    setAbsences((current) => [...current, {
      id: String(nextAbsenceId),
      date: `${monthPrefix}-01`,
      type: "vacation",
    }]);
    setNextAbsenceId((current) => current + 1);
    setResult(null);
  }

  function updateAbsence(id: string, update: Partial<MonthlyAbsence>) {
    setAbsences((current) => current.map((absence) => absence.id === id ? { ...absence, ...update } : absence));
    setResult(null);
  }

  function calculate(event: FormEvent) {
    event.preventDefault();
    const normalizedHours = Number(weeklyHours.replace(",", "."));
    // eslint-disable-next-line @quoska/legal/enforce-max-working-hours -- Converts entered hours to minutes; the 48-hour validation follows below.
    const weeklyMinutes = Math.round(normalizedHours * 60);
    const actualMinutes = actual.trim() === "" ? null : parseDuration(actual);
    if (!Number.isFinite(normalizedHours) || normalizedHours <= 0 || normalizedHours > 48 || workdays.length === 0 || (actual.trim() !== "" && actualMinutes === null)) {
      setResult(null);
      setError("Bitte prüfe Wochenstunden, Arbeitstage und die optionale Istzeit im Format hh:mm.");
      return;
    }
    const calculation = calculateMonthlyWorkTime({
      year, month, state, weeklyMinutes, workdays, absences, actualMinutes,
    });
    if (!calculation) {
      setResult(null);
      setError("Die Wochenstunden lassen sich nicht mit höchstens zehn Stunden pro gewähltem Arbeitstag verteilen.");
      return;
    }
    setResult(calculation);
    setError(null);
    trackFreeToolEvent({ event: "free_tool_calculate", tool: TOOL });
  }

  return (
    <ToolPanel>
      <FreeToolViewTracker tool={TOOL} />
      <ToolPanelHeader title="Monatsarbeitszeit berechnen">
        Arbeitsplan, landesweite Feiertage und konkrete Abwesenheiten zusammenführen.
      </ToolPanelHeader>
      <form onSubmit={calculate} className="p-5 sm:p-7">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Jahr" htmlFor="monthly-year">
            <select id="monthly-year" value={year} onChange={(event) => { setYear(Number(event.target.value)); setResult(null); }} className={SELECT_CLASS}>
              {Array.from({ length: 10 }, (_, index) => 2026 + index).map((value) => <option key={value}>{value}</option>)}
            </select>
          </Field>
          <Field label="Monat" htmlFor="monthly-month">
            <select id="monthly-month" value={month} onChange={(event) => { setMonth(Number(event.target.value)); setResult(null); }} className={SELECT_CLASS}>
              {MONTHS.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}
            </select>
          </Field>
          <Field label="Bundesland" htmlFor="monthly-state">
            <select id="monthly-state" value={state} onChange={(event) => { setState(event.target.value as Bundesland); setResult(null); }} className={SELECT_CLASS}>
              {BUNDESLAENDER.map((value) => <option key={value} value={value}>{BUNDESLAND_LABELS[value]}</option>)}
            </select>
          </Field>
          <Field label="Wochenstunden" htmlFor="monthly-hours" hint="Zum Beispiel 38,5.">
            <Input id="monthly-hours" value={weeklyHours} onChange={(event) => { setWeeklyHours(event.target.value); setResult(null); }} inputMode="decimal" className="mt-2 h-11 bg-white font-mono" required />
          </Field>
        </div>

        <fieldset className="mt-7 border-t border-slate-900/15 pt-6">
          <legend className="text-sm font-semibold text-slate-800">Regelmäßige Arbeitstage</legend>
          <p className="mt-1 text-xs leading-5 text-slate-500">Die Wochenstunden werden minutengenau und möglichst gleichmäßig auf diese Tage verteilt.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {WORKDAY_KEYS.map((day) => (
              <label key={day} className={`flex min-w-16 items-center justify-center gap-2 border px-3 py-2.5 text-sm font-semibold ${workdays.includes(day) ? "border-slate-950 bg-slate-950 text-white" : "border-slate-900/15 bg-white text-slate-600"}`}>
                <input type="checkbox" checked={workdays.includes(day)} onChange={() => toggleWorkday(day)} className="sr-only" />
                {WORKDAY_LABELS[day].slice(0, 2)}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-7 border-t border-slate-900/15 pt-6">
          <legend className="text-sm font-semibold text-slate-800">Abwesenheiten (optional)</legend>
          <p className="mt-1 text-xs leading-5 text-slate-500">Genaue Daten verhindern, dass Wochenenden oder Feiertage doppelt angerechnet werden.</p>
          <div className="mt-3 space-y-3">
            {absences.map((absence, index) => (
              <div key={absence.id} className="grid gap-3 border border-slate-900/10 bg-white p-3 sm:grid-cols-[1fr_1.3fr_auto] sm:items-end">
                <Field label={`Datum ${index + 1}`} htmlFor={`absence-date-${absence.id}`}><Input id={`absence-date-${absence.id}`} type="date" min={`${monthPrefix}-01`} max={lastDate} value={absence.date} onChange={(event) => updateAbsence(absence.id, { date: event.target.value })} className="mt-2 h-10 font-mono" /></Field>
                <Field label="Art" htmlFor={`absence-type-${absence.id}`}><select id={`absence-type-${absence.id}`} value={absence.type} onChange={(event) => updateAbsence(absence.id, { type: event.target.value as AbsenceType })} className={`${SELECT_CLASS} h-10`}>{Object.entries(ABSENCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
                <Button type="button" variant="outline" size="icon-lg" aria-label={`Abwesenheit ${index + 1} entfernen`} onClick={() => { setAbsences((current) => current.filter((item) => item.id !== absence.id)); setResult(null); }}><Minus /></Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="ghost" className="mt-3" onClick={addAbsence}><Plus /> Abwesenheit hinzufügen</Button>
        </fieldset>

        <div className="mt-7 max-w-sm border-t border-slate-900/15 pt-6">
          <Field label="Tatsächlich geleistete Zeit (optional)" htmlFor="monthly-actual" hint="Format hh:mm. Abwesenheitsstunden nicht mit einrechnen.">
            <Input id="monthly-actual" value={actual} onChange={(event) => { setActual(event.target.value); setResult(null); }} inputMode="numeric" placeholder="152:30" className="mt-2 h-11 bg-white font-mono" />
          </Field>
        </div>
        {error && <p role="alert" className="mt-5 border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        <Button type="submit" size="lg" className="mt-6 h-12 rounded-none px-6">Monatsarbeitszeit berechnen</Button>
      </form>

      {result && (
        <section aria-live="polite" className="border-t border-slate-900/15 bg-white p-5 sm:p-7">
          <h3 className="text-lg font-semibold text-slate-950">Ergebnis für {MONTHS[month - 1]} {year}</h3>
          <div className="mt-4 grid border-l border-t border-slate-900/15 sm:grid-cols-2 lg:grid-cols-3">
            <ResultMetric label="Soll-Arbeitstage" value={String(result.scheduledDays)}>{result.calendarDays} Kalendertage im Monat</ResultMetric>
            <ResultMetric label="Monatliche Sollzeit" value={formatDuration(result.scheduledMinutes)} emphasis>{formatDecimalHours(result.scheduledMinutes)} Dezimalstunden</ResultMetric>
            <ResultMetric label="Feiertage auf Arbeitstagen" value={String(result.holidaysOnWorkdays.length)}>{result.holidays.length} landesweite Feiertage im Monat</ResultMetric>
            <ResultMetric label="Angerechnete Abwesenheit" value={formatDuration(result.absenceMinutes)}>{result.recognizedAbsences.length} eindeutige Arbeitstage</ResultMetric>
            <ResultMetric label="Anwesenheits-Soll" value={formatDuration(result.attendanceTargetMinutes)}>Sollzeit nach Abzug angerechneter Abwesenheit</ResultMetric>
            <ResultMetric label="Zeitbilanz" value={result.balanceMinutes === null ? "—" : formatDuration(result.balanceMinutes, true)}>{result.balanceMinutes === null ? "Istzeit optional ergänzen" : "Istzeit + Abwesenheit − Sollzeit"}</ResultMetric>
          </div>

          {result.holidays.length > 0 && <div className="mt-5 border border-slate-900/10 bg-[#f5f3ee] p-4"><p className="text-sm font-semibold text-slate-950">Berücksichtigte Feiertage</p><ul className="mt-2 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">{result.holidays.map((holiday) => <li key={`${holiday.date}-${holiday.name}`}>{holiday.date.slice(8, 10)}.{holiday.date.slice(5, 7)}. · {holiday.name}{result.holidaysOnWorkdays.some((item) => item.date === holiday.date) ? " (reduziert Sollzeit)" : ""}</li>)}</ul></div>}
          {result.ignoredAbsences.length > 0 && <p role="status" className="mt-4 text-sm text-amber-800">{result.ignoredAbsences.length} Abwesenheit(en) wurden nicht angerechnet, weil das Datum außerhalb des Monats, auf einem freien Tag oder Feiertag lag oder doppelt vorkam.</p>}
          <p className="mt-4 text-xs leading-5 text-slate-500">Gemeindeabhängige Feiertage sind nicht enthalten. Das betrifft insbesondere Mariä Himmelfahrt und das Augsburger Friedensfest in Teilen Bayerns sowie Fronleichnam in einzelnen Gemeinden Sachsens und Thüringens.</p>
          <ToolResultCta tool={TOOL} employerCopy />
        </section>
      )}
    </ToolPanel>
  );
}
