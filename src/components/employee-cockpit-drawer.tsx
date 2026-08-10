"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import type { CockpitData } from "@/types/cockpit";
import { formatCockpitMinutes, formatCockpitTimestamp } from "@/components/cockpit-formatters";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Briefcase, CalendarOff, Clock3 } from "lucide-react";

export function EmployeeCockpitDrawer({
  employeeId,
  days,
  onClose,
}: {
  employeeId: string | null;
  days: 7 | 30;
  onClose: () => void;
}) {
  const { data, isLoading, error } = useQuery<CockpitData>({
    queryKey: ["adminCockpit", days, employeeId],
    queryFn: async () => {
      const params = new URLSearchParams({ days: String(days), employeeId: employeeId! });
      const response = await fetch(`/api/v1/cockpit?${params}`);
      const json: ApiResponse<CockpitData> = await response.json();
      if (!response.ok || !json.data) throw new Error(json.error ?? "Details konnten nicht geladen werden.");
      return json.data;
    },
    enabled: Boolean(employeeId),
  });
  const row = data?.employeeRows[0];

  return (
    <Dialog open={Boolean(employeeId)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="top-0 right-0 bottom-0 left-auto h-dvh max-h-none w-full max-w-[34rem] translate-x-0 translate-y-0 grid-rows-[auto_minmax(0,1fr)] gap-0 rounded-none p-0 sm:max-w-[34rem] data-open:zoom-in-100 data-closed:zoom-out-100">
        <DialogHeader className="border-b border-slate-900/10 p-5 pr-12">
          <DialogTitle>{row?.name ?? "Mitarbeiterdetails"}</DialogTitle>
          <DialogDescription>
            {row ? statusLabel(row.status, row.currentProjectName) : "Cockpit wird geladen…"}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto p-5">
          {error ? (
            <p className="py-12 text-center text-sm text-slate-500">
              {error instanceof Error ? error.message : "Details konnten nicht geladen werden."}
            </p>
          ) : isLoading || !row || !data ? (
            <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-44" /></div>
          ) : (
            <div className="space-y-7" data-testid="employee-cockpit-drawer">
              <div className="grid grid-cols-3 border border-slate-900/15">
                <Metric label="Ist" value={formatCockpitMinutes(row.workedMinutes)} />
                <Metric label="Soll" value={formatCockpitMinutes(row.targetMinutes)} />
                <Metric label="Differenz" value={formatCockpitMinutes(row.deltaMinutes)} tone={row.deltaMinutes < 0 ? "warning" : "positive"} />
              </div>

              <section>
                <SectionTitle icon={CalendarOff}>Abwesenheit</SectionTitle>
                <div className="mt-3 flex gap-3">
                  <InfoTile label="Urlaub" value={formatDays(row.leaveDays)} />
                  <InfoTile label="Krank" value={formatDays(row.sickDays)} />
                  <InfoTile label="Einträge" value={String(row.entryCount)} />
                </div>
              </section>

              <section>
                <SectionTitle icon={Activity}>Tagesverlauf</SectionTitle>
                <MiniTrend data={data} />
              </section>

              <section>
                <SectionTitle icon={Briefcase}>Projekte</SectionTitle>
                <div className="mt-3 space-y-3">
                  {data.projects.length === 0 ? <EmptyText>Keine Projektzeit.</EmptyText> : data.projects.slice(0, 5).map((project) => (
                    <div key={project.id ?? "none"}>
                      <div className="flex justify-between gap-3 text-xs"><span className="truncate font-medium">{project.name}</span><span className="text-slate-500">{formatCockpitMinutes(project.minutes)}</span></div>
                      <div className="mt-1.5 h-1 bg-slate-100"><div className="h-full bg-[#6658d3]" style={{ width: `${project.sharePercent}%`, backgroundColor: project.color ?? undefined }} /></div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <SectionTitle icon={Clock3}>Letzte Aktivitäten</SectionTitle>
                <div className="mt-2 divide-y divide-slate-900/10">
                  {data.activity.length === 0 ? <EmptyText>Keine Aktivitäten.</EmptyText> : data.activity.slice(0, 6).map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3 py-3 text-xs">
                      <div><p className="font-medium text-slate-900">{item.title}</p><p className="mt-0.5 text-slate-500">{item.projectName ?? "Ohne Projekt"}</p></div>
                      <time className="shrink-0 text-slate-500">{formatCockpitTimestamp(item.occurredAt)}</time>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "warning" | "positive" }) {
  const color = tone === "warning" ? "text-amber-700" : tone === "positive" ? "text-emerald-700" : "text-slate-950";
  return <div className="border-r border-slate-900/10 p-3 last:border-r-0"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p><p className={`mt-1 text-sm font-semibold ${color}`}>{value}</p></div>;
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return <div className="flex-1 bg-[#f6f4ef] px-3 py-2"><p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 font-medium">{value}</p></div>;
}

function SectionTitle({ icon: Icon, children }: { icon: typeof Activity; children: React.ReactNode }) {
  return <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600"><Icon className="size-4 text-[#6658d3]" />{children}</h3>;
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="py-3 text-xs text-slate-500">{children}</p>;
}

function MiniTrend({ data }: { data: CockpitData }) {
  const max = Math.max(60, ...data.daily.map((day) => Math.max(day.workedMinutes, day.targetMinutes)));
  return <div className="mt-3 flex h-20 items-end gap-1">{data.daily.map((day) => <div key={day.date} className="relative h-full flex-1 bg-slate-100" title={day.date}><div className="absolute inset-x-0 bottom-0 bg-[#6658d3]" style={{ height: `${Math.round((day.workedMinutes / max) * 100)}%` }} /></div>)}</div>;
}

function statusLabel(status: "running" | "paused" | "off", project: string | null): string {
  if (status === "running") return `Arbeitet${project ? ` · ${project}` : ""}`;
  if (status === "paused") return `In Pause${project ? ` · ${project}` : ""}`;
  return "Aktuell nicht eingestempelt";
}

function formatDays(days: number): string {
  return `${days} ${days === 1 ? "Tag" : "Tage"}`;
}
