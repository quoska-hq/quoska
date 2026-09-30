"use client";
import { useState } from "react";
import type { PlanningEmployee, PlanningProfile } from "@/types/planning";
import { formatDateFullDE } from "@/config/client/date-utils";
import { planningAddDays } from "@/config/client/planning-calendar";
import { totalScheduleMinutes } from "@/types/work-schedule";
import { GermanDateInput } from "@/components/german-date-input";
import { WorkScheduleEditor } from "@/components/work-schedule-editor";
import { Button } from "@/components/ui/button";
export function PlanningContracts({
  employee,
  profile,
  today,
  onChange,
}: {
  employee: PlanningEmployee;
  profile: PlanningProfile;
  today: string;
  onChange: (patch: Partial<PlanningProfile>) => void;
}) {
  const [from, setFrom] = useState("");
  const [schedule, setSchedule] = useState(employee.workSchedule);
  const [valid, setValid] = useState(true);
  return (
    <details className="rounded-lg border p-3">
      <summary className="cursor-pointer font-medium">
        Vertrags-Soll ab einem Stichtag
      </summary>
      <p className="my-3 text-xs text-muted-foreground">
        Die Solländerung gilt gemeinsam für Zeitkonto, Zeiterfassung und
        Abwesenheitsbewertung. Vergangene Vertragsstände bleiben erhalten.
        Einsatzzeiten und Verfügbarkeit ändern sich dadurch nicht.
      </p>
      {profile.contractChanges.map((c) => (
        <div
          key={c.from}
          className="my-2 flex items-center justify-between gap-3"
        >
          <span>
            Ab {formatDateFullDE(c.from)} ·{" "}
            {totalScheduleMinutes(c.schedule) / 60} Sollstunden/Woche
          </span>
          {c.from > today && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                onChange({
                  contractChanges: profile.contractChanges.filter(
                    (v) => v.from !== c.from,
                  ),
                })
              }
            >
              Entfernen
            </Button>
          )}
        </div>
      ))}
      <label className="my-3 block">
        Gültig ab
        <GermanDateInput
          value={from}
          min={planningAddDays(today, 1)}
          onChange={setFrom}
        />
      </label>
      <WorkScheduleEditor
        value={schedule}
        onChange={setSchedule}
        onValidityChange={setValid}
      />
      <Button
        className="mt-3"
        variant="outline"
        disabled={!from || from <= today || !valid}
        onClick={() => {
          onChange({
            contractChanges: [
              ...profile.contractChanges.filter((c) => c.from !== from),
              { from, schedule: structuredClone(schedule) },
            ].sort((a, b) => a.from.localeCompare(b.from)),
          });
          setFrom("");
        }}
      >
        Solländerung vormerken
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">
        Wird mit der Einrichtung gespeichert.
      </p>
    </details>
  );
}
