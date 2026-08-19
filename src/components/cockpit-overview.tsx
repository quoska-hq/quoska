import type { CockpitData, CockpitEmployeeRow } from "@/types/cockpit";
import { formatDateDE } from "@/config/client/date-utils";
import { formatCockpitMinutes } from "@/components/cockpit-formatters";
import { CockpitActionCenter } from "@/components/cockpit-action-center";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ChevronRight, Clock3, Target, Users } from "lucide-react";

export function CockpitOverview({
  data,
  onEmployeeSelect,
}: {
  data: CockpitData;
  onEmployeeSelect: (employeeId: string) => void;
}) {
  const metrics = [
    {
      label: "Erfasst",
      value: formatCockpitMinutes(data.summary.workedMinutes),
      hint: data.period.days === 7 ? "letzte 7 Tage" : "letzte 30 Tage",
      icon: Clock3,
    },
    {
      label: "Soll",
      value: formatCockpitMinutes(data.summary.targetMinutes),
      hint: `${data.summary.completionPercent} % erreicht`,
      icon: Target,
    },
    {
      label: "Jetzt aktiv",
      value: String(data.summary.activeNow),
      hint: `von ${data.summary.peopleCount}`,
      icon: Activity,
    },
    {
      label: "Im Blick",
      value: String(data.summary.peopleCount),
      hint: data.selectedEmployeeId ? "Mitarbeiter" : "Teammitglieder",
      icon: Users,
    },
  ];

  return (
    <div className="space-y-5" data-testid="cockpit-overview">
      <CockpitActionCenter
        actions={data.actions}
        onEmployeeSelect={onEmployeeSelect}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} size="sm" className="gap-2 bg-white">
              <CardContent className="flex items-start justify-between py-1">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{metric.hint}</p>
                </div>
                <span className="flex size-8 items-center justify-center bg-[#eeeafd] text-[#6658d3]">
                  <Icon className="size-4" />
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(16rem,1fr)]">
        <WorkTrend data={data} />
        <ProjectDistribution data={data} />
      </div>

      <EmployeeWorkload rows={data.employeeRows} onEmployeeSelect={onEmployeeSelect} />
    </div>
  );
}

function WorkTrend({ data }: { data: CockpitData }) {
  const maximum = Math.max(
    60,
    ...data.daily.flatMap((day) => [day.workedMinutes, day.targetMinutes]),
  );
  return (
    <Card className="bg-white">
      <CardHeader className="flex-row items-center justify-between border-b">
        <CardTitle>Arbeitszeitverlauf</CardTitle>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <Legend color="bg-[#6658d3]" label="Ist" />
          <Legend color="bg-slate-200" label="Soll" />
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto pt-2 [contain:inline-size]">
        <div
          className={`flex h-52 items-end gap-1.5 ${data.period.days === 30 ? "min-w-[760px]" : "min-w-0"}`}
          role="img"
          aria-label="Arbeitszeit und Sollzeit pro Tag"
        >
          {data.daily.map((day, index) => {
            const workedHeight = Math.round((day.workedMinutes / maximum) * 100);
            const targetHeight = Math.round((day.targetMinutes / maximum) * 100);
            const showLabel = data.period.days === 7 || index % 5 === 0 || index === data.daily.length - 1;
            return (
              <div key={day.date} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                <div
                  className="relative mx-auto h-40 w-full max-w-9 border-b border-slate-200"
                  title={`${formatDateDE(day.date)} · Ist ${formatCockpitMinutes(day.workedMinutes)} · Soll ${formatCockpitMinutes(day.targetMinutes)}`}
                >
                  <div
                    className="absolute inset-x-0 bottom-0 bg-slate-200"
                    style={{ height: `${targetHeight}%` }}
                  />
                  <div
                    className="absolute inset-x-[22%] bottom-0 bg-[#6658d3] transition-[height] duration-300"
                    style={{ height: `${workedHeight}%` }}
                  />
                </div>
                <span className="mt-2 h-4 text-center text-[10px] text-slate-500">
                  {showLabel ? formatDateDE(day.date) : ""}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5"><i className={`size-2 ${color}`} />{label}</span>;
}

function ProjectDistribution({ data }: { data: CockpitData }) {
  return (
    <Card className="bg-white">
      <CardHeader className="border-b"><CardTitle>Projekte</CardTitle></CardHeader>
      <CardContent className="space-y-4 pt-1">
        {data.projects.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">Noch keine Projektzeit.</p>
        ) : data.projects.slice(0, 6).map((project) => (
          <div key={project.id ?? "none"} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-medium text-slate-800">{project.name}</span>
              <span className="shrink-0 text-slate-500">{formatCockpitMinutes(project.minutes)}</span>
            </div>
            <div className="h-1.5 overflow-hidden bg-slate-100">
              <div
                className="h-full bg-[#6658d3]"
                style={{ width: `${project.sharePercent}%`, backgroundColor: project.color ?? undefined }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EmployeeWorkload({
  rows,
  onEmployeeSelect,
}: {
  rows: CockpitEmployeeRow[];
  onEmployeeSelect: (employeeId: string) => void;
}) {
  return (
    <Card className="bg-white">
      <CardHeader className="border-b"><CardTitle>Team &amp; Aufgaben</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto p-0! [contain:inline-size]">
        <table className="w-full text-left text-sm sm:min-w-[620px]">
          <thead className="border-b border-slate-900/10 bg-[#faf9f6] text-[10px] uppercase tracking-[0.12em] text-slate-500">
            <tr><th className="px-3 py-3 font-semibold sm:px-4">Mitarbeiter</th><th className="hidden px-4 py-3 font-semibold sm:table-cell">Projekt</th><th className="px-2 py-3 text-right font-semibold sm:px-4">Ist</th><th className="hidden px-4 py-3 text-right font-semibold sm:table-cell">Soll</th><th className="px-2 py-3 text-right font-semibold sm:px-4">Differenz</th><th className="w-10 sm:w-12"><span className="sr-only">Details</span></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-900/10">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-3 py-3 font-medium text-slate-900 sm:px-4"><StatusDot status={row.status} />{row.name}</td>
                <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">{row.projectName ?? "–"}</td>
                <td className="px-2 py-3 text-right tabular-nums sm:px-4">{formatCockpitMinutes(row.workedMinutes)}</td>
                <td className="hidden px-4 py-3 text-right tabular-nums text-slate-500 sm:table-cell">{formatCockpitMinutes(row.targetMinutes)}</td>
                <td className={`px-2 py-3 text-right font-medium tabular-nums sm:px-4 ${row.deltaMinutes < 0 ? "text-amber-700" : "text-emerald-700"}`}>{formatCockpitMinutes(row.deltaMinutes)}</td>
                <td className="pr-2 text-right">
                  <button
                    type="button"
                    onClick={() => onEmployeeSelect(row.id)}
                    className="inline-flex size-8 items-center justify-center text-slate-400 hover:text-[#6658d3]"
                    aria-label={`${row.name} öffnen`}
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Keine Mitarbeiter gefunden.</p>}
      </CardContent>
    </Card>
  );
}

function StatusDot({ status }: { status: CockpitEmployeeRow["status"] }) {
  const color = status === "running" ? "bg-emerald-500" : status === "paused" ? "bg-amber-500" : "bg-slate-300";
  return <i className={`mr-2 inline-block size-2 rounded-full ${color}`} />;
}
