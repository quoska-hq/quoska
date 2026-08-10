"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import type { CockpitData } from "@/types/cockpit";
import { CockpitOverview } from "@/components/cockpit-overview";
import { CockpitActivityLog } from "@/components/cockpit-activity-log";
import { EmployeeCockpitDrawer } from "@/components/employee-cockpit-drawer";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, LayoutDashboard } from "lucide-react";

export function AdminCockpit() {
  const [days, setDays] = useState<7 | 30>(7);
  const [employeeId, setEmployeeId] = useState("all");
  const [detailEmployeeId, setDetailEmployeeId] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery<CockpitData>({
    queryKey: ["adminCockpit", days, employeeId],
    queryFn: async () => {
      const params = new URLSearchParams({ days: String(days) });
      if (employeeId !== "all") params.set("employeeId", employeeId);
      const response = await fetch(`/api/v1/cockpit?${params}`);
      const json: ApiResponse<CockpitData> = await response.json();
      if (!response.ok || !json.data) throw new Error(json.error ?? "Cockpit konnte nicht geladen werden.");
      return json.data;
    },
    refetchInterval: 30_000,
  });

  if (isLoading) return <CockpitSkeleton />;
  if (error || !data) {
    return (
      <Card><CardContent className="py-10 text-center text-sm text-slate-500">
        {error instanceof Error ? error.message : "Cockpit konnte nicht geladen werden."}
      </CardContent></Card>
    );
  }

  return (
    <>
    <Tabs defaultValue="overview" className="gap-5">
      <div className="flex flex-col gap-3 border-b border-slate-900/15 sm:flex-row sm:items-end sm:justify-between">
        <TabsList className="border-0">
          <TabsTrigger value="overview"><LayoutDashboard className="size-4" />Übersicht</TabsTrigger>
          <TabsTrigger value="activity"><Activity className="size-4" />Aktivitäten</TabsTrigger>
        </TabsList>
        <div className="flex gap-2 pb-3">
          <Select value={employeeId} onValueChange={(value) => value && setEmployeeId(value)}>
            <SelectTrigger className="min-w-0 flex-1 bg-white sm:w-52" aria-label="Mitarbeiter filtern">
              <SelectValue>
                {employeeId === "all"
                  ? "Gesamtes Team"
                  : data.employees.find((employee) => employee.id === employeeId)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Gesamtes Team</SelectItem>
              {data.employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(days)} onValueChange={(value) => value && setDays(Number(value) as 7 | 30)}>
            <SelectTrigger className="w-32 bg-white" aria-label="Zeitraum">
              <SelectValue>{days} Tage</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 Tage</SelectItem>
              <SelectItem value="30">30 Tage</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <TabsContent value="overview">
        <CockpitOverview data={data} onEmployeeSelect={setDetailEmployeeId} />
      </TabsContent>
      <TabsContent value="activity"><CockpitActivityLog rows={data.activity} /></TabsContent>
    </Tabs>
    <EmployeeCockpitDrawer
      employeeId={detailEmployeeId}
      days={days}
      onClose={() => setDetailEmployeeId(null)}
    />
    </>
  );
}

function CockpitSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-10 w-80 max-w-full rounded-sm" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28 rounded-sm" />)}
      </div>
      <Skeleton className="h-72 rounded-sm" />
    </div>
  );
}
