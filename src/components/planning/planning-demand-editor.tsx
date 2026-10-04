"use client";
import { useState } from "react";
import type { PlanningConfig, PlanningDemand } from "@/types/planning";
import { Input } from "@/components/ui/input";
import { GermanTimeInput } from "@/components/german-time-input";
import { Button } from "@/components/ui/button";
export function PlanningDemandEditor({
  config,
  onChange,
}: {
  config: PlanningConfig;
  onChange: (demands: PlanningDemand[]) => void;
}) {
  const [location, setLocation] = useState(""),
    [skill, setSkill] = useState(""),
    [start, setStart] = useState("06:00"),
    [end, setEnd] = useState("12:00"),
    [count, setCount] = useState(1),
    [days, setDays] = useState([1, 2, 3, 4, 5, 6]);
  const [holidayMode, setHolidayMode] = useState<"skip" | "include">("skip");
  return (
    <section className="space-y-3">
      <h3 className="font-semibold">Benötigte Besetzung</h3>
      <p className="text-sm text-muted-foreground">
        Wie viele Personen für eine Aufgabe müssen gleichzeitig arbeiten? Dieser
        Bedarf wird auch während der Pausen geprüft.
      </p>
      {config.demands.map((d) => (
        <div
          className="flex items-center justify-between rounded-lg bg-[#f8f6ef] p-3 text-sm"
          key={d.id}
        >
          <span>
            {config.locations.find((l) => l.id === d.locationId)?.name} ·{" "}
            {config.skills.find((s) => s.id === d.skillId)?.name} · {d.start}–
            {d.end} · {d.count} Personen
          </span>
          <Button
            variant="ghost"
            onClick={() =>
              onChange(config.demands.filter((v) => v.id !== d.id))
            }
          >
            Entfernen
          </Button>
        </div>
      ))}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          Filiale
          <select
            className="block w-full rounded-md border p-2"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="">Bitte wählen</option>
            {config.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Aufgabe
          <select
            className="block w-full rounded-md border p-2"
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
          >
            <option value="">Bitte wählen</option>
            {config.skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Personen
          <Input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </label>
        <label className="text-sm">
          Beginn
          <GermanTimeInput value={start} onChange={setStart} />
        </label>
        <label className="text-sm">
          Ende
          <GermanTimeInput value={end} onChange={setEnd} />
        </label>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        {["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"].map((d, i) => (
          <label key={d} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={days.includes(i)}
              onChange={(e) =>
                setDays(
                  e.target.checked ? [...days, i] : days.filter((v) => v !== i),
                )
              }
            />
            {d}
          </label>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={holidayMode === "include"}
          onChange={(e) =>
            setHolidayMode(e.target.checked ? "include" : "skip")
          }
        />
        Bedarf auch an gesetzlichen Feiertagen
      </label>
      <Button
        variant="outline"
        disabled={!location || !skill || start >= end || !days.length}
        onClick={() =>
          onChange([
            ...config.demands,
            {
              id: crypto.randomUUID(),
              locationId: location,
              skillId: skill,
              days,
              start,
              end,
              count,
              holidayMode,
            },
          ])
        }
      >
        Bedarf hinzufügen
      </Button>
    </section>
  );
}
