"use client";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import type { PlanningConfig } from "@/types/planning";
import { planningConfigSchema } from "@/types/planning-schemas";
import type { PlanningBoardData } from "@/types/planning-client";
import { planningAddMonths } from "@/config/client/planning-calendar";
import { planningProfileMissing } from "@/config/client/planning-setup";
import { Button } from "@/components/ui/button";
import { PlanningSetupLocations } from "@/components/planning/planning-setup-locations";
import { PlanningSetupReview } from "@/components/planning/planning-setup-review";
import { PlanningProfileEditor } from "@/components/planning/planning-profile-editor";
import { PlanningSetupShifts } from "@/components/planning/planning-setup-shifts";

const STEPS = [
  "Filialen & Aufgaben",
  "Mitarbeitende",
  "Schichten",
  "Prüfen & starten",
];
const DESCRIPTIONS = [
  "Wo arbeitet ihr und welche Aufgaben müssen besetzt werden?",
  "Öffne eine Person und wähle Filialen, Aufgaben und verfügbare Zeiten. Nicht eingerichtete Personen werden nicht eingeplant.",
  "Wann braucht ihr wie viele Personen? Lege zum Beispiel einen Frühdienst für den Verkauf an.",
  "Prüfe die Einrichtung. Anschließend kannst du euren ersten Dienstplan berechnen.",
];

