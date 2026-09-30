import type { PlanningBoardData } from "@/types/planning-client";
import type { PlanningPeriod, PlanningShift } from "@/types/planning";
import { planningDay } from "@/config/client/planning-calendar";
import { formatDateFullDE, formatTimeLocal } from "@/config/client/date-utils";
import { PLANNING_STATUS_LABELS } from "@/config/planning";
export function PlanningWeek({
  data,
  period,
  dates,
  locationId,
  onShift,
}: {
  data: PlanningBoardData;
  period?: PlanningPeriod;
  dates: string[];
  locationId: string;
  onShift: (shift: PlanningShift) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
      {dates.map((date) => {
        const dayPeriod = data.state.periods.find(
          (p) => p.month === date.slice(0, 7) + "-01",
        );
        const neighboring = Boolean(
          period && date.slice(0, 7) !== period.month.slice(0, 7),
        );
        return (
          <div key={date} className="min-w-0 rounded-xl bg-[#f8f6ef] p-3">
            <p className="mb-3 text-sm font-semibold">
              {["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][planningDay(date)]}{" "}
              {formatDateFullDE(date)}
            </p>
            {neighboring && (
              <p className="mb-2 text-xs text-muted-foreground">
                Nachbarmonat
                {dayPeriod
                  ? ` · ${PLANNING_STATUS_LABELS[dayPeriod.status]}`
                  : ""}
              </p>
            )}
            <div className="space-y-2">
              {dayPeriod?.shifts
                .filter(
                  (s) =>
                    s.date === date &&
                    (!locationId || s.locationId === locationId),
                )
                .map((s) => (
                  <button
                    key={s.id}
                    disabled={
                      neighboring ||
                      dayPeriod.status === "closed" ||
                      Date.parse(s.start) < Date.parse(data.context.now)
                    }
                    className={`w-full rounded-lg border p-3 text-left text-xs transition hover:border-[#6658d3] ${s.employeeId ? "border-[#ddd8ee] bg-white" : "border-amber-300 bg-amber-50"}`}
                    onClick={() => onShift(s)}
                  >
                    <strong className="block">
                      {formatTimeLocal(s.start)}–{formatTimeLocal(s.end)}{" "}
                      {s.locked ? "🔒" : ""}
                    </strong>
                    <span className="mt-1 block">
                      {
                        data.state.config.locations.find(
                          (l) => l.id === s.locationId,
                        )?.name
                      }
                    </span>
                    <span className="block text-muted-foreground">
                      {
                        data.state.config.skills.find((k) => k.id === s.skillId)
                          ?.name
                      }
                    </span>
                    <span className="mt-2 block font-medium">
                      {data.context.employees.find((e) => e.id === s.employeeId)
                        ?.name ?? "Offen"}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
