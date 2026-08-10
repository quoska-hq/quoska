"use client";

import { Input } from "@/components/ui/input";
import {
  WORKDAY_LABELS,
  type WorkdayKey,
  type WorkSchedule,
} from "@/types/work-schedule";

interface WorkScheduleDayEditorProps {
  open: boolean;
  days: WorkdayKey[];
  value: WorkSchedule;
  onUpdate: (day: WorkdayKey, hours: string, minutes: string) => void;
}

export function WorkScheduleDayEditor({
  open,
  days,
  value,
  onUpdate,
}: WorkScheduleDayEditorProps) {
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="overflow-hidden">
        <div
          inert={!open}
          aria-hidden={!open}
          className="divide-y divide-slate-100 border-t border-slate-100"
        >
          {days.map((day) => {
            const hours = Math.floor(value[day] / 60);
            const minutes = value[day] % 60;
            return (
              <div key={day} className="grid grid-cols-[1fr_11rem] items-center gap-4 py-2.5">
                <span className="text-sm font-medium">{WORKDAY_LABELS[day]}</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1">
                    <Input
                      aria-label={`${WORKDAY_LABELS[day]} Stunden`}
                      type="number"
                      min="0"
                      max="10"
                      step="1"
                      value={hours}
                      onChange={(event) => onUpdate(day, event.target.value, String(minutes))}
                      className="text-right"
                    />
                    <span className="text-[11px] text-slate-500">Std.</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      aria-label={`${WORKDAY_LABELS[day]} Minuten`}
                      type="number"
                      min="0"
                      max="59"
                      step="1"
                      value={minutes}
                      onChange={(event) => onUpdate(day, String(hours), event.target.value)}
                      className="text-right"
                    />
                    <span className="text-[11px] text-slate-500">Min.</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
