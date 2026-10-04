"use client";
import type {
  PlanningConfig,
  PlanningEmployee,
  PlanningProfile,
} from "@/types/planning";
import { PlanningExternalWork } from "@/components/planning/planning-external-work";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlanningContracts } from "@/components/planning/planning-contracts";
import { PlanningProfileDates } from "@/components/planning/planning-profile-dates";
import { PlanningProfileAvailability } from "@/components/planning/planning-profile-availability";
import { planningProfileMissing } from "@/config/client/planning-setup";

export function PlanningProfileEditor({
  employee,
  config,
  today,
  onChange,
  onRemove,
}: {
  employee: PlanningEmployee;
  config: PlanningConfig;
  today: string;
  onChange: (profile: PlanningProfile) => void;
  onRemove: () => void;
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
  // eslint-disable-next-line @quoska/legal/enforce-max-working-hours -- Converts the validated weekly minute limit to displayed hours.
  const weeklyHours = profile.maxWeeklyMinutes / 60;
  return (
    <details className="rounded-xl border p-4">
      <summary className="cursor-pointer text-sm font-semibold">
        {employee.name} · {employee.targetHoursWeek} Sollstunden/Woche ·{" "}
        {profile.eligibility === "unsupported"
          ? "Gesonderte Prüfung nötig"
          : planningProfileMissing(profile).length === 0
            ? "Bereit für die Planung"
            : "Angaben fehlen"}
      </summary>
      <div className="mt-4 space-y-4 text-sm">
        <p className="text-muted-foreground">
          Sollstunden, Zeitkonto und Abwesenheiten sind bereits hinterlegt.
          Ergänze die Angaben für den Einsatzplan.
        </p>
        <fieldset>
          <legend className="mb-2 font-medium">
            Wo kann {employee.name} arbeiten?
          </legend>
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
          <legend className="mb-2 font-medium">
            Welche Aufgaben kann {employee.name} übernehmen?
          </legend>
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
        <PlanningProfileAvailability
          name={employee.name}
          profile={profile}
          onChange={update}
        />
        <h4 className="font-medium">Arbeitszeitregeln einmal prüfen</h4>
        <label className="block">
          Welche Regeln gelten für diese Person?
          <select
            className="mt-1 block w-full rounded-md border p-2"
            value={profile.eligibility}
            onChange={(event) =>
              update({
                eligibility: event.target
                  .value as PlanningProfile["eligibility"],
              })
            }
          >
            <option value="unconfirmed">Bitte prüfen und auswählen</option>
            <option value="adult_standard">
              Volljährig, ein Schichtblock pro Tag, keine Sonderregeln
            </option>
            <option value="unsupported">
              Besonderer Schutz oder Sonderregeln – gesonderte Prüfung nötig
            </option>
          </select>
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
          Weitere Beschäftigungen geprüft: Es gibt keine weiteren Arbeitszeiten
          oder sie sind unter „Weitere Beschäftigungen“ vollständig eingetragen.
        </label>
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer font-medium">
            Weitere Beschäftigungen · {profile.externalWork.length} Einträge
          </summary>
          <div className="mt-3">
            <PlanningExternalWork profile={profile} onChange={update} />
          </div>
        </details>
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer font-medium">
            Arbeitszeitgrenze & Nachtarbeit
          </summary>
          <label className="my-3 block">
            Maximal erlaubte Stunden pro Woche, inklusive weiterer
            Beschäftigungen
            <Input
              type="number"
              min={1}
              max={48}
              step={0.25}
              value={weeklyHours}
              onChange={(event) =>
                update({
                  // eslint-disable-next-line @quoska/legal/enforce-max-working-hours -- Converts user-entered hours to the validated weekly minute limit.
                  maxWeeklyMinutes: Math.round(Number(event.target.value) * 60),
                })
              }
            />
          </label>
          <p className="mb-3 text-xs text-muted-foreground">
            Die Grenze ersetzt weder Sollstunden noch Verfügbarkeit. Ohne
            bestätigte Voraussetzungen wird Nachtarbeit gesperrt.
          </p>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={profile.nightWorkConfirmed}
              onChange={(e) => update({ nightWorkConfirmed: e.target.checked })}
            />
            Voraussetzungen für Nachtarbeit geprüft, einschließlich
            arbeitsmedizinischer Vorsorge und angemessenem Ausgleich.
          </label>
        </details>
        <PlanningContracts
          employee={employee}
          profile={profile}
          today={today}
          onChange={update}
        />
        <PlanningProfileDates profile={profile} onChange={update} />
        {profile.eligibility === "unsupported" ? (
          <p className="text-amber-900">
            Diese Person wird nicht automatisch eingeplant. Die besondere
            Regelung muss zuerst gesondert geprüft werden.
          </p>
        ) : (
          planningProfileMissing(profile).length > 0 && (
            <p className="text-xs text-amber-900">
              Noch offen: {planningProfileMissing(profile).join(" · ")}.
            </p>
          )
        )}
        {config.profiles.some((value) => value.employeeId === employee.id) && (
          <Button variant="ghost" onClick={onRemove}>
            Diese Person vorerst nicht einplanen
          </Button>
        )}
      </div>
    </details>
  );
}
