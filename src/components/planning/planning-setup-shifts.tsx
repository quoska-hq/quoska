"use client";
import type { PlanningConfig, PlanningTemplate } from "@/types/planning";
import { planningDemandsFromTemplates } from "@/config/client/planning-setup";
import { PlanningTemplateEditor } from "@/components/planning/planning-template-editor";
import { PlanningDemandEditor } from "@/components/planning/planning-demand-editor";

export function PlanningSetupShifts({
  config,
  onChange,
  automatic,
  onAutomaticChange,
}: {
  config: PlanningConfig;
  onChange: (patch: Partial<PlanningConfig>) => void;
  automatic: boolean;
  onAutomaticChange: (value: boolean) => void;
}) {
  const overnight = config.templates.some(
    (template) => template.active && template.nextDay,
  );
  function changeTemplates(templates: PlanningTemplate[]) {
    const demands = automatic
      ? planningDemandsFromTemplates(templates, () => crypto.randomUUID())
      : null;
    if (automatic && demands === null) {
      onAutomaticChange(false);
    }
    onChange({ templates, ...(demands ? { demands } : {}) });
  }
  return (
    <div className="space-y-5">
      <PlanningTemplateEditor config={config} onChange={changeTemplates} />
      <div className="rounded-xl border bg-[#f8f6ef] p-4 text-sm">
        <label className="flex items-start gap-2 font-medium">
          <input
            type="checkbox"
            checked={automatic}
            disabled={overnight}
            onChange={(event) => {
              onAutomaticChange(event.target.checked);
              if (event.target.checked) {
                const demands = planningDemandsFromTemplates(
                  config.templates,
                  () => crypto.randomUUID(),
                );
                if (demands) onChange({ demands });
              }
            }}
          />
          Besetzung automatisch aus Schichten übernehmen
        </label>
        <p className="mt-2 text-muted-foreground">
          {automatic
            ? "Filiale, Aufgabe, Zeiten und Personenzahl werden direkt übernommen. Du musst sie nur einmal eingeben."
            : "Die vorhandene Besetzung bleibt erhalten. Beim Einschalten wird sie durch die Angaben aus den Schichten ersetzt."}
        </p>
        <p className="mt-2 text-muted-foreground">
          Diese Personenzahl muss auch während der Pausen verfügbar sein. Für
          Pausenvertretung und abweichende Mindestbesetzung kannst du die
          Besetzung unten anpassen.
        </p>
      </div>
      <details
        key={overnight ? "overnight" : "standard"}
        open={overnight || undefined}
        className="rounded-xl border p-4"
      >
        <summary className="cursor-pointer text-sm font-medium">
          Besetzung genauer festlegen · {config.demands.length} Zeiträume
        </summary>
        {overnight && (
          <p role="alert" className="mt-3 text-sm text-amber-900">
            Für Schichten über Mitternacht bitte die benötigte Besetzung vor und
            nach Mitternacht getrennt angeben.
          </p>
        )}
        <div className="mt-4">
          <PlanningDemandEditor
            config={config}
            onChange={(demands) => {
              onAutomaticChange(false);
              onChange({ demands });
            }}
          />
        </div>
      </details>
    </div>
  );
}
