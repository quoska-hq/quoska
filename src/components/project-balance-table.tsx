"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatDateFullDE, getLocalToday } from "@/config/client/date-utils";
import { formatDuration } from "@/services/overtimeService";
import type { ApiResponse } from "@/types/api";
import type { ProjectBalanceRow } from "@/types/project-balance";

export function useProjectBalances(startDate: string, endDate: string, enabled: boolean) {
  return useQuery({
    queryKey: ["projectBalances", startDate, endDate],
    enabled,
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(`/api/v1/reports/project-balances?${params}`, { signal });
      const json: ApiResponse<ProjectBalanceRow[]> = await response.json();
      if (!response.ok || !json.data) throw new Error(json.error ?? "Projektkonten konnten nicht geladen werden.");
      return json.data;
    },
  });
}

function formatBalance(minutes: number): string {
  const prefix = minutes < 0 ? "−" : minutes > 0 ? "+" : "";
  return prefix + formatDuration(Math.abs(minutes));
}

export function ProjectBalanceTable({ rows, endDate, error }: {
  rows: ProjectBalanceRow[];
  endDate: string;
  error: Error | null;
}) {
  const section = useRef<HTMLElement>(null);
  const visible = rows.length > 0 || error !== null;
  useEffect(() => {
    if (visible && window.location.hash === "#projektkonten") section.current?.scrollIntoView();
  }, [visible]);
  if (!visible) return null;
  const today = getLocalToday();
  const asOf = formatDateFullDE(endDate < today ? endDate : today);

  return (
    <section ref={section} id="projektkonten" aria-label="Projektkonten" className="scroll-mt-20">
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">Projektkonten</h2>
          {error ? (
            <p role="alert" className="text-sm text-destructive">{error.message}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Soll und Ist für den gewählten Zeitraum, Stand {asOf}. Der Saldo summiert Ist minus Soll seit dem ersten Ziel.
            </p>
          )}
        </CardHeader>
        {!error && (
          <CardContent className="space-y-3">
            <div className="divide-y divide-border md:hidden">
              {rows.map((row) => (
                <article key={`${row.projectId}/${row.employeeId}`} className="space-y-2 py-3 first:pt-0">
                  <div className="min-w-0 [overflow-wrap:anywhere]">
                    <h3 className="font-semibold">{row.projectName}</h3>
                    <p className="text-xs text-muted-foreground">{row.employeeName}</p>
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-sm tabular-nums">
                    <div><dt className="text-xs text-muted-foreground">Soll</dt><dd>{formatDuration(row.targetMinutes)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Ist</dt><dd>{formatDuration(row.actualMinutes)}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Saldo</dt><dd className="font-semibold">{formatBalance(row.balanceMinutes)}</dd></div>
                  </dl>
                </article>
              ))}
            </div>

            <table className="hidden w-full table-fixed text-sm md:table">
              <caption className="sr-only">Projektkonten je Mitarbeiter</caption>
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="w-[25%] pb-2 pr-2 font-medium">Projekt</th>
                  <th scope="col" className="w-[25%] pb-2 pr-2 font-medium">Mitarbeiter</th>
                  <th scope="col" className="pb-2 pl-2 text-right font-medium">Soll</th>
                  <th scope="col" className="pb-2 pl-2 text-right font-medium">Ist</th>
                  <th scope="col" className="pb-2 pl-2 text-right font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border tabular-nums">
                {rows.map((row) => (
                  <tr key={`${row.projectId}/${row.employeeId}`}>
                    <td className="py-2 pr-2 [overflow-wrap:anywhere]">{row.projectName}</td>
                    <td className="py-2 pr-2 [overflow-wrap:anywhere]">{row.employeeName}</td>
                    <td className="py-2 pl-2 text-right">{formatDuration(row.targetMinutes)}</td>
                    <td className="py-2 pl-2 text-right">{formatDuration(row.actualMinutes)}</td>
                    <td className="py-2 pl-2 text-right font-semibold">{formatBalance(row.balanceMinutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground">
              Das Wochenziel verteilt sich anteilig auf Montag bis Freitag, unabhängig von Feiertagen und Abwesenheiten.
              Abgeschlossene Buchungen zählen auch am Wochenende. Bei einem Wochenziel von 0 bleibt der Saldo stehen.
            </p>
          </CardContent>
        )}
      </Card>
    </section>
  );
}
