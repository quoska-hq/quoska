"use client";
import { useState } from "react";
import type { PlanningConfig, PlanningTemplate } from "@/types/planning";
import { Input } from "@/components/ui/input";
import { GermanTimeInput } from "@/components/german-time-input";
import { Button } from "@/components/ui/button";
import { planningTemplateSchema } from "@/types/planning-schemas";
import { PlanningTemplateSpecialRules } from "@/components/planning/planning-template-special-rules";

export function PlanningTemplateEditor({
  config,
  onChange,
}: {
  config: PlanningConfig;
  onChange: (templates: PlanningTemplate[]) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("Frühdienst"),
    [start, setStart] = useState("06:00"),
    [end, setEnd] = useState("12:00"),
    [location, setLocation] = useState(
      config.locations.length === 1 ? config.locations[0].id : "",
    ),
    [skill, setSkill] = useState(
      config.skills.length === 1 ? config.skills[0].id : "",
    );
  const [holidayMode, setHolidayMode] = useState<"skip" | "include">("skip");
  const [days, setDays] = useState([1, 2, 3, 4, 5, 6]),
    [count, setCount] = useState(1),
    [pause, setPause] = useState(0),
    [offset, setOffset] = useState(240),
    [nextDay, setNextDay] = useState(false);
  const [authorization, setAuthorization] =
      useState<PlanningTemplate["authorization"]>("none"),
    [reference, setReference] = useState(""),
    [from, setFrom] = useState(""),
    [until, setUntil] = useState("");
  const [error, setError] = useState("");
  const [otherBreaks, setOtherBreaks] = useState<PlanningTemplate["breaks"]>(
    [],
  );
  function edit(t: PlanningTemplate) {
    setError("");
    setEditing(t.id);
    setName(t.name);
    setStart(t.start);
    setEnd(t.end);
    setLocation(t.locationId);
    setSkill(t.skillId);
    setDays(t.days);
    setCount(t.count);
    setPause(t.breaks[0]?.minutes ?? 0);
    setOtherBreaks(t.breaks.slice(1));
    setOffset(t.breaks[0]?.offsetMinutes ?? 240);
    setNextDay(t.nextDay);
    setAuthorization(t.authorization);
    setReference(t.authorizationReference);
    setFrom(t.authorizationFrom ?? "");
    setUntil(t.authorizationUntil ?? "");
    setHolidayMode(t.holidayMode);
  }
  return (
    <section aria-label="Wiederkehrende Schichten" className="space-y-3">
      <h3 className="font-semibold">Welche Schichten braucht ihr?</h3>
      <p className="text-sm text-muted-foreground">
        Beispiel: Frühdienst, Verkauf, 06:00–12:00, zwei Personen. Du legst die
        Zeiten einmal fest; Quoska verteilt die Dienste später auf euer Team.
      </p>
      {config.templates.map((t) => (
        <div key={t.id} className="rounded-lg bg-[#f8f6ef] p-3 text-sm">
          <label className="mr-3">
            <input
              type="checkbox"
              checked={t.active}
              onChange={(e) =>
                onChange(
                  config.templates.map((v) =>
                    v.id === t.id ? { ...v, active: e.target.checked } : v,
                  ),
                )
              }
            />{" "}
            Aktiv
          </label>
          {t.name} · {config.locations.find((l) => l.id === t.locationId)?.name}{" "}
          · {t.start}–{t.end} · {t.count} Personen
          <Button variant="ghost" onClick={() => edit(t)}>
            Bearbeiten
          </Button>
        </div>
      ))}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          Bezeichnung
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
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
          Beginn
          <GermanTimeInput value={start} onChange={setStart} />
        </label>
        <label className="text-sm">
          Ende
          <GermanTimeInput value={end} onChange={setEnd} />
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
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Pause in Minuten (0 = keine)
          <Input
            type="number"
            min={0}
            max={120}
            value={pause}
            onChange={(e) => setPause(Number(e.target.value))}
          />
        </label>
        {pause > 0 && (
          <label className="text-sm">
            Pause nach wie vielen Minuten?
            <Input
              type="number"
              min={1}
              max={600}
              value={offset}
              onChange={(e) => setOffset(Number(e.target.value))}
            />
          </label>
        )}
      </div>
      {otherBreaks.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Weitere hinterlegte Pausen:{" "}
          {otherBreaks
            .map(
              (pause) =>
                `${pause.minutes} Minuten nach ${pause.offsetMinutes} Minuten`,
            )
            .join(" · ")}
          .
        </p>
      )}
      <PlanningTemplateSpecialRules
        value={{
          nextDay,
          authorization,
          authorizationReference: reference,
          authorizationFrom: from || null,
          authorizationUntil: until || null,
          holidayMode,
        }}
        onChange={(patch) => {
          if (patch.nextDay !== undefined) setNextDay(patch.nextDay);
          if (patch.authorization !== undefined)
            setAuthorization(patch.authorization);
          if (patch.authorizationReference !== undefined)
            setReference(patch.authorizationReference);
          if (patch.authorizationFrom !== undefined)
            setFrom(patch.authorizationFrom ?? "");
          if (patch.authorizationUntil !== undefined)
            setUntil(patch.authorizationUntil ?? "");
          if (patch.holidayMode !== undefined)
            setHolidayMode(patch.holidayMode);
        }}
      />
      {(days.includes(0) || holidayMode === "include") && (
        <p className="text-sm text-amber-900">
          Bitte die Berechtigung für Sonn- und Feiertage im Bereich oben prüfen.
          Ohne gültige Berechtigung bleibt die Freigabe gesperrt.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      )}
      <Button
        variant="outline"
        disabled={!name || !location || !skill || !days.length}
        onClick={() => {
          const template: PlanningTemplate = {
            id: editing ?? crypto.randomUUID(),
            active: editing
              ? config.templates.find((t) => t.id === editing)!.active
              : true,
            name,
            locationId: location,
            skillId: skill,
            days,
            start,
            end,
            nextDay,
            count,
            breaks: [
              ...(pause ? [{ offsetMinutes: offset, minutes: pause }] : []),
              ...otherBreaks,
            ],
            authorization,
            authorizationReference: reference,
            authorizationFrom: from || null,
            authorizationUntil: until || null,
            holidayMode,
          };
          if (!planningTemplateSchema.safeParse(template).success) {
            setError(
              "Bitte Beginn, Ende und Personenzahl prüfen. Eine Pause muss mindestens 15 Minuten dauern.",
            );
            return;
          }
          onChange([
            ...config.templates.filter((t) => t.id !== editing),
            template,
          ]);
          setEditing(null);
          setName("");
          setOtherBreaks([]);
          setError("");
        }}
      >
        {editing ? "Schicht speichern" : "Schicht hinzufügen"}
      </Button>
    </section>
  );
}
