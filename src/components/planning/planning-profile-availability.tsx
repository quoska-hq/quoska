"use client";
import { useState } from "react";
import type { PlanningProfile } from "@/types/planning";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GermanTimeInput } from "@/components/german-time-input";
import { isGermanTime } from "@/config/client/date-utils";

const DAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
export function PlanningProfileAvailability({
  name,
  profile,
  onChange,
}: {
  name: string;
  profile: PlanningProfile;
  onChange: (patch: Partial<PlanningProfile>) => void;
}) {
  const [days, setDays] = useState([1, 2, 3, 4, 5]);
  const [start, setStart] = useState("06:00"),
    [end, setEnd] = useState("18:00");
  const [applied, setApplied] = useState(false);
  return (
    <fieldset className="space-y-3 rounded-xl bg-[#f8f6ef] p-4">
      <legend className="font-medium">Wann kann {name} arbeiten?</legend>
      <p className="text-xs text-muted-foreground">
        Trage die vereinbarten Einsatzzeiten ein. Sollstunden und Urlaub
        übernimmt Quoska.
      </p>
      {profile.availability.length > 0 && (
        <p className="text-sm">
          {profile.availability
            .map(
              (window) => `${DAYS[window.day]} ${window.start}–${window.end}`,
            )
            .join(" · ")}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {[1, 2, 3, 4, 5, 6, 0].map((day) => (
          <label key={day} className="flex items-center gap-2">
            <input
              type="checkbox"
              aria-label={`${name} ${DAYS[day]} übernehmen`}
              checked={days.includes(day)}
              onChange={(event) => {
                setDays(
                  event.target.checked
                    ? [...days, day]
                    : days.filter((value) => value !== day),
                );
                setApplied(false);
              }}
            />
            {DAYS[day]}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label>
          Von
          <GermanTimeInput
            className="mt-1 w-28"
            aria-label={`${name} verfügbar von`}
            value={start}
            onChange={(value) => {
              setStart(value);
              setApplied(false);
            }}
          />
        </label>
        <label>
          Bis
          <GermanTimeInput
            className="mt-1 w-28"
            aria-label={`${name} verfügbar bis`}
            value={end}
            onChange={(value) => {
              setEnd(value);
              setApplied(false);
            }}
          />
        </label>
        <Button
          variant="outline"
          disabled={
            !days.length ||
            !isGermanTime(start) ||
            !isGermanTime(end) ||
            start >= end
          }
          onClick={() => {
            onChange({
              availability: [
                ...profile.availability.filter(
                  (window) => !days.includes(window.day),
                ),
                ...days.map((day) => ({ day, start, end })),
              ].sort((a, b) => a.day - b.day),
            });
            setApplied(true);
          }}
        >
          Zeiten übernehmen
        </Button>
      </div>
      {applied && (
        <p role="status" className="text-xs text-[#5548ba]">
          Für die ausgewählten Tage übernommen. Andere Tage bleiben erhalten.
        </p>
      )}
      <details>
        <summary className="cursor-pointer font-medium">
          Einzelne Tage anpassen & Wünsche
        </summary>
        <div className="mt-3 space-y-3">
          {profile.availability.map((window, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <span className="w-6">{DAYS[window.day]}</span>
              {(["start", "end"] as const).map((field) => (
                <Input
                  key={field}
                  className="w-24"
                  value={window[field]}
                  aria-label={`${name} ${DAYS[window.day]} Zeitraum ${index + 1} ${field === "start" ? "ab" : "bis"}`}
                  onChange={(event) =>
                    onChange({
                      availability: profile.availability.map((value, at) =>
                        at === index
                          ? { ...value, [field]: event.target.value }
                          : value,
                      ),
                    })
                  }
                />
              ))}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profile.preferredDays.includes(window.day)}
                  onChange={(event) =>
                    onChange({
                      preferredDays: event.target.checked
                        ? [...new Set([...profile.preferredDays, window.day])]
                        : profile.preferredDays.filter(
                            (day) => day !== window.day,
                          ),
                    })
                  }
                />
                Bevorzugter Tag
              </label>
              <Button
                variant="ghost"
                onClick={() =>
                  onChange({
                    availability: profile.availability.filter(
                      (_, at) => at !== index,
                    ),
                  })
                }
              >
                Entfernen
              </Button>
            </div>
          ))}
        </div>
      </details>
    </fieldset>
  );
}
