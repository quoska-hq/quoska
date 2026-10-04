"use client";
import { useState } from "react";
import { formatDateFullDE, parseGermanDate } from "@/config/client/date-utils";
import { planningAddMonths } from "@/config/client/planning-calendar";
import type { PlanningConfig } from "@/types/planning";
import { BUNDESLAENDER_ENUM } from "@/types/leave";
import { BUNDESLAND_LABELS, type Bundesland } from "@/types/tenant";
import { GermanDateInput } from "@/components/german-date-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PlanningSetupLocations({
  config,
  today,
  onChange,
}: {
  config: PlanningConfig;
  today: string;
  onChange: (patch: Partial<PlanningConfig>) => void;
}) {
  const [location, setLocation] = useState(""),
    [state, setState] = useState<Bundesland>("berlin"),
    [skill, setSkill] = useState("");
  return (
    <div className="space-y-6">
      <label className="block text-sm">
        Erster Planungsmonat (erster Tag des Monats)
        <GermanDateInput
          value={config.firstMonth ?? ""}
          min={today.slice(0, 7) + "-01"}
          max={planningAddMonths(today.slice(0, 7) + "-01", 1)}
          onChange={(date) => onChange({ firstMonth: date })}
        />
      </label>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h3 className="font-semibold">Filialen & Feiertage</h3>
          {config.locations.map((l) => (
            <div key={l.id} className="rounded-xl border p-3 text-sm">
              <strong>{l.name}</strong>
              <p>{BUNDESLAND_LABELS[l.bundesland]}</p>
              <label className="mt-2 flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={l.localHolidaysConfirmed}
                  onChange={(e) =>
                    onChange({
                      locations: config.locations.map((v) =>
                        v.id === l.id
                          ? { ...v, localHolidaysConfirmed: e.target.checked }
                          : v,
                      ),
                    })
                  }
                />
                Örtliche Feiertage geprüft; ergänzende Termine unten eintragen
              </label>
              <Input
                className="mt-2"
                aria-label={`Örtliche Feiertage ${l.name}`}
                placeholder="TT.MM.JJJJ, TT.MM.JJJJ"
                defaultValue={l.additionalHolidays
                  .map(formatDateFullDE)
                  .join(", ")}
                onBlur={(e) => {
                  const dates = e.target.value
                    .split(",")
                    .map((d) => d.trim())
                    .filter(Boolean)
                    .map((d) => parseGermanDate(d) ?? d);
                  onChange({
                    locations: config.locations.map((v) =>
                      v.id === l.id ? { ...v, additionalHolidays: dates } : v,
                    ),
                  });
                }}
              />
            </div>
          ))}
          <Input
            aria-label="Neue Filiale"
            placeholder="Name der Filiale"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <select
            aria-label="Bundesland der Filiale"
            className="w-full rounded-md border p-2"
            value={state}
            onChange={(e) => setState(e.target.value as Bundesland)}
          >
            {BUNDESLAENDER_ENUM.map((b) => (
              <option key={b} value={b}>
                {BUNDESLAND_LABELS[b]}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            disabled={!location.trim()}
            onClick={() => {
              onChange({
                locations: [
                  ...config.locations,
                  {
                    id: crypto.randomUUID(),
                    name: location.trim(),
                    bundesland: state,
                    additionalHolidays: [],
                    localHolidaysConfirmed: false,
                  },
                ],
              });
              setLocation("");
            }}
          >
            Filiale hinzufügen
          </Button>
        </section>
        <section className="space-y-3">
          <h3 className="font-semibold">Kompetenzen</h3>
          <p className="text-sm text-muted-foreground">
            Lege fest, welche Aufgaben besetzt sein müssen, zum Beispiel Verkauf
            oder Backstube.
          </p>
          <div className="flex flex-wrap gap-2">
            {config.skills.map((s) => (
              <span
                key={s.id}
                className="rounded-full bg-[#f1eefb] px-3 py-1 text-sm text-[#6658d3]"
              >
                {s.name}
              </span>
            ))}
          </div>
          <Input
            aria-label="Neue Kompetenz"
            placeholder="z. B. Verkauf oder Backstube"
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
          />
          <Button
            variant="outline"
            disabled={!skill.trim()}
            onClick={() => {
              onChange({
                skills: [
                  ...config.skills,
                  { id: crypto.randomUUID(), name: skill.trim() },
                ],
              });
              setSkill("");
            }}
          >
            Kompetenz hinzufügen
          </Button>
        </section>
      </div>
      <details className="rounded-xl border p-4 text-sm">
        <summary className="cursor-pointer font-medium">
          Weitere Einstellungen
        </summary>
        <label className="mt-4 block">
          Zeit für einen Filialwechsel in Minuten
          <Input
            className="mt-2 max-w-40"
            type="number"
            min={0}
            max={240}
            value={config.travelMinutes}
            onChange={(e) =>
              onChange({ travelMinutes: Number(e.target.value) })
            }
          />
        </label>
      </details>
    </div>
  );
}
