"use client";
import type { PlanningProfile } from "@/types/planning";
import { GermanTimeInput } from "@/components/german-time-input";
import { useState } from "react";
import { GermanDateInput } from "@/components/german-date-input";
import { Button } from "@/components/ui/button";
import {
  planningLocal,
  planningWallTime,
} from "@/config/client/planning-calendar";
import { formatDateFullDE, formatTimeLocal } from "@/config/client/date-utils";
export function PlanningExternalWork({
  profile,
  onChange,
}: {
  profile: PlanningProfile;
  onChange: (patch: Partial<PlanningProfile>) => void;
}) {
  const [date, setDate] = useState(""),
    [start, setStart] = useState("08:00"),
    [end, setEnd] = useState("12:00"),
    [error, setError] = useState("");
  return (
    <div className="space-y-2">
      <h4 className="font-medium">Weitere Beschäftigungen</h4>
      {profile.externalWork.map((w, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <span>
            {formatDateFullDE(planningLocal(w.start).date)}{" "}
            {formatTimeLocal(w.start)}–{formatTimeLocal(w.end)}
          </span>
          <Button
            variant="ghost"
            onClick={() =>
              onChange({
                externalWork: profile.externalWork.filter((_, n) => n !== i),
                externalWorkConfirmed: false,
              })
            }
          >
            Entfernen
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <GermanDateInput
          aria-label="Datum weitere Beschäftigung"
          value={date}
          onChange={setDate}
        />
        <GermanTimeInput
          className="w-24"
          aria-label="Beginn weitere Beschäftigung"
          value={start}
          onChange={setStart}
        />
        <GermanTimeInput
          className="w-24"
          aria-label="Ende weitere Beschäftigung"
          value={end}
          onChange={setEnd}
        />
        <Button
          variant="outline"
          disabled={!date}
          onClick={() => {
            try {
              if (start >= end)
                throw new Error(
                  "Bitte einen Zeitraum innerhalb eines Tages wählen.",
                );
              onChange({
                externalWork: [
                  ...profile.externalWork,
                  {
                    start: planningWallTime(date, start),
                    end: planningWallTime(date, end),
                    breaks: [],
                  },
                ],
                externalWorkConfirmed: false,
              });
              setError("");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Ungültige Zeit.");
            }
          }}
        >
          Hinzufügen
        </Button>
      </div>
      {error && <p role="alert">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Bitte Arbeitsblöcke zwischen Pausen einzeln eintragen. Nach Änderungen
        die Prüfung erneut bestätigen.
      </p>
    </div>
  );
}