export function PlanningSetup({
  data,
  busy,
  onSave,
}: {
  data: PlanningBoardData;
  busy: boolean;
  onSave: (config: PlanningConfig, version: number) => void;
}) {
  const [config, setConfig] = useState<PlanningConfig>(() => ({
    ...structuredClone(data.state.config),
    profiles: structuredClone(data.state.config.profiles).filter((profile) =>
      data.context.employees.some(
        (employee) => employee.id === profile.employeeId,
      ),
    ),
    firstMonth:
      data.state.config.firstMonth ??
      planningAddMonths(data.context.today.slice(0, 7) + "-01", 1),
  }));
  const [initialConfig] = useState(() => JSON.stringify(data.state.config)),
    [step, setStep] = useState(0),
    [error, setError] = useState("");
  const [automaticCoverage, setAutomaticCoverage] = useState(
    !config.templates.length && !config.demands.length,
  );
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [step]);
  const update = (patch: Partial<PlanningConfig>) =>
    setConfig((previous) => ({ ...previous, ...patch }));
  function stepError() {
    if (step === 0) {
      if (
        !config.firstMonth ||
        !planningConfigSchema.shape.firstMonth.safeParse(config.firstMonth)
          .success
      )
        return "Bitte den ersten Planungsmonat als TT.MM.JJJJ mit dem ersten Tag des Monats angeben.";
      if (
        config.firstMonth !== data.state.config.firstMonth &&
        (config.firstMonth < data.context.today.slice(0, 7) + "-01" ||
          config.firstMonth >
            planningAddMonths(data.context.today.slice(0, 7) + "-01", 1))
      )
        return "Der erste Planungsmonat muss der aktuelle oder nächste Monat sein.";
      if (!config.locations.length || !config.skills.length)
        return "Bitte mindestens eine Filiale und eine Kompetenz hinzufügen.";
      if (
        !planningConfigSchema.shape.locations.safeParse(config.locations)
          .success
      )
        return "Bitte die Filialangaben und örtlichen Feiertage prüfen (TT.MM.JJJJ).";
      if (config.locations.some((l) => !l.localHolidaysConfirmed))
        return "Bitte die örtlichen Feiertage für jede Filiale prüfen und bestätigen.";
    }
    if (step === 1) {
      const profiles = config.profiles.filter(
        (profile) => profile.eligibility !== "unsupported",
      );
      if (!profiles.length)
        return "Bitte mindestens eine Person für die Planung einrichten.";
      const incomplete = profiles.find(
        (profile) => planningProfileMissing(profile).length > 0,
      );
      if (incomplete) {
        const name =
          data.context.employees.find(
            (employee) => employee.id === incomplete.employeeId,
          )?.name ?? "Diese Person";
        return `${name}: Bitte ${planningProfileMissing(incomplete).join(", ")}.`;
      }
      if (
        !planningConfigSchema.shape.profiles.safeParse(config.profiles).success
      )
        return "Bitte die Verfügbarkeiten und Arbeitszeitangaben der Mitarbeitenden prüfen.";
    }
    if (step === 2) {
      if (!config.templates.length || !config.demands.length)
        return "Bitte mindestens eine aktive Schicht und die benötigte Besetzung hinzufügen.";
      if (!config.templates.some((template) => template.active))
        return "Bitte mindestens eine Schicht aktivieren.";
      if (
        !planningConfigSchema.shape.templates.safeParse(config.templates)
          .success ||
        !planningConfigSchema.shape.demands.safeParse(config.demands).success
      )
        return "Bitte die Zeitangaben, Pausen und Besetzungsregeln prüfen.";
    }
    return "";
  }
  function next() {
    const message = stepError();
    setError(message);
    if (!message) setStep((value) => value + 1);
  }
  const stale = initialConfig !== JSON.stringify(data.state.config);
  return (
    <section
      aria-label="Dienstplanung einrichten"
      className="space-y-6 rounded-2xl border border-[#dcd7cb] bg-white p-5 sm:p-7"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6658d3]">
          Einrichtung · Schritt {step + 1} von 4
        </p>
        <h2 className="mt-2 text-xl font-semibold">Dienstplanung einrichten</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Vier kurze Schritte. Mitarbeitende, Sollstunden, Urlaub und
          Krankmeldungen sind bereits aus Quoska übernommen. Gespeichert wird
          erst am Ende.
        </p>
      </div>
      <ol
        aria-label="Einrichtungsschritte"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {STEPS.map((label, index) => (
          <li
            key={label}
            aria-current={step === index ? "step" : undefined}
            className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-sm ${step === index ? "border-[#6658d3]/30 bg-[#f1eefb] text-[#5548ba]" : "border-slate-200 text-slate-500"}`}
          >
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs ${index <= step ? "bg-[#6658d3] text-white" : "bg-slate-100"}`}
            >
              {index < step ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span>{label}</span>
          </li>
        ))}
      </ol>
      <div>
        <h3
          ref={heading}
          tabIndex={-1}
          className="text-lg font-semibold outline-none"
        >
          {STEPS[step]}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {DESCRIPTIONS[step]}
        </p>
      </div>
      {step === 0 && (
        <PlanningSetupLocations
          config={config}
          today={data.context.today}
          onChange={update}
        />
      )}
      {step === 1 && (
        <div className="space-y-3">
          {data.context.employees.map((employee) => (
            <PlanningProfileEditor
              key={employee.id}
              employee={employee}
              config={config}
              today={data.context.today}
              onRemove={() =>
                update({
                  profiles: config.profiles.filter(
                    (profile) => profile.employeeId !== employee.id,
                  ),
                })
              }
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
      )}
      {step === 2 && (
        <div className="space-y-6">
          <PlanningSetupShifts
            config={config}
            onChange={update}
            automatic={automaticCoverage}
            onAutomaticChange={setAutomaticCoverage}
          />
        </div>
      )}
      {step === 3 && <PlanningSetupReview config={config} />}
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {stale && (
        <p role="alert" className="text-sm text-amber-900">
          Die Einrichtung wurde während deiner Bearbeitung geändert. Bitte neu
          laden und die Änderungen erneut prüfen.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
        <Button
          variant="outline"
          disabled={step === 0 || busy}
          onClick={() => {
            setError("");
            setStep((value) => value - 1);
          }}
        >
          <ChevronLeft className="size-4" />
          Zurück
        </Button>
        {step < 3 ? (
          <Button disabled={busy || stale} onClick={next}>
            Weiter
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button
            disabled={busy || stale}
            onClick={() => {
              if (!planningConfigSchema.safeParse(config).success) {
                setError(
                  "Bitte die Einrichtung prüfen. Es fehlen gültige Angaben.",
                );
                return;
              }
              onSave(config, data.version);
            }}
          >
            {busy ? "Wird gespeichert …" : "Einrichtung speichern"}
            <Check className="size-4" />
          </Button>
        )}
      </div>
    </section>
  );
}
