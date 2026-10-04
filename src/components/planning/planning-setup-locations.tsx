"use client";
import { useState } from "react";
import { formatDateFullDE, parseGermanDate } from "@/config/client/date-utils";
import { planningAddMonths } from "@/config/client/planning-calendar";
import type { PlanningConfig } from "@/types/planning";
import { BUNDESLAENDER_ENUM } from "@/types/leave";
import { BUNDESLAND_LABELS, type Bundesland } from "@/types/tenant";
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
    [state, setState] = useState<Bundesland | "">(""),
    [skill, setSkill] = useState("");
  const currentMonth = today.slice(0, 7) + "-01";
  function addSkill(name: string) {
    if (
      config.skills.some(
        (value) => value.name.toLowerCase() === name.toLowerCase(),
      )
    )
      return;
    onChange({ skills: [...config.skills, { id: crypto.randomUUID(), name }] });
    setSkill("");
  }
  return (
    <div className="space-y-6">
      <label className="block text-sm">
        Wann soll euer erster Plan starten?
        <select
          className="mt-2 block w-full max-w-sm rounded-md border bg-white p-2"
          value={config.firstMonth ?? ""}
          onChange={(event) => onChange({ firstMonth: event.target.value })}
        >
          {[currentMonth, planningAddMonths(currentMonth, 1)].map(
            (month, index) => (
              <option key={month} value={month}>
                {index === 0 ? "Diesen Monat" : "Nächsten Monat"} · ab{" "}
                {formatDateFullDE(month)}
              </option>
            ),
          )}
          {config.firstMonth &&
            config.firstMonth !== currentMonth &&
            config.firstMonth !== planningAddMonths(currentMonth, 1) && (
              <option value={config.firstMonth}>
                Bisheriger Start · {formatDateFullDE(config.firstMonth)}
              </option>
            )}
        </select>
      </label>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h3 className="font-semibold">Filialen & Feiertage</h3>
          <p className="text-sm text-muted-foreground">
            Wo arbeitet ihr? Eine Filiale reicht zum Start. Das Bundesland
            bestimmt die gesetzlichen Feiertage.
          </p>
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
                Örtliche Feiertage geprüft – keine weiteren oder unten ergänzt
              </label>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs">
                  Zusätzliche örtliche Feiertage eintragen
                </summary>
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
              </details>
            </div>
          ))}
          <Input
            aria-label="Neue Filiale"
            placeholder="z. B. Marktstraße oder Hauptbetrieb"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <select
            aria-label="Bundesland der Filiale"
            className="w-full rounded-md border p-2"
            value={state}
            onChange={(e) => setState(e.target.value as Bundesland)}
          >
            <option value="">Bundesland wählen</option>
            {BUNDESLAENDER_ENUM.map((b) => (
              <option key={b} value={b}>
                {BUNDESLAND_LABELS[b]}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            disabled={!location.trim() || !state}
            onClick={() => {
              if (!state) return;
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
          <h3 className="font-semibold">Welche Aufgaben gibt es?</h3>
          <p className="text-sm text-muted-foreground">
            Kompetenzen beschreiben, was jemand übernehmen kann. Wähle ein
            Beispiel oder füge eine eigene Aufgabe hinzu.
          </p>
          <div className="flex flex-wrap gap-2">
            {["Verkauf", "Backstube", "Filialleitung"]
              .filter(
                (name) =>
                  !config.skills.some(
                    (value) => value.name.toLowerCase() === name.toLowerCase(),
                  ),
              )
              .map((name) => (
                <Button
                  key={name}
                  variant="outline"
                  size="sm"
                  onClick={() => addSkill(name)}
                >
                  + {name}
                </Button>
              ))}
          </div>
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
              addSkill(skill.trim());
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
