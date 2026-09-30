"use client";
import type {
  PlanningConfig,
  PlanningEmployee,
  PlanningProfile,
} from "@/types/planning";
import { PlanningExternalWork } from "@/components/planning/planning-external-work";
import { Input } from "@/components/ui/input";
import { PlanningContracts } from "@/components/planning/planning-contracts";
import { PlanningProfileDates } from "@/components/planning/planning-profile-dates";

const DAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
export function PlanningProfileEditor({
  employee,
  config,
  today,
  onChange,
}: {
  employee: PlanningEmployee;
  config: PlanningConfig;
  today: string;
  onChange: (profile: PlanningProfile) => void;
}) {
  const profile = config.profiles.find((p) => p.employeeId === employee.id) ?? {
    employeeId: employee.id,
    locationIds: [],
    skillIds: [],
    eligibility: "unconfirmed" as const,
    availability: [],
    validFrom: null,
    validUntil: null,
    availabilityExceptions: [],
    contractChanges: employee.employmentSchedule?.changes ?? [],
    preferredDays: [],
    externalWork: [],
    externalWorkConfirmed: false,
    historyConfirmed: false,
    nightWorkConfirmed: false,
    maxWeeklyMinutes: 2880,
  };
  const update = (patch: Partial<PlanningProfile>) =>
    onChange({ ...profile, ...patch });
  const toggle = (values: string[], id: string) =>
    values.includes(id) ? values.filter((v) => v !== id) : [...values, id];
  return (
    <details className="rounded-xl border p-4">
      <summary className="cursor-pointer text-sm font-semibold">
        {employee.name} · {employee.targetHoursWeek} Sollstunden/Woche ·{" "}
        {profile.eligibility === "adult_standard"
          ? "Standardprofil"
          : "Angaben fehlen"}
      </summary>
      <div className="mt-4 space-y-4 text-sm">
        <PlanningContracts
          employee={employee}
          profile={profile}
          today={today}
          onChange={update}
        />
        <PlanningProfileDates profile={profile} onChange={update} />
        <label className="block">
          Regelprofil
          <select
            className="mt-1 block w-full rounded-md border p-2"
            value={profile.eligibility}
            onChange={(e) =>
              update({
                eligibility: e.target.value as PlanningProfile["eligibility"],
              })
            }
          >
            <option value="unconfirmed">Noch nicht geprüft</option>
            <option value="adult_standard">
              Volljährig; ein Schichtblock je Arbeitstag, ohne Sonderregeln
            </option>
            <option value="unsupported">
              Besonderer Schutz oder Sonderregelung – gesonderte Prüfung nötig
            </option>
          </select>
        </label>
        <fieldset>
          <legend className="mb-2 font-medium">Filialen</legend>
          <div className="flex flex-wrap gap-4">
            {config.locations.map((l) => (
              <label key={l.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profile.locationIds.includes(l.id)}
                  onChange={() =>
                    update({ locationIds: toggle(profile.locationIds, l.id) })
                  }
                />
                {l.name}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 font-medium">Kompetenzen</legend>
          <div className="flex flex-wrap gap-4">
            {config.skills.map((s) => (
              <label key={s.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={profile.skillIds.includes(s.id)}
                  onChange={() =>
                    update({ skillIds: toggle(profile.skillIds, s.id) })
                  }
                />
                {s.name}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 font-medium">
            Vereinbarte Verfügbarkeit (unabhängig von Sollstunden)
          </legend>
          <div className="space-y-2">
            {DAYS.map((day, index) => {
              const w = profile.availability.find((v) => v.day === index);
              return (
                <div key={day} className="flex flex-wrap items-center gap-2">
                  <label className="flex w-14 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(w)}
                      onChange={(e) =>
                        update({
                          availability: e.target.checked
                            ? [
                                ...profile.availability,
                                { day: index, start: "00:00", end: "24:00" },
                              ]
                            : profile.availability.filter(
                                (v) => v.day !== index,
                              ),
                        })
                      }
                    />
                    {day}
                  </label>
                  {w && (
                    <>
                      <Input
                        aria-label={`${employee.name} ${day} verfügbar ab`}
                        className="w-24"
                        value={w.start}
                        onChange={(e) =>
                          update({
                            availability: profile.availability.map((v) =>
                              v.day === index
                                ? { ...v, start: e.target.value }
                                : v,
                            ),
                          })
                        }
                      />
                      <span>bis</span>
                      <Input
                        aria-label={`${employee.name} ${day} verfügbar bis`}
                        className="w-24"
                        value={w.end}
                        onChange={(e) =>
                          update({
                            availability: profile.availability.map((v) =>
                              v.day === index
                                ? { ...v, end: e.target.value }
                                : v,
                            ),
                          })
                        }
                      />
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={profile.preferredDays.includes(index)}
                          onChange={(e) =>
                            update({
                              preferredDays: e.target.checked
                                ? [...profile.preferredDays, index]
                                : profile.preferredDays.filter(
                                    (v) => v !== index,
                                  ),
                            })
                          }
                        />
                        Bevorzugt
                      </label>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>
        <label className="block">
          Maximale Arbeitsminuten pro Woche (einschließlich weiterer
          Beschäftigungen)
          <Input
            type="number"
            min={60}
            max={2880}
            value={profile.maxWeeklyMinutes}
            onChange={(e) =>
              update({ maxWeeklyMinutes: Number(e.target.value) })
            }
          />
        </label>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={profile.historyConfirmed}
            onChange={(e) => update({ historyConfirmed: e.target.checked })}
          />
          Arbeitszeiten und gearbeitete Sonntage des laufenden Jahres sind
          vollständig in Quoska bzw. als weitere Beschäftigung eingetragen.
        </label>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={profile.externalWorkConfirmed}
            onChange={(e) =>
              update({ externalWorkConfirmed: e.target.checked })
            }
          />
          Weitere Beschäftigungen geprüft. Zusätzliche Arbeitszeiten sind unten
          eingetragen; leere Liste bedeutet: keine weiteren Arbeitszeiten.
        </label>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={profile.nightWorkConfirmed}
            onChange={(e) => update({ nightWorkConfirmed: e.target.checked })}
          />
          Voraussetzungen für Nachtarbeit geprüft, einschließlich
          arbeitsmedizinischer Vorsorge und angemessenem Ausgleich.
        </label>
        <PlanningExternalWork profile={profile} onChange={update} />
      </div>
    </details>
  );
}
