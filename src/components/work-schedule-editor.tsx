"use client";

import { useState } from "react";
import {
  DEFAULT_WORK_SCHEDULE,
  FOUR_DAY_WORK_SCHEDULE,
  MAX_DAILY_WORK_MINUTES,
  MAX_WEEKLY_WORK_MINUTES,
  THIRTY_HOUR_WORK_SCHEDULE,
  WORKDAY_KEYS,
  WORKDAY_LABELS,
  evenlyDistributeWorkMinutes,
  formatWorkMinutes,
  totalScheduleMinutes,
  workScheduleSchema,
  type WorkdayKey,
  type WorkSchedule,
} from "@/types/work-schedule";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WorkScheduleDayEditor } from "@/components/work-schedule-day-editor";
import { ChevronDown, ChevronUp } from "lucide-react";

interface WorkScheduleEditorProps {
  value: WorkSchedule;
  onChange: (schedule: WorkSchedule) => void;
  onValidityChange?: (valid: boolean) => void;
}

const PRESETS = [
  { label: "40 Std. · 5 Tage", value: DEFAULT_WORK_SCHEDULE },
  { label: "32 Std. · 4 Tage", value: FOUR_DAY_WORK_SCHEDULE },
  { label: "30 Std. · 5 Tage", value: THIRTY_HOUR_WORK_SCHEDULE },
] as const;

function sameSchedule(a: WorkSchedule, b: WorkSchedule): boolean {
  return WORKDAY_KEYS.every((day) => a[day] === b[day]);
}

function activeDays(schedule: WorkSchedule): WorkdayKey[] {
  return WORKDAY_KEYS.filter((day) => schedule[day] > 0);
}

