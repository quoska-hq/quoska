"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GermanDateInput } from "@/components/german-date-input";
import { formatDateFullDE } from "@/config/client/date-utils";
import { useProjectAssignments } from "@/hooks/use-project-assignments";
import type { ApiResponse } from "@/types/api";
import type { Employee } from "@/types/database";
import { MAX_PROJECT_WEEKLY_MINUTES, projectTargetSchema, type ProjectTarget } from "@/types/project-target";
import { formatWorkMinutes } from "@/types/work-schedule";

interface Props {
  projectId: string;
  projectName: string;
  projectActive: boolean;
  activeEmployees: Employee[];
  formerEmployees: Employee[];
  today: string;
  onOpenAssignments: () => void;
}

interface Draft {
  effectiveFrom: string;
  hours: string;
  minutes: string;
  mode: "new" | "edit" | "end";
}

const MINUTES_PER_HOUR = 60;
const MAX_HOURS = MAX_PROJECT_WEEKLY_MINUTES / MINUTES_PER_HOUR;

function makeDraft(effectiveFrom: string, weeklyMinutes = 0, mode: Draft["mode"] = "new"): Draft {
  return {
    effectiveFrom,
    hours: String(Math.floor(weeklyMinutes / MINUTES_PER_HOUR)),
    minutes: String(weeklyMinutes % MINUTES_PER_HOUR),
    mode,
  };
}

function employeeName(employee: Employee) {
  return `${employee.first_name} ${employee.last_name}`;
}

