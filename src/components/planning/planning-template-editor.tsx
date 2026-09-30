"use client";
import { useState } from "react";
import type { PlanningConfig, PlanningTemplate } from "@/types/planning";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GermanDateInput } from "@/components/german-date-input";

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
    [location, setLocation] = useState(""),
    [skill, setSkill] = useState("");
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
  function edit(t: PlanningTemplate) {
    setEditing(t.id);
    setName(t.name);
    setStart(t.start);
    setEnd(t.end);
    setLocation(t.locationId);
    setSkill(t.skillId);
    setDays(t.days);
    setCount(t.count);
    setPause(t.breaks[0]?.minutes ?? 0);
    setOffset(t.breaks[0]?.offsetMinutes ?? 240);
    setNextDay(t.nextDay);
    setAuthorization(t.authorization);
    setReference(t.authorizationReference);
    setFrom(t.authorizationFrom ?? "");
    setUntil(t.authorizationUntil ?? "");
    setHolidayMode(t.holidayMode);
  }
  return (
    <section className="space-y-3">
      <h3 className="font-semibold">4. Wiederkehrende Schichten</h3>
      <p className="text-sm text-muted-foreground">
        Eine Vorlage beschreibt einen Arbeitsplatz und dessen Kompetenz. Pausen
        können pro Schicht angepasst werden. Für durchgängige Besetzung sind
        überlappende Schichten nötig.
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
          Kompetenz
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
          <Input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Ende
          <Input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
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
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={nextDay}
            onChange={(e) => setNextDay(e.target.checked)}
          />
          Ende am Folgetag
        </label>
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
        <label className="text-sm">
          Pausenbeginn nach Arbeitsbeginn in Minuten
          <Input
            type="number"
            min={1}
            max={600}
            value={offset}
            onChange={(e) => setOffset(Number(e.target.value))}
          />
        </label>
      </div>
      <details>
        <summary className="cursor-pointer text-sm font-medium">
          Berechtigung für Sonn- und Feiertage
        </summary>
        <div className="mt-3 space-y-3">
          <select
            aria-label="Berechtigung Sonn- und Feiertage"
            className="w-full rounded-md border p-2"
            value={authorization}
            onChange={(e) =>
              setAuthorization(
                e.target.value as PlanningTemplate["authorization"],
              )
            }
          >
            <option value="none">
              Keine Berechtigung – Beschäftigung gesperrt
            </option>
            <option value="bakery_production">
              Bäckerei: Herstellung/Auslieferung, höchstens drei Stunden
            </option>
            <option value="catering">
              Gaststättenbetrieb: Voraussetzungen des § 10 Abs. 1 Nr. 4 geprüft
            </option>
            <option value="documented_permission">
              Gesonderte behördliche / gesetzliche Berechtigung geprüft
            </option>
          </select>
          <Input
            aria-label="Dokumentierte Rechtsgrundlage"
            placeholder="Dokumentierte Rechtsgrundlage, Tätigkeit und Voraussetzungen"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Gültig ab
              <GermanDateInput value={from} onChange={setFrom} />
            </label>
            <label className="text-sm">
              Gültig bis
              <GermanDateInput value={until} onChange={setUntil} />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Ladenöffnungszeiten allein erlauben keine Beschäftigung. Verkauf ist
            von der Bäckerei-Ausnahme für Herstellung und Auslieferung nicht
            erfasst.
          </p>
        </div>
      </details>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={holidayMode === "include"}
          onChange={(e) =>
            setHolidayMode(e.target.checked ? "include" : "skip")
          }
        />
        Auch an gesetzlichen Feiertagen einplanen
      </label>
      <Button
        variant="outline"
        disabled={!name || !location || !skill || !days.length}
        onClick={() =>
          onChange([
            ...config.templates.filter((t) => t.id !== editing),
            {
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
              breaks: pause ? [{ offsetMinutes: offset, minutes: pause }] : [],
              authorization,
              authorizationReference: reference,
              authorizationFrom: from || null,
              authorizationUntil: until || null,
              holidayMode,
            },
          ])
        }
      >
        {editing ? "Schichtvorlage speichern" : "Schichtvorlage hinzufügen"}
      </Button>
    </section>
  );
}
