"use client";

import { Input } from "@/components/ui/input";
import { germanDateLabel } from "@/services/freeToolDateService";
import { formatDuration } from "@/services/freeToolTimeService";
import { workdayForDate } from "@/services/workScheduleService";
import type { TimesheetRow, TimesheetRowResult } from "@/types/free-tools";

export const TIMESHEET_GRID = "grid gap-3 px-3 py-4 sm:grid-cols-[7.5rem_1fr_1fr_0.85fr_5.5rem_7rem] sm:items-center sm:px-4";

export function TimesheetRowEditor({
  row,
  result,
  onChange,
}: {
  row: TimesheetRow;
  result: TimesheetRowResult;
  onChange: (row: TimesheetRow) => void;
}) {
  const weekend = ["saturday", "sunday"].includes(workdayForDate(row.date));
  const status = result.status === "valid"
    ? formatDuration(result.netMinutes)
    : result.status === "incomplete"
      ? "Unvollständig"
      : result.status === "invalid"
        ? "Prüfen"
        : "—";

  return (
    <div className={`${TIMESHEET_GRID} border-t border-slate-900/10 ${weekend ? "bg-[#efede7]" : "bg-white"}`}>
      <div className="col-span-2 flex items-center justify-between sm:col-span-1 sm:block">
        <span className="font-semibold text-slate-950">{germanDateLabel(row.date)}</span>
        {weekend && <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:mt-1 sm:block">Wochenende</span>}
      </div>
      <label className="text-xs text-slate-500 sm:text-transparent">
        Beginn
        <Input type="time" value={row.start} onChange={(event) => onChange({ ...row, start: event.target.value })} aria-label={`Beginn ${germanDateLabel(row.date)}`} className="mt-1 h-10 bg-white font-mono sm:mt-0" />
      </label>
      <label className="text-xs text-slate-500 sm:text-transparent">
        Ende
        <Input type="time" value={row.end} onChange={(event) => onChange({ ...row, end: event.target.value })} aria-label={`Ende ${germanDateLabel(row.date)}`} className="mt-1 h-10 bg-white font-mono sm:mt-0" />
      </label>
      <label className="text-xs text-slate-500 sm:text-transparent">
        Pause in Minuten
        <Input type="number" min="0" max="1440" step="1" value={row.breakMinutes} onChange={(event) => onChange({ ...row, breakMinutes: Number(event.target.value) })} aria-label={`Pause ${germanDateLabel(row.date)}`} className="mt-1 h-10 bg-white font-mono sm:mt-0" />
      </label>
      <label className="flex items-center gap-2 self-end pb-2 text-xs text-slate-600 sm:self-center sm:pb-0">
        <input type="checkbox" checked={row.crossesMidnight} onChange={(event) => onChange({ ...row, crossesMidnight: event.target.checked })} aria-label={`Ende am Folgetag ${germanDateLabel(row.date)}`} className="size-4 accent-[#6658d3]" /> Folgetag
      </label>
      <div className={`self-end pb-2 text-right font-mono text-sm font-semibold sm:self-center sm:pb-0 ${result.status === "invalid" || result.status === "incomplete" ? "text-red-700" : "text-slate-950"}`}>
        <span className="mr-2 font-sans text-xs font-normal text-slate-500 sm:hidden">Netto</span>{status}
      </div>
    </div>
  );
}
