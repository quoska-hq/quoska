"use client";
import { useState } from "react";
import type { PlanningProfile } from "@/types/planning";
import { formatDateFullDE } from "@/config/client/date-utils";
import { GermanDateInput } from "@/components/german-date-input";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export function PlanningProfileDates({
  profile,
  onChange,
}: {
  profile: PlanningProfile;
  onChange: (patch: Partial<PlanningProfile>) => void;
}) {
  const [date, setDate] = useState("");
  const [start, setStart] = useState("06:00");
  const [end, setEnd] = useState("18:00");
  const [off, setOff] = useState(false);
  return (
    <details className="rounded-lg border p-3">
      <summary className="cursor-pointer font-medium">
        Gültigkeit & Verfügbarkeit an einzelnen Tagen
      </summary>
      <div className="my-3 grid gap-3 sm:grid-cols-2">
        <label>
          Einsatzberechtigung ab
          <GermanDateInput
            value={profile.validFrom ?? ""}
            onChange={(v) => onChange({ validFrom: v || null })}
          />
        </label>
        <label>
          Einsatzberechtigung bis
          <GermanDateInput
            value={profile.validUntil ?? ""}
            onChange={(v) => onChange({ validUntil: v || null })}
          />
        </label>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Die Berechtigung gilt für die hinterlegten Filialen und Kompetenzen.
        Eine Tagesausnahme ersetzt die wöchentliche Verfügbarkeit an diesem
        Datum.
      </p>
      {profile.availabilityExceptions.map((e) => (
        <div
          key={e.date}
          className="my-2 flex items-center justify-between gap-2"
        >
          <span>
            {formatDateFullDE(e.date)} ·{" "}
            {e.windows.length
              ? e.windows.map((w) => `${w.start}–${w.end}`).join(", ")
              : "Nicht verfügbar"}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onChange({
                availabilityExceptions: profile.availabilityExceptions.filter(
                  (v) => v.date !== e.date,
                ),
              })
            }
          >
            Entfernen
          </Button>
        </div>
      ))}
      <label>
        Datum
        <GermanDateInput value={date} onChange={setDate} />
      </label>
      <label className="my-2 flex gap-2">
        <input
          type="checkbox"
          checked={off}
          onChange={(e) => setOff(e.target.checked)}
        />
        Nicht verfügbar
      </label>
      {!off && (
        <div className="my-2 flex gap-2">
          <label>
            Von
            <Input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            Bis
            <Input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
      )}
      <Button
        variant="outline"
        disabled={!date || (!off && start >= end)}
        onClick={() => {
          onChange({
            availabilityExceptions: [
              ...profile.availabilityExceptions.filter((e) => e.date !== date),
              { date, windows: off ? [] : [{ start, end }] },
            ].sort((a, b) => a.date.localeCompare(b.date)),
          });
          setDate("");
        }}
      >
        Tagesausnahme vormerken
      </Button>
    </details>
  );
}
