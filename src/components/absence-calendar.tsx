"use client";

import { useEffect, useState } from "react";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { de } from "date-fns/locale/de";
import { addMonths, format, startOfMonth, endOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import type { ApiResponse } from "@/types/api";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AbsenceEntry {
  date: string;
  employee_id: string;
  employee_name?: string;
  type: "vacation" | "sick";
}

interface DateAbsenceInfo {
  vacation: boolean;
  sick: boolean;
}

function getAbsenceCalendarQuery(month: Date) {
  const monthStart = format(startOfMonth(month), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(month), "yyyy-MM-dd");

  return {
    queryKey: ["absenceCalendar", monthStart, monthEnd] as const,
    queryFn: async (): Promise<AbsenceEntry[]> => {
      const res = await fetch(
        `/api/v1/absence-calendar?start_date=${monthStart}&end_date=${monthEnd}`,
      );
      const json: ApiResponse<AbsenceEntry[]> = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Kalender konnte nicht geladen werden");
      return json.data ?? [];
    },
  };
}

export function AbsenceCalendar() {
  // eslint-disable-next-line @quoska/legal/no-client-timestamps -- display-only date for calendar
  const [month, setMonth] = useState<Date>(new Date());
  const queryClient = useQueryClient();

  const monthLabel = format(month, "MMMM yyyy", { locale: de });

  const { data: absences, isLoading, isFetching } = useQuery({
    ...getAbsenceCalendarQuery(month),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    for (const offset of [-1, 1]) {
      void queryClient.prefetchQuery(
        getAbsenceCalendarQuery(addMonths(month, offset)),
      );
    }
  }, [month, queryClient]);

  // Group absences by date
  const byDate = new Map<string, DateAbsenceInfo>();
  for (const a of absences ?? []) {
    const existing = byDate.get(a.date) ?? { vacation: false, sick: false };
    if (a.type === "vacation") existing.vacation = true;
    if (a.type === "sick") existing.sick = true;
    byDate.set(a.date, existing);
  }

  // Dates with absences for the calendar modifiers
  const vacationDates = (absences ?? [])
    .filter((a) => a.type === "vacation")
    // eslint-disable-next-line @quoska/legal/no-client-timestamps -- display-only date for calendar widget
    .map((a) => new Date(a.date + "T12:00:00"));
  const sickDates = (absences ?? [])
    .filter((a) => a.type === "sick")
    // eslint-disable-next-line @quoska/legal/no-client-timestamps -- display-only date for calendar widget
    .map((a) => new Date(a.date + "T12:00:00"));

  return (
    <Card className="overflow-hidden border-slate-900/15 bg-white shadow-none">
      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-4 p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-4 w-52" />
              </div>
              <Skeleton className="h-9 w-20" />
            </div>
            <Skeleton className="h-80 w-full" />
          </div>
        ) : (
          <div>
            <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Teamkalender
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  Genehmigte Abwesenheiten im Monatsüberblick
                </p>
              </div>

              <div
                className="flex items-center gap-4 text-xs font-medium text-slate-600"
                aria-label="Legende"
              >
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-[2px] bg-emerald-400" />
                  <span>Urlaub</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-[2px] bg-rose-400" />
                  <span>Krank</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-900/10">
              <div className="grid grid-cols-[2.25rem_1fr_2.25rem] items-center gap-2 bg-[#f8f7f3] px-3 py-2.5 sm:px-4">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 border-slate-900/15 bg-white text-slate-700 shadow-none hover:border-slate-900/30 hover:bg-slate-900 hover:text-white"
                  aria-label="Vorheriger Monat"
                  onClick={() => setMonth((current) => addMonths(current, -1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>

                <div className="flex items-center justify-center gap-2">
                  <p
                    className="text-center text-sm font-semibold capitalize tracking-[-0.01em] text-slate-900 sm:text-base"
                    role="status"
                    aria-live="polite"
                  >
                    {monthLabel}
                  </p>
                  {isFetching && !isLoading && (
                    <LoaderCircle
                      className="size-3.5 animate-spin text-slate-400"
                      aria-label="Kalenderdaten werden geladen"
                    />
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-9 border-slate-900/15 bg-white text-slate-700 shadow-none hover:border-slate-900/30 hover:bg-slate-900 hover:text-white"
                  aria-label="Nächster Monat"
                  onClick={() => setMonth((current) => addMonths(current, 1))}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>

              <Calendar
                aria-label="Abwesenheitskalender"
                locale={de}
                month={month}
                onMonthChange={setMonth}
                fixedWeeks
                hideNavigation
                modifiers={{
                  vacation: vacationDates,
                  sick: sickDates,
                }}
                modifiersClassNames={{
                  vacation: "",
                  sick: "",
                }}
                className="w-full border-0 p-0 [--cell-radius:0]"
                classNames={{
                  root: "w-full",
                  months: "gap-0",
                  month: "gap-0",
                  month_caption: "hidden",
                  month_grid: "w-full border-collapse",
                  weekdays:
                    "flex w-full border-y border-slate-900/10 bg-white",
                  weekday:
                    "flex-1 px-2 py-2.5 text-left text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-400 select-none sm:px-3 sm:text-[0.68rem]",
                  week: "flex w-full border-b border-slate-900/10 last:border-b-0",
                  day: "group/day relative h-13 w-full p-0 text-left select-none sm:h-16 lg:h-[4.25rem]",
                  today: "bg-transparent text-inherit",
                }}
                components={{
                  // Override Day (the <td> cell) instead of DayButton, because
                  // DayButton only renders in interactive mode (mode/onDayClick set).
                  Day: ({
                    day,
                    modifiers,
                    className: dayClassName,
                    ...tdProps
                  }) => (
                    <AbsenceDayCell
                      day={day}
                      modifiers={modifiers}
                      dateInfo={byDate.get(
                        format(day.date, "yyyy-MM-dd"),
                      )}
                      className={dayClassName}
                      cellProps={tdProps}
                    />
                  ),
                }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Custom Day cell that renders absence indicator bars.
 * Overrides the react-day-picker Day component (renders <td>).
 */
interface AbsenceDayCellProps {
  day: { date: Date };
  modifiers: Record<string, boolean>;
  dateInfo?: DateAbsenceInfo;
  className?: string;
  cellProps: React.HTMLAttributes<HTMLDivElement>;
}

function AbsenceDayCell({
  day,
  modifiers,
  dateInfo,
  className: dayClassName,
  cellProps,
}: AbsenceDayCellProps) {
  const isToday = Boolean(modifiers.today);
  const isOutside = Boolean(modifiers.outside);
  const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
  const hasAbsence = dateInfo && (dateInfo.vacation || dateInfo.sick);
  const both = dateInfo?.vacation && dateInfo?.sick;

  return (
    <td
      {...cellProps}
      className={cn(
        dayClassName,
        "border-r border-slate-900/10 last:border-r-0",
        isOutside && "opacity-35",
      )}
    >
      <div
        className={cn(
          "relative flex h-full w-full items-start justify-start p-2 transition-colors sm:p-2.5",
          isWeekend && !isOutside && "bg-slate-50/55",
          !isOutside && "hover:bg-slate-100/70",
          hasAbsence && !isOutside && "bg-slate-50",
          isToday && !isOutside &&
            "bg-[#f5f3ff] shadow-[inset_0_2px_0_#6658d3]",
        )}
      >
        <span
          className={cn(
            "text-xs font-medium leading-none tabular-nums text-slate-700 sm:text-sm",
            isToday && "font-bold text-[#5548ba]",
          )}
        >
          {day.date.getDate()}
        </span>
        {isToday && !isOutside && (
          <span className="absolute right-2 top-2 hidden text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-[#6658d3] sm:block">
            Heute
          </span>
        )}
        {hasAbsence && !isOutside && (
          <span
            className={`absolute inset-x-2 bottom-1.5 h-[3px] rounded-full sm:inset-x-2.5 sm:bottom-2 ${
              both
                ? "bg-gradient-to-r from-emerald-400 to-rose-400"
                : dateInfo.vacation
                  ? "bg-emerald-400"
                  : "bg-rose-400"
            }`}
          />
        )}
      </div>
    </td>
  );
}
