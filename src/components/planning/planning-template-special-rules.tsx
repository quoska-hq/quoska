import type { PlanningTemplate } from "@/types/planning";
import { Input } from "@/components/ui/input";
import { GermanDateInput } from "@/components/german-date-input";

export type PlanningSpecialRules = Pick<
  PlanningTemplate,
  | "nextDay"
  | "authorization"
  | "authorizationReference"
  | "authorizationFrom"
  | "authorizationUntil"
  | "holidayMode"
>;
export function PlanningTemplateSpecialRules({
  value,
  onChange,
}: {
  value: PlanningSpecialRules;
  onChange: (patch: Partial<PlanningSpecialRules>) => void;
}) {
  return (
    <details className="rounded-lg border p-3">
      <summary className="cursor-pointer text-sm font-medium">
        Sonn-, Feiertage & Schichten über Mitternacht
      </summary>
      <div className="mt-3 space-y-3 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.nextDay}
            onChange={(event) => onChange({ nextDay: event.target.checked })}
          />
          Ende am Folgetag
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.holidayMode === "include"}
            onChange={(event) =>
              onChange({
                holidayMode: event.target.checked ? "include" : "skip",
              })
            }
          />
          Auch an gesetzlichen Feiertagen einplanen
        </label>
        <label className="block">
          Berechtigung für Sonn- und Feiertage
          <select
            aria-label="Berechtigung Sonn- und Feiertage"
            className="mt-1 w-full rounded-md border p-2"
            value={value.authorization}
            onChange={(event) =>
              onChange({
                authorization: event.target
                  .value as PlanningTemplate["authorization"],
              })
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
        </label>
        <Input
          aria-label="Dokumentierte Rechtsgrundlage"
          placeholder="Rechtsgrundlage, Tätigkeit und Voraussetzungen"
          value={value.authorizationReference}
          onChange={(event) =>
            onChange({ authorizationReference: event.target.value })
          }
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            Gültig ab
            <GermanDateInput
              value={value.authorizationFrom ?? ""}
              onChange={(date) => onChange({ authorizationFrom: date || null })}
            />
          </label>
          <label>
            Gültig bis
            <GermanDateInput
              value={value.authorizationUntil ?? ""}
              onChange={(date) =>
                onChange({ authorizationUntil: date || null })
              }
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          Ladenöffnungszeiten allein erlauben keine Beschäftigung. Verkauf ist
          von der Bäckerei-Ausnahme für Herstellung und Auslieferung nicht
          erfasst.
        </p>
      </div>
    </details>
  );
}
