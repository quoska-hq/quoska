"use client";

import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { ApiResponse } from "@/types/api";
import type { Project } from "@/types/database";
import { UNASSIGNED_PROJECT, type ProjectReportBooking, type ProjectReportRow } from "@/types/project";
import {
  formatDateFullDE,
  formatTimeLocal,
  getMonthBoundsForOffset,
  getWeekBoundsForOffset,
  isoToBerlinDateTime,
} from "@/config/client/date-utils";
import { summarizeProjectBookings } from "@/services/projectReportBuilder";
import { ExportButtons } from "@/components/export-buttons";
import { ProjectBalanceTable, useProjectBalances } from "@/components/project-balance-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours === 0 ? `${rest} Min` : `${hours} Std ${rest} Min`;
}

function formatClockOut(booking: ProjectReportBooking): string {
  if (!booking.clock_out) return "Offen";
  const { date, time } = isoToBerlinDateTime(booking.clock_out);
  return date === booking.date ? time : `${formatDateFullDE(date)}, ${time}`;
}

function ProjectBookings({ row }: { row: ProjectReportRow }) {
  return (
    <div className="max-w-full overflow-x-auto overscroll-x-contain [contain:inline-size]">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Buchungen für {row.project_name}</caption>
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">Datum</th>
            <th scope="col" className="px-3 py-2 font-medium">Mitarbeiter</th>
            <th scope="col" className="px-3 py-2 font-medium">Beginn</th>
            <th scope="col" className="px-3 py-2 font-medium">Ende</th>
            <th scope="col" className="px-3 py-2 font-medium">Pause</th>
            <th scope="col" className="px-3 py-2 font-medium">Netto</th>
          </tr>
        </thead>
        <tbody>
          {row.bookings.map((booking) => (
            <tr key={booking.id} className="border-t border-border/70">
              <td className="px-3 py-2 tabular-nums">{formatDateFullDE(booking.date)}</td>
              <td className="px-3 py-2">{booking.employee_name}</td>
              <td className="px-3 py-2 tabular-nums">{formatTimeLocal(booking.clock_in)}</td>
              <td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatClockOut(booking)}</td>
              <td className="whitespace-nowrap px-3 py-2 tabular-nums">{booking.break_minutes} Min</td>
              <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                {booking.clock_out ? formatDuration(booking.net_minutes) : "–"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type FilterOption = { id: string; name: string };

function ReportFilter({ label, allLabel, selected, options, onChange }: {
  label: string;
  allLabel: string;
  selected: FilterOption | null;
  options: Map<string, string>;
  onChange: (selected: FilterOption | null) => void;
}) {
  const selectedName = selected && (options.get(selected.id) ?? selected.name);
  return (
    <Select value={selected?.id ?? ""} onValueChange={(id) => {
      const name = id ? options.get(id) : undefined;
      onChange(id && name ? { id, name } : null);
    }}>
      <SelectTrigger aria-label={label} size="sm" className="min-w-0 w-full sm:w-56">
        <SelectValue className="min-w-0"><span className="truncate" title={selectedName ?? allLabel}>{selectedName ?? allLabel}</span></SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">{allLabel}</SelectItem>
        {selected && !options.has(selected.id) && <SelectItem value={selected.id}>{selected.name}</SelectItem>}
        {Array.from(options, ([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function ProjectReportTable({ initialProjectId }: { initialProjectId?: string }) {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [offset, setOffset] = useState(0);
  const [project, setProject] = useState<FilterOption | null>(() => initialProjectId
    ? { id: initialProjectId, name: initialProjectId === UNASSIGNED_PROJECT ? "Ohne Projekt" : "Ausgewähltes Projekt" }
    : null);
  const [employee, setEmployee] = useState<FilterOption | null>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(initialProjectId ?? null);
  const isWeek = period === "week";
  const { start, end } = isWeek ? getWeekBoundsForOffset(offset) : getMonthBoundsForOffset(offset);

  const { data, error, isLoading } = useQuery<ProjectReportRow[]>({
    queryKey: ["projectReport", start, end],
    queryFn: async () => {
      const res = await fetch(`/api/v1/reports/projects?startDate=${start}&endDate=${end}`);
      const json: ApiResponse<ProjectReportRow[]> = await res.json();
      if (!res.ok || !json.data) throw new Error(json.error ?? "Projektbericht konnte nicht geladen werden.");
      return json.data;
    },
  });
  const showBalances = project?.id !== UNASSIGNED_PROJECT;
  const { data: balances, error: balanceError } = useProjectBalances(start, end, showBalances);

  const projects = new Map<string, string>();
  const employees = new Map<string, string>();
  for (const row of data ?? []) {
    projects.set(row.project_id ?? UNASSIGNED_PROJECT, row.project_name);
    for (const booking of row.bookings) {
      employees.set(booking.employee_id, booking.employee_name);
    }
  }
  for (const row of balances ?? []) {
    projects.set(row.projectId, row.projectName);
    employees.set(row.employeeId, row.employeeName);
  }
  const visibleBalances = (balances ?? []).filter((row) =>
    (!project || row.projectId === project.id) && (!employee || row.employeeId === employee.id),
  );

  const { data: linkedProject } = useQuery({
    queryKey: ["reportProjectName", initialProjectId],
    enabled: !!(
      data && project?.id && project.id === initialProjectId
      && project.id !== UNASSIGNED_PROJECT && !projects.has(project.id)
    ),
    queryFn: async () => {
      const response = await fetch(`/api/v1/projects/${initialProjectId}`);
      if (!response.ok) return null;
      const json: ApiResponse<Project> = await response.json();
      return json.data;
    },
  });
  if (linkedProject && !projects.has(linkedProject.id)) projects.set(linkedProject.id, linkedProject.name);

  const rows = (data ?? []).flatMap((row) => {
    if (project && (row.project_id ?? UNASSIGNED_PROJECT) !== project.id) return [];
    if (!employee) return [row];
    const bookings = row.bookings.filter((booking) => booking.employee_id === employee.id);
    return bookings.length ? [{ ...row, ...summarizeProjectBookings(bookings) }] : [];
  }).sort((a, b) => b.total_minutes - a.total_minutes);

  function togglePeriod(nextPeriod: "week" | "month") {
    if (nextPeriod === period) return;
    setPeriod(nextPeriod);
    setOffset(0);
  }

  function projectToggle(row: ProjectReportRow) {
    const key = row.project_id ?? UNASSIGNED_PROJECT;
    const expanded = expandedProject === key;
    return (
      <Button
        variant="ghost"
        size="sm"
        aria-expanded={expanded}
        onClick={() => setExpandedProject(expanded ? null : key)}
        className="h-auto max-w-full justify-start whitespace-normal px-1 py-1 text-left"
      >
        <ChevronDown className={expanded ? "rotate-180" : ""} />
        <span className="break-words [overflow-wrap:anywhere]">{row.project_name}</span>
      </Button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1" role="group" aria-label="Zeitraum">
          <Button variant={isWeek ? "secondary" : "outline"} size="sm" aria-pressed={isWeek}
            onClick={() => togglePeriod("week")}>Woche</Button>
          <Button variant={isWeek ? "outline" : "secondary"} size="sm" aria-pressed={!isWeek}
            onClick={() => togglePeriod("month")}>Monat</Button>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Button variant="outline" size="icon-sm" aria-label={isWeek ? "Vorwoche" : "Vormonat"}
            onClick={() => setOffset((value) => value - 1)}>
            <ChevronLeft />
          </Button>
          <span className="text-center text-sm font-medium tabular-nums">
            {offset === 0 && (isWeek ? "Diese Woche · " : "Dieser Monat · ")}
            {formatDateFullDE(start)} – {formatDateFullDE(end)}
          </span>
          <Button variant="outline" size="icon-sm" aria-label={isWeek ? "Nächste Woche" : "Nächster Monat"}
            onClick={() => setOffset((value) => value + 1)} disabled={offset >= 0}>
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <ReportFilter label="Projekt filtern" allLabel="Alle Projekte" selected={project} options={projects} onChange={setProject} />
        <ReportFilter label="Mitarbeiter filtern" allLabel="Alle Mitarbeiter" selected={employee} options={employees} onChange={setEmployee} />
        <ExportButtons startDate={start} endDate={end} projectId={project?.id} employeeId={employee?.id}
          disabled={isLoading || !!error} />
      </div>

      {showBalances && <ProjectBalanceTable rows={visibleBalances} endDate={end} error={balanceError} />}

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-sm" />
      ) : error || rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {error?.message ?? "Keine Buchungen für diesen Zeitraum und diese Auswahl."}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3 sm:hidden">
            {rows.map((row) => (
              <article key={row.project_id ?? UNASSIGNED_PROJECT} className="rounded-sm border bg-white p-3">
                <h3 className="min-w-0">{projectToggle(row)}</h3>
                {row.customer_name && <p className="px-1 text-xs text-muted-foreground">{row.customer_name}</p>}
                <dl className="my-2 grid grid-cols-3 gap-2 px-1">
                  <div>
                    <dt className="text-xs text-muted-foreground">Stunden</dt>
                    <dd className="text-sm font-semibold tabular-nums">{formatDuration(row.total_minutes)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Einträge</dt>
                    <dd className="text-sm font-semibold tabular-nums">{row.entry_count}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Personen</dt>
                    <dd className="text-sm font-semibold tabular-nums">{row.employee_count}</dd>
                  </div>
                </dl>
                {expandedProject === (row.project_id ?? UNASSIGNED_PROJECT) && <ProjectBookings row={row} />}
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-sm border bg-white sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-muted-foreground">
                  <th scope="col" className="px-4 py-2.5 text-left font-medium">Projekt</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-medium">Kunde</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Stunden</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Einträge</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Mitarbeiter</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const key = row.project_id ?? UNASSIGNED_PROJECT;
                  return (
                    <Fragment key={key}>
                      <tr className="border-b last:border-b-0">
                        <td className="px-3 py-2">{projectToggle(row)}</td>
                        <td className="px-4 py-2 text-muted-foreground">{row.customer_name ?? "–"}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">{formatDuration(row.total_minutes)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{row.entry_count}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{row.employee_count}</td>
                      </tr>
                      {expandedProject === key && (
                        <tr className="border-b bg-muted/30 last:border-b-0">
                          <td colSpan={5} className="px-4 py-2"><ProjectBookings row={row} /></td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
