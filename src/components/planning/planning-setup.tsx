"use client";
import { formatDateFullDE, parseGermanDate } from "@/config/client/date-utils";
import { useState } from "react";
import type { PlanningConfig } from "@/types/planning";
import type { PlanningBoardData } from "@/types/planning-client";
import { GermanDateInput } from "@/components/german-date-input";
import { planningAddMonths } from "@/config/client/planning-calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BUNDESLAENDER_ENUM } from "@/types/leave";
import { BUNDESLAND_LABELS } from "@/types/tenant";
import type { Bundesland } from "@/types/tenant";
import { PlanningProfileEditor } from "@/components/planning/planning-profile-editor";
import { PlanningTemplateEditor } from "@/components/planning/planning-template-editor";
import { PlanningDemandEditor } from "@/components/planning/planning-demand-editor";

export function PlanningSetup({
  data,
  busy,
  onSave,
}: {
  data: PlanningBoardData;
  busy: boolean;
  onSave: (config: PlanningConfig, version: number) => void;
}) {
  const [config, setConfig] = useState(() =>
    structuredClone(data.state.config),
  );
  const [version] = useState(data.version),
    [location, setLocation] = useState(""),
    [state, setState] = useState<Bundesland>("berlin"),
    [skill, setSkill] = useState("");
  const update = (patch: Partial<PlanningConfig>) =>
    setConfig({ ...config, ...patch });
  return (
    <section className="space-y-6 rounded-2xl border bg-white p-5">
      <div>
        <h2 className="text-xl font-semibold">Dienstplanung einrichten</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Verwendet eure vorhandenen Mitarbeitenden. Sollstunden, Urlaub und
          Krankmeldungen kommen aus Quoska. Verfügbarkeit wird separat
          vereinbart.
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
        />
        Dienstplanung für diesen Betrieb aktivieren
      </label>
      <label className="block text-sm">
        Erster Planungsmonat (erster Tag des Monats)
        <GermanDateInput
          value={config.firstMonth ?? ""}
          min={data.context.today.slice(0, 7) + "-01"}
          max={planningAddMonths(data.context.today.slice(0, 7) + "-01", 1)}
          onChange={(date) => update({ firstMonth: date })}
        />
      </label>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h3 className="font-semibold">1. Filialen & Feiertage</h3>
          {config.locations.map((l) => (
            <div key={l.id} className="rounded-xl border p-3 text-sm">
              <strong>{l.name}</strong>
              <p>
                {
                  BUNDESLAND_LABELS[
                    l.bundesland as keyof typeof BUNDESLAND_LABELS
                  ]
                }
              </p>
              <label className="mt-2 flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={l.localHolidaysConfirmed}
                  onChange={(e) =>
                    update({
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
                  update({
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
              update({
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
          <h3 className="font-semibold">2. Kompetenzen</h3>
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
              update({
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
          <label className="block text-sm">
            Zeit für einen Filialwechsel in Minuten
            <Input
              type="number"
              min={0}
              max={240}
              value={config.travelMinutes}
              onChange={(e) =>
                update({ travelMinutes: Number(e.target.value) })
              }
            />
          </label>
        </section>
      </div>
      <section>
        <h3 className="mb-3 font-semibold">
          3. Mitarbeitende & Arbeitszeitregeln
        </h3>
        <div className="space-y-3">
          {data.context.employees.map((employee) => (
            <PlanningProfileEditor
              key={employee.id}
              employee={employee}
              config={config}
              today={data.context.today}
              onChange={(profile) =>
                update({
                  profiles: [
                    ...config.profiles.filter(
                      (p) => p.employeeId !== profile.employeeId,
                    ),
                    profile,
                  ],
                })
              }
            />
          ))}
        </div>
      </section>
      <PlanningTemplateEditor
        config={config}
        onChange={(templates) => update({ templates })}
      />
      <PlanningDemandEditor
        config={config}
        onChange={(demands) => update({ demands })}
      />
      <p className="text-sm text-muted-foreground">
        Die Einrichtung bestätigt keine Tarifausnahmen oder besonderen
        Schutzvorschriften. Für Minderjährige, Mutterschutz und sonstige
        Sonderprofile bleibt die Freigabe gesperrt.
      </p>
      {version !== data.version && (
        <p className="text-sm text-amber-900">
          Die Daten haben sich während der Einrichtung geändert. Bitte neu laden
          und die Änderungen erneut prüfen.
        </p>
      )}
      <Button
        disabled={busy || version !== data.version}
        onClick={() => onSave(config, version)}
      >
        Einrichtung speichern
      </Button>
    </section>
  );
}
