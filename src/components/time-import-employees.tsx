"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import type { TimeImportState } from "@/hooks/use-time-import";
import { Button } from "@/components/ui/button";
import { importSelectClass } from "@/components/time-import-settings";

export function TimeImportEmployees({ state }: { state: TimeImportState }) {
  const [editable, setEditable] = useState<string[]>([]);
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Für wen sind diese Arbeitszeiten?</h3>
        <p className="mt-1 text-sm text-muted-foreground">Prüfe die Zuordnung. Passende E-Mail-Adressen haben wir bereits erkannt.</p>
      </div>
      {state.employeesLoading ? <p className="text-sm" role="status">Mitarbeiter werden geladen…</p> : <div className="max-h-72 space-y-2 overflow-auto">
        {state.sources.map((source) => {
          const id = state.suggestedEmployee(source);
          const employee = state.employees.find((item) => item.id === id);
          const label = source || (state.columns.employee === undefined ? "Alle Zeilen dieser Datei" : "Zeilen ohne Mitarbeiterangabe");
          return (
            <div key={source} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-md border p-3 text-sm">
              <span className="min-w-0 flex-1 basis-44 break-words text-muted-foreground">{label}</span>
              <ArrowRight aria-hidden="true" className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
              {employee && !editable.includes(source) ? <div className="flex min-w-0 flex-1 basis-56 items-center gap-2">
                <Check aria-hidden="true" className="size-4 shrink-0 text-success" />
                <span className="min-w-0 flex-1 break-words font-medium">{employee.first_name} {employee.last_name}</span>
                <Button variant="ghost" size="sm" aria-label={`Zuordnung für ${label} ändern`} onClick={() => setEditable([...editable, source])}>Ändern</Button>
              </div> : <label className="min-w-0 flex-1 basis-56">
                <span className="sr-only">Mitarbeiter für {label}</span>
                <select className={importSelectClass} value={id} onChange={(event) => state.assignEmployee(source, event.target.value)}>
                  <option value="">Mitarbeiter auswählen</option>
                  {state.employees.map((item) => <option key={item.id} value={item.id}>{item.first_name} {item.last_name} ({item.email})</option>)}
                </select>
              </label>}
            </div>
          );
        })}
      </div>}
      {state.missingEmployees && !state.employeesLoading && <p className="text-sm text-muted-foreground">
        Wähle für jede Zeile oben einen Mitarbeiter. Fehlende Personen kannst du in der <Link className="underline" href="/app/employees">Mitarbeiterverwaltung</Link> anlegen.
      </p>}
    </div>
  );
}