export function ProjectTargetsPanel({ projectId, projectName, projectActive, activeEmployees, formerEmployees, today, onOpenAssignments }: Props) {
  const queryClient = useQueryClient();
  const fieldId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [draftState, setDraft] = useState<{ employeeId: string; fields: Draft } | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const queryKey = ["projectTargets", projectId];
  const url = `/api/v1/projects/${projectId}/targets`;

  const assignments = useProjectAssignments(projectId, projectActive);
  const targets = useQuery<ProjectTarget[]>({
    queryKey,
    queryFn: async ({ signal }) => {
      const response = await fetch(url, { signal });
      const json: ApiResponse<ProjectTarget[]> | null = await response.json().catch(() => null);
      if (!response.ok || !json?.data) {
        throw new Error(json?.error ?? "Wochenziele konnten nicht geladen werden.");
      }
      return json.data;
    },
  });

  const saveTarget = useMutation({
    mutationFn: async (target: ProjectTarget) => {
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target),
      });
      const json: ApiResponse<ProjectTarget> | null = await response.json().catch(() => null);
      if (!response.ok || !json?.data) {
        throw new Error(json?.error ?? "Wochenziel konnte nicht gespeichert werden.");
      }
      return json.data;
    },
    onSuccess: async (saved) => {
      await queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData<ProjectTarget[]>(queryKey, (previous = []) => [
        ...previous.filter((target) => target.employeeId !== saved.employeeId || target.effectiveFrom !== saved.effectiveFrom),
        saved,
      ]);
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["projectReport"] });
      queryClient.invalidateQueries({ queryKey: ["projectBalances"] });
      setEmployeeId(saved.employeeId);
      setDraft(null);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["projectAssignments", projectId] });
    },
  });

  const assignedIds = new Set(assignments.data ?? []);
  const eligible = activeEmployees.filter((employee) => assignedIds.has(employee.id));
  const names = new Map([...activeEmployees, ...formerEmployees].map((employee) => [employee.id, employeeName(employee)]));
  const history = [...(targets.data ?? [])].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  const currentByEmployee = new Map<string, ProjectTarget>();
  const upcomingEmployees = new Set<string>();
  for (const entry of history) {
    if (entry.effectiveFrom > today) {
      if (entry.weeklyMinutes > 0) upcomingEmployees.add(entry.employeeId);
    } else if (!currentByEmployee.has(entry.employeeId)) {
      currentByEmployee.set(entry.employeeId, entry);
    }
  }
  const selected = eligible.find((employee) => employee.id === employeeId)
    ?? eligible.find((employee) => currentByEmployee.get(employee.id)?.weeklyMinutes || upcomingEmployees.has(employee.id))
    ?? eligible[0];
  const selectedHistory = history.filter((entry) => entry.employeeId === selected?.id);
  const current = selected ? currentByEmployee.get(selected.id) : undefined;
  const nextTarget = selectedHistory.filter((entry) => entry.effectiveFrom > today && entry.weeklyMinutes > 0).at(-1);
  const draft = draftState && draftState.employeeId === selected?.id ? draftState.fields : makeDraft(today, current?.weeklyMinutes);
  const ending = draft.mode === "end";
  const editing = draft.mode === "edit";
  const hours = Number(draft.hours);
  const minutes = Number(draft.minutes);
  const weeklyMinutes = ending ? 0 : hours * MINUTES_PER_HOUR + minutes;
  const validTimeInput = Number.isInteger(hours) && hours >= 0
    && Number.isInteger(minutes) && minutes >= 0 && minutes < MINUTES_PER_HOUR;
  const validAmount = ending || (validTimeInput && weeklyMinutes > 0 && weeklyMinutes <= MAX_PROJECT_WEEKLY_MINUTES);
  const canEdit = projectActive && !assignments.error;

  function updateDraft(fields: Draft) {
    if (!selected) return;
    saveTarget.reset();
    setEmployeeId(selected.id);
    setDraft({ employeeId: selected.id, fields });
  }

  function editVersion(version: ProjectTarget) {
    saveTarget.reset();
    setEmployeeId(version.employeeId);
    setDraft({ employeeId: version.employeeId, fields: makeDraft(version.effectiveFrom, version.weeklyMinutes, "edit") });
    formRef.current?.focus();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canEdit || !selected || !validAmount || saveTarget.isPending) return;
    const parsed = projectTargetSchema.safeParse({ employeeId: selected.id, effectiveFrom: draft.effectiveFrom, weeklyMinutes });
    if (parsed.success) saveTarget.mutate(parsed.data);
  }

  return (
    <section aria-label={`Wochenziele für ${projectName}`} className="mt-3 space-y-3 border-t pt-3">
      <h3 className="text-sm font-semibold">Wochenziele</h3>
      {targets.isLoading || (projectActive && assignments.isLoading) ? (
        <p role="status" className="text-sm text-muted-foreground">Wochenziele werden geladen…</p>
      ) : targets.error || (projectActive && assignments.error) ? (
        <div role="alert" className="space-y-2 text-sm text-destructive">
          <p>{(targets.error ?? assignments.error)?.message}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => {
            if (targets.error) targets.refetch();
            if (assignments.error) assignments.refetch();
          }}>Erneut laden</Button>
        </div>
      ) : !projectActive ? (
        <p className="text-sm text-muted-foreground">Das Projekt ist inaktiv. Der Zielverlauf bleibt verfügbar.</p>
      ) : !selected ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Weise dem Projekt zuerst Mitarbeiter zu, um ein Wochenziel festzulegen.</p>
          <Button type="button" variant="outline" size="sm" onClick={onOpenAssignments}>Zur Mitarbeiterzuordnung</Button>
        </div>
      ) : (
        <form ref={formRef} tabIndex={-1} className="space-y-3" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor={`${fieldId}-employee`}>Mitarbeiter</Label>
              <select id={`${fieldId}-employee`} value={selected.id} disabled={saveTarget.isPending} onChange={(event) => {
                setEmployeeId(event.target.value);
                setDraft(null);
                saveTarget.reset();
              }} className="h-9 w-full min-w-0 rounded-sm border border-input bg-white px-2 text-foreground focus-visible:ring-2 focus-visible:ring-brand/20 sm:text-sm">
                {eligible.map((employee) => <option key={employee.id} value={employee.id}>{employeeName(employee)}</option>)}
              </select>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor={`${fieldId}-date`}>Gültig ab</Label>
              <GermanDateInput id={`${fieldId}-date`} value={draft.effectiveFrom} required disabled={editing || saveTarget.isPending}
                calendarLabel="Kalender für Wochenziel öffnen" onChange={(effectiveFrom) => updateDraft({ ...draft, effectiveFrom })} />
            </div>
          </div>
          {current?.weeklyMinutes ? (
            <p className="text-sm text-muted-foreground">
              Aktuell {formatWorkMinutes(current.weeklyMinutes)}/Woche seit {formatDateFullDE(current.effectiveFrom)}.
            </p>
          ) : nextTarget && (
            <p className="text-sm text-muted-foreground">
              Geplant ab {formatDateFullDE(nextTarget.effectiveFrom)} · {formatWorkMinutes(nextTarget.weeklyMinutes)}/Woche
            </p>
          )}
          {ending ? (
            <p className="text-sm text-muted-foreground">Ab diesem Datum gilt kein Wochenziel bis zur nächsten geplanten Änderung.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor={`${fieldId}-hours`}>Stunden pro Woche</Label>
                <Input id={`${fieldId}-hours`} type="number" inputMode="numeric" min={0} max={MAX_HOURS} step={1}
                  value={draft.hours} disabled={saveTarget.isPending} onChange={(event) => updateDraft({ ...draft, hours: event.target.value })} />
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor={`${fieldId}-minutes`}>Minuten pro Woche</Label>
                <Input id={`${fieldId}-minutes`} type="number" inputMode="numeric" min={0} max={MINUTES_PER_HOUR - 1} step={1}
                  value={draft.minutes} disabled={saveTarget.isPending} onChange={(event) => updateDraft({ ...draft, minutes: event.target.value })} />
              </div>
            </div>
          )}
          {weeklyMinutes > MAX_PROJECT_WEEKLY_MINUTES ? (
            <p role="alert" className="text-sm text-destructive">Höchstens {MAX_HOURS} Stunden pro Woche.</p>
          ) : !ending && !validTimeInput && (
            <p role="alert" className="text-sm text-destructive">Bitte ganze Stunden und höchstens 59 Minuten eingeben.</p>
          )}
          {saveTarget.error && <p role="alert" className="text-sm text-destructive">{saveTarget.error.message}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" size="sm" disabled={!draft.effectiveFrom || !validAmount || saveTarget.isPending}>
              {saveTarget.isPending ? "Wird gespeichert…" : ending ? "Beendigung speichern" : "Ziel speichern"}
            </Button>
            {(ending || editing) ? (
              <Button type="button" variant="ghost" size="sm" disabled={saveTarget.isPending} onClick={() => {
                setDraft(null);
                saveTarget.reset();
              }}>Abbrechen</Button>
            ) : Boolean(current?.weeklyMinutes || nextTarget) && (
              <Button type="button" variant="ghost" size="sm" disabled={saveTarget.isPending}
                onClick={() => updateDraft(makeDraft(current?.weeklyMinutes ? today : nextTarget?.effectiveFrom ?? today, 0, "end"))}>
                Ziel beenden
              </Button>
            )}
            {saveTarget.data && <span role="status" className="text-sm text-muted-foreground">
              {saveTarget.data.weeklyMinutes === 0 ? "Beendigung gespeichert." : "Wochenziel gespeichert."}
            </span>}
          </div>
        </form>
      )}
      {history.length > 0 && (
        <details className="rounded-sm border p-2.5 text-sm">
          <summary className="cursor-pointer font-medium">Zielverlauf</summary>
          <ul className="mt-2 divide-y">
            {history.map((entry) => (
              <li key={`${entry.employeeId}-${entry.effectiveFrom}`} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0 wrap-break-word">
                  <div className="font-medium">{names.get(entry.employeeId) ?? "Mitarbeiter"}</div>
                  <div className="text-muted-foreground">
                    Ab {formatDateFullDE(entry.effectiveFrom)}{entry.effectiveFrom > today && " (geplant)"}
                    {" · "}{entry.weeklyMinutes > 0 ? `${formatWorkMinutes(entry.weeklyMinutes)}/Woche` : "Kein Wochenziel"}
                  </div>
                </div>
                {canEdit && eligible.some((employee) => employee.id === entry.employeeId) && (
                  <Button type="button" size="sm" variant="ghost" disabled={saveTarget.isPending || Boolean(targets.error)}
                    onClick={() => editVersion(entry)}>Bearbeiten</Button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
