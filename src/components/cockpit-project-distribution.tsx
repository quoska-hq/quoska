"use client";

import { useId, useState } from "react";
import { Briefcase, ChevronDown, ChevronRight } from "lucide-react";
import type { CockpitData } from "@/types/cockpit";
import { formatCockpitMinutes } from "@/components/cockpit-formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const VISIBLE_PROJECTS = 5;

export function CockpitProjectDistribution({ data, onEmployeeSelect }: {
  data: CockpitData;
  onEmployeeSelect: (employeeId: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const listId = useId();
  const totalMinutes = data.projects.reduce((sum, project) => sum + project.minutes, 0);
  const remaining = data.projects.length - VISIBLE_PROJECTS;
  const knownEmployees = new Set(data.employees.map((employee) => employee.id));

  return (
    <Card className="bg-white" data-testid="cockpit-project-distribution">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Projekte</CardTitle>
          <p className="mt-1 text-xs text-slate-500">Anteil an der erfassten Zeit</p>
        </div>
        <span className="shrink-0 rounded-sm bg-[#f3f0fc] px-2 py-1 text-xs font-medium tabular-nums text-[#6658d3]">
          {formatCockpitMinutes(totalMinutes)}
        </span>
      </CardHeader>
      <CardContent>
        {data.projects.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center text-center">
            <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#f3f0fc] text-[#6658d3]"><Briefcase className="size-5" /></span>
            <p className="text-sm font-medium text-slate-700">Noch keine Projektzeit.</p>
            <p className="mt-1 max-w-60 text-xs leading-relaxed text-slate-500">Sobald Zeiten abgeschlossen sind, siehst du hier ihre Verteilung.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              {data.projects.map((project) => (
                <span key={project.id ?? "none"} style={{ width: `${project.minutes / totalMinutes * 100}%`, backgroundColor: project.color ?? (project.id ? "#6658d3" : "#94a3b8") }} />
              ))}
            </div>
            <div id={listId} className="divide-y divide-slate-100">
              {data.projects.map((project, index) => (
                <details key={project.id ?? "none"} className="group/project" hidden={!showAll && index >= VISIBLE_PROJECTS}>
                  <summary className="-mx-2 flex cursor-pointer list-none items-center gap-2 rounded-sm px-2 py-3 outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#6658d3] [&::-webkit-details-marker]:hidden">
                    <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: project.color ?? (project.id ? "#6658d3" : "#94a3b8") }} />
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-xs font-medium leading-relaxed text-slate-800">{project.name}</span>
                      <span className="mt-0.5 block text-[11px] text-slate-500">
                        {project.contributors.length} {project.contributors.length === 1 ? "Person" : "Personen"}
                      </span>
                    </span>
                    <span className="shrink-0 text-right tabular-nums">
                      <span className="block text-xs font-medium text-slate-800">{formatCockpitMinutes(project.minutes)}</span>
                      <span className="mt-0.5 block text-[11px] text-slate-500">{project.sharePercent === 0 ? "< 1" : project.sharePercent} %</span>
                    </span>
                    <ChevronDown className="ml-1 size-4 shrink-0 text-slate-400 transition-transform group-open/project:rotate-180 motion-reduce:transition-none" />
                  </summary>
                  <div className="mb-3 rounded-sm border border-slate-100 bg-[#faf9fc] p-2">
                    <p className="px-2 pb-1 pt-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">Mitarbeiter · erfasste Zeit</p>
                    <ul className="divide-y divide-slate-200/60">
                      {project.contributors.map((person) => (
                        <li key={person.employeeId}>
                          {knownEmployees.has(person.employeeId) ? (
                            <button
                              type="button"
                              onClick={() => onEmployeeSelect(person.employeeId)}
                              aria-label={`Mitarbeiterdetails für ${person.name}`}
                              className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-left text-xs outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-[#6658d3]"
                            >
                              <span className="min-w-0 flex-1 break-words text-slate-700">{person.name}</span>
                              <span className="shrink-0 font-medium tabular-nums text-slate-800">{formatCockpitMinutes(person.minutes)}</span>
                              <ChevronRight className="size-3.5 shrink-0 text-slate-400" />
                            </button>
                          ) : (
                            <div className="flex min-h-11 items-center justify-between gap-2 px-2 py-2 text-xs text-slate-500">
                              <span>{person.name}</span><span className="shrink-0 tabular-nums">{formatCockpitMinutes(person.minutes)}</span>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              ))}
            </div>
            {remaining > 0 && (
              <button
                type="button"
                aria-expanded={showAll}
                aria-controls={listId}
                onClick={() => setShowAll((value) => !value)}
                className="mt-2 flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-sm bg-slate-50 px-3 py-2 text-xs font-medium text-[#6658d3] outline-none hover:bg-[#f3f0fc] focus-visible:ring-2 focus-visible:ring-[#6658d3]"
              >
                {showAll ? "Weniger anzeigen" : `${remaining} weitere anzeigen`}
                <ChevronDown className={`size-3.5 ${showAll ? "rotate-180" : ""}`} />
              </button>
            )}
            <p className="mt-3 text-[11px] text-slate-500">Projekt aufklappen, um Mitarbeiter und Zeiten zu sehen.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