export function WorkScheduleEditor({
  value,
  onChange,
  onValidityChange,
}: WorkScheduleEditorProps) {
  const totalMinutes = totalScheduleMinutes(value);
  const [weeklyHours, setWeeklyHours] = useState(String(Math.floor(totalMinutes / 60)));
  const [weeklyMinutes, setWeeklyMinutes] = useState(String(totalMinutes % 60));
  const [selectedDays, setSelectedDays] = useState<WorkdayKey[]>(activeDays(value));
  const [validationError, setValidationError] = useState<string | null>(null);
  const activePreset = PRESETS.find((preset) => sameSchedule(value, preset.value));
  const [customOpen, setCustomOpen] = useState(() => !activePreset);
  const [detailsOpen, setDetailsOpen] = useState(false);

  function reportError(message: string | null) {
    setValidationError(message);
    onValidityChange?.(!message);
  }

  function applyPreset(schedule: WorkSchedule) {
    reportError(null);
    setCustomOpen(false);
    setDetailsOpen(false);
    setSelectedDays(activeDays(schedule));
    const nextTotal = totalScheduleMinutes(schedule);
    setWeeklyHours(String(Math.floor(nextTotal / 60)));
    setWeeklyMinutes(String(nextTotal % 60));
    onChange({ ...schedule });
  }

  function distribute(
    hoursRaw: string,
    minutesRaw: string,
    days: WorkdayKey[],
  ) {
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);
    if (!Number.isInteger(hours) || hours < 0 || hours > 48) {
      reportError("Bitte gib zwischen 0 und 48 vollen Wochenstunden ein.");
      return;
    }
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
      reportError("Die Minuten müssen zwischen 0 und 59 liegen.");
      return;
    }

    const requestedTotal = hours * 60 + minutes;
    if (requestedTotal < 1 || requestedTotal > MAX_WEEKLY_WORK_MINUTES) {
      reportError("Die Arbeitswoche muss zwischen 1 Minute und 48 Stunden liegen.");
      return;
    }
    if (days.length === 0) {
      reportError("Wähle mindestens einen Arbeitstag aus.");
      return;
    }

    const distributed = evenlyDistributeWorkMinutes(requestedTotal, days);
    if (!distributed) {
      reportError(
        "Diese Zeit lässt sich nicht legal verteilen: Pro Arbeitstag sind höchstens 10 Stunden möglich.",
      );
      return;
    }

    reportError(null);
    onChange(distributed);
  }

  function updateWeeklyHours(raw: string) {
    setWeeklyHours(raw);
    distribute(raw, weeklyMinutes, selectedDays);
  }

  function updateWeeklyMinutes(raw: string) {
    setWeeklyMinutes(raw);
    distribute(weeklyHours, raw, selectedDays);
  }

  function toggleDay(day: WorkdayKey) {
    const nextDays = selectedDays.includes(day)
      ? selectedDays.filter((selected) => selected !== day)
      : WORKDAY_KEYS.filter((candidate) => candidate === day || selectedDays.includes(candidate));
    setSelectedDays(nextDays);
    distribute(weeklyHours, weeklyMinutes, nextDays);
  }

  function updateDay(day: WorkdayKey, hoursRaw: string, minutesRaw: string) {
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);
    if (
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      hours < 0 ||
      minutes < 0 ||
      minutes > 59 ||
      hours * 60 + minutes > MAX_DAILY_WORK_MINUTES
    ) {
      reportError("Pro Arbeitstag sind höchstens 10 Stunden möglich.");
      return;
    }

    const next = { ...value, [day]: hours * 60 + minutes };
    const parsed = workScheduleSchema.safeParse(next);
    if (!parsed.success) {
      reportError(parsed.error.issues[0]?.message ?? "Ungültige Arbeitszeit.");
      return;
    }
    reportError(null);
    setWeeklyHours(String(Math.floor(totalScheduleMinutes(next) / 60)));
    setWeeklyMinutes(String(totalScheduleMinutes(next) % 60));
    onChange(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Label>Arbeitszeitmodell</Label>
        <strong className="text-lg text-[#6658d3]">{formatWorkMinutes(totalMinutes)}/Woche</strong>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PRESETS.map((preset) => {
          const active = !customOpen && activePreset?.label === preset.label;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset.value)}
              className={`border px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "border-[#6658d3] bg-[#6658d3]/8 font-semibold text-[#4f43b8]"
                  : "border-slate-200 bg-white hover:border-slate-400"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setCustomOpen(true)}
          className={`border px-3 py-2.5 text-sm transition-colors ${
            customOpen || !activePreset
              ? "border-[#6658d3] bg-[#6658d3]/8 font-semibold text-[#4f43b8]"
              : "border-slate-200 bg-white hover:border-slate-400"
          }`}
        >
          Individuell
        </button>
      </div>

      <div
        className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out motion-reduce:transition-none ${
          customOpen
            ? "mt-0 grid-rows-[1fr] opacity-100"
            : "-mt-4 grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
        <div
          inert={!customOpen}
          aria-hidden={!customOpen}
          className="space-y-4 border border-slate-200 bg-white p-4"
        >
          <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
            <div>
              <Label className="mb-2 block">Pro Woche</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5">
                  <Input
                    id="weekly-hours"
                    aria-label="Wochenstunden"
                    type="number"
                    min="0"
                    max="48"
                    step="1"
                    value={weeklyHours}
                    onChange={(event) => updateWeeklyHours(event.target.value)}
                  />
                  <span className="text-xs text-slate-500">Std.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    aria-label="Wochenminuten"
                    type="number"
                    min="0"
                    max="59"
                    step="1"
                    value={weeklyMinutes}
                    onChange={(event) => updateWeeklyMinutes(event.target.value)}
                  />
                  <span className="text-xs text-slate-500">Min.</span>
                </div>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Arbeitstage</Label>
              <div className="flex flex-wrap gap-1.5">
                {WORKDAY_KEYS.map((day) => {
                  const selected = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-label={`${WORKDAY_LABELS[day]} auswählen`}
                      aria-pressed={selected}
                      onClick={() => toggleDay(day)}
                      className={`min-w-10 border px-2 py-2 text-xs font-medium ${
                        selected
                          ? "border-[#6658d3] bg-[#6658d3] text-white"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-400"
                      }`}
                    >
                      {WORKDAY_LABELS[day].slice(0, 2)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            type="button"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((open) => !open)}
            className="flex w-full items-center justify-between border-t border-slate-100 pt-3 text-sm font-medium text-slate-600 hover:text-slate-950"
          >
            Tage einzeln anpassen
            {detailsOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>

          <WorkScheduleDayEditor
            open={detailsOpen}
            days={selectedDays}
            value={value}
            onUpdate={updateDay}
          />
        </div>
        </div>
      </div>

      {validationError && (
        <p role="alert" className="text-sm font-medium text-destructive">{validationError}</p>
      )}
    </div>
  );
}
