"use client";

import { useRef, useState } from "react";
import type { CockpitData } from "@/types/cockpit";
import { formatDateFullDE } from "@/config/client/date-utils";
import { formatCockpitMinutes } from "@/components/cockpit-formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CockpitWorkTrend({ data }: { data: CockpitData }) {
  const [selectedDate, setSelectedDate] = useState(data.daily.at(-1)?.date);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = data.daily.find((day) => day.date === selectedDate) ?? data.daily.at(-1);
  const highlighted = data.daily.find((day) => day.date === hoveredDate) ?? selected;
  const peakHours = Math.max(1, ...data.daily.flatMap((day) => [day.workedMinutes / 60, day.targetMinutes / 60]));
  const step = [0.25, 0.5, 1, 2, 4, 8, 10, 20, 40, 80, 100].find((value) => value * 4 >= peakHours)
    ?? Math.ceil(peakHours / 400) * 100;
  const maximum = step * 4 * 60;
  const delta = highlighted ? highlighted.workedMinutes - highlighted.targetMinutes : 0;
  const lastIndex = data.daily.length - 1;
  const middleIndex = Math.floor(lastIndex / 2);

  return (
    <Card className="bg-white" data-testid="cockpit-work-trend">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Arbeitszeitverlauf</CardTitle>
          <p className="mt-1 text-xs text-slate-500">
            {formatDateFullDE(data.period.startDate)} – {formatDateFullDE(data.period.endDate)}
          </p>
        </div>
        <div className="flex items-center gap-3 pt-1 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-[#6658d3]" />Ist</span>
          <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm border-t-2 border-slate-400 bg-slate-100" />Soll</span>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="relative ml-12 h-48 sm:h-52">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            {[4, 3, 2, 1, 0].map((tick) => (
              <div key={tick} className="absolute inset-x-0 border-t border-slate-100" style={{ bottom: `${tick * 25}%` }}>
                <span className="absolute -left-12 -translate-y-1/2 text-[10px] tabular-nums text-slate-400">
                  {(step * tick).toLocaleString("de-DE")} h
                </span>
              </div>
            ))}
          </div>
          <div
            role="group"
            aria-label="Arbeitszeit und Sollzeit pro Tag"
            className="relative flex h-full gap-0.5 sm:gap-1"
            onMouseLeave={() => setHoveredDate(null)}
          >
            {data.daily.map((day, index) => (
              <button
                key={day.date}
                ref={(button) => { buttons.current[index] = button; }}
                type="button"
                aria-label={`${formatDateFullDE(day.date)} · Ist ${formatCockpitMinutes(day.workedMinutes)} · Soll ${formatCockpitMinutes(day.targetMinutes)}`}
                aria-pressed={selected?.date === day.date}
                tabIndex={selected?.date === day.date ? 0 : -1}
                className={`relative h-full min-w-0 flex-1 cursor-pointer rounded-t-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#6658d3] focus-visible:ring-offset-2 ${highlighted?.date === day.date ? "bg-[#6658d3]/[0.06]" : "hover:bg-slate-50"}`}
                onMouseEnter={() => setHoveredDate(day.date)}
                onFocus={() => { setHoveredDate(null); setSelectedDate(day.date); }}
                onClick={() => { setHoveredDate(null); setSelectedDate(day.date); }}
                onKeyDown={(event) => {
                  const next = event.key === "ArrowRight" ? Math.min(lastIndex, index + 1)
                    : event.key === "ArrowLeft" ? Math.max(0, index - 1)
                      : event.key === "Home" ? 0
                        : event.key === "End" ? lastIndex : null;
                  if (next === null) return;
                  event.preventDefault();
                  buttons.current[next]?.focus();
                }}
              >
                <span
                  className="absolute inset-x-[12%] bottom-0 mx-auto max-w-12 rounded-t-sm bg-slate-100"
                  style={{ height: `${day.targetMinutes / maximum * 100}%` }}
                />
                <span
                  className="absolute inset-x-[26%] bottom-0 mx-auto max-w-7 rounded-t-sm bg-gradient-to-t from-[#6658d3] to-[#9b8eeb] motion-safe:transition-[height] motion-safe:duration-300"
                  style={{ height: `${day.workedMinutes / maximum * 100}%`, minHeight: day.workedMinutes > 0 ? 2 : 0 }}
                />
                {day.targetMinutes > 0 && (
                  <span
                    className="absolute inset-x-[8%] mx-auto max-w-14 border-t-2 border-slate-400/70"
                    style={{ bottom: `${day.targetMinutes / maximum * 100}%` }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="relative ml-12 mt-3 h-5 text-[10px] tabular-nums text-slate-500" aria-hidden="true" data-testid="cockpit-date-labels">
          {data.daily.map((day, index) => {
            const endpoint = index === 0 || index === lastIndex;
            const midpoint = index === middleIndex && lastIndex > 2;
            if (!endpoint && !midpoint) return null;
            return (
              <span
                key={day.date}
                className={`absolute whitespace-nowrap ${index === 0 ? "" : index === lastIndex ? "-translate-x-full" : "-translate-x-1/2"} ${endpoint ? "" : "hidden sm:block"}`}
                style={{ left: `${lastIndex > 0 ? index / lastIndex * 100 : 50}%` }}
              >
                {formatDateFullDE(day.date)}
              </span>
            );
          })}
        </div>
        {highlighted ? (
          <div className="mt-4 rounded-sm border border-slate-100 bg-[#faf9fc] px-3 py-3" data-testid="cockpit-day-detail">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-1 text-xs">
              <time dateTime={highlighted.date} className="font-medium text-slate-800">{formatDateFullDE(highlighted.date)}</time>
              <span className="text-[11px] text-slate-500">Tag im Diagramm auswählen</span>
            </div>
            <dl className="grid grid-cols-3 gap-2 text-xs">
              <DayMetric label="Ist" value={formatCockpitMinutes(highlighted.workedMinutes)} className="text-[#6658d3]" />
              <DayMetric label="Soll" value={formatCockpitMinutes(highlighted.targetMinutes)} />
              <DayMetric label="Differenz" value={`${delta > 0 ? "+" : ""}${formatCockpitMinutes(delta)}`} />
            </dl>
          </div>
        ) : <p className="py-6 text-center text-sm text-slate-500">Keine Tageswerte im gewählten Zeitraum.</p>}
        <p className="mt-3 text-[11px] text-slate-500">
          {data.summary.workedMinutes === 0 ? "Noch keine abgeschlossenen Zeiten im Zeitraum." : "Ist: abgeschlossene Zeiten, abzüglich Pausen."}
        </p>
      </CardContent>
    </Card>
  );
}

function DayMetric({ label, value, className = "text-slate-800" }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd className={`mt-1 font-semibold tabular-nums ${className}`}>{value}</dd>
    </div>
  );
}
