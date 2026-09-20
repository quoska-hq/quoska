"use client";

import type { DatevEmployee, DatevEmployeeSetting, DatevSettings } from "@/types/datev";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const numberValue = (text: string) => text === "" ? null : Number(text);

export function DatevSettingsForm({ settings, employees, onChange, onSave, busy }: {
  settings: DatevSettings; employees: DatevEmployee[]; onChange: (value: DatevSettings) => void;
  onSave: () => void; busy: boolean;
}) {
  function update(id: string, patch: Partial<DatevEmployeeSetting>) {
    onChange({ ...settings, employees: settings.employees.map(e => e.employeeId === id ? { ...e, ...patch } : e) });
  }
  return <fieldset disabled={busy} className="min-w-0 space-y-4">
    <legend className="mb-3 text-lg font-semibold">1. LODAS-Zuordnung</legend>
    <p className="text-sm text-muted-foreground">Nummern und Lohnarten bitte aus eurem Lohnbüro übernehmen. Keine Standard-Lohnart wird vorausgewählt.
      Für Personen, deren Gehalt bereits vollständig im Lohnprogramm berechnet wird, kann der Stundenexport unpassend sein.</p>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-1 text-sm">Beraternummer (4–7 Stellen)
        <Input aria-label="Beraternummer" inputMode="numeric" value={settings.advisorNumber ?? ""}
          onChange={e => onChange({ ...settings, advisorNumber: numberValue(e.target.value.replace(/\D/g, "").slice(0, 7)) })} />
      </label>
      <label className="space-y-1 text-sm">Mandantennummer (1–5 Stellen)
        <Input aria-label="Mandantennummer" inputMode="numeric" value={settings.clientNumber ?? ""}
          onChange={e => onChange({ ...settings, clientNumber: numberValue(e.target.value.replace(/\D/g, "").slice(0, 5)) })} />
      </label>
    </div>
    <div className="space-y-3">
      {employees.map(employee => {
        const setting = settings.employees.find(e => e.employeeId === employee.id)!;
        const name = `${employee.first_name} ${employee.last_name}`;
        return <div key={employee.id} className="rounded border p-3" data-testid={`datev-person-${employee.id}`}>
          <p className="mb-2 font-medium">{name}{employee.deleted_at && " (deaktiviert)"}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">Stunden exportieren
              <select aria-label={`Export für ${name}`} value={setting.mode} className="mt-1 h-9 w-full rounded border bg-background px-2"
                onChange={e => update(employee.id, { mode: e.target.value as DatevEmployeeSetting["mode"] })}>
                <option value="unconfigured">Noch festlegen</option><option value="include">Ja, einschließen</option>
                <option value="exclude">Nein, ausschließen</option>
              </select>
            </label>
            <label className="text-sm">Personalnummer
              <Input aria-label={`Personalnummer ${name}`} disabled={setting.mode !== "include"} inputMode="numeric" value={setting.personnelNumber ?? ""}
                onChange={e => update(employee.id, { personnelNumber: numberValue(e.target.value.replace(/\D/g, "").slice(0, 5)) })} />
            </label>
            <label className="text-sm">Lohnart für Arbeitsstunden
              <Input aria-label={`Lohnart ${name}`} disabled={setting.mode !== "include"} inputMode="numeric" value={setting.wageType ?? ""}
                onChange={e => update(employee.id, { wageType: numberValue(e.target.value.replace(/\D/g, "").slice(0, 4)) })} />
            </label>
          </div>
        </div>;
      })}
    </div>
    <Button onClick={onSave}>{busy ? "Wird gespeichert …" : "Zuordnung speichern"}</Button>
  </fieldset>;
}
