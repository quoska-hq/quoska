"use client";

import { useState } from "react";
import { LockKeyhole, MapPin, ShieldCheck } from "lucide-react";
import {
  PLANNING_EMPLOYEES,
  PLANNING_LOCATIONS,
} from "@/config/planning-preview";
import {
  assignmentProblem,
  getPlanningTemplate,
  planningDate,
  planningHours,
  planningTime,
  weeklyMinutes,
} from "@/services/planningPreviewService";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PlanningShift, PlanningState } from "@/types/planning-preview";
import styles from "./planning-preview.module.css";

export function PlanningShiftDialog({
  shift,
  state,
  onClose,
  onSave,
}: {
  shift: PlanningShift;
  state: PlanningState;
  onClose: () => void;
  onSave: (employeeId: string | null, locked: boolean) => string | null;
}) {
  const [employeeId, setEmployeeId] = useState(shift.employeeId ?? "");
  const [locked, setLocked] = useState(shift.locked);
  const [error, setError] = useState<string | null>(null);
  const template = getPlanningTemplate(shift.templateId);
  const location = PLANNING_LOCATIONS.find(
    (item) => item.id === shift.locationId,
  )!;
  const fixed =
    state.months.find((month) => shift.date.startsWith(month.id))?.status ===
    "fixed";
  const candidates = PLANNING_EMPLOYEES.map((person) => ({
    person,
    problem: assignmentProblem(state.shifts, shift, person),
  }));
  const selected = candidates.find((item) => item.person.id === employeeId);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="rounded-xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {fixed
              ? "Verbindlicher Dienst"
              : shift.employeeId
                ? "Dienst bearbeiten"
                : "Offene Schicht besetzen"}
          </DialogTitle>
          <DialogDescription>
            {template.name} · {planningDate(shift.date)}
          </DialogDescription>
        </DialogHeader>
        <div className={styles.dialogInfo}>
          <div className="flex items-center gap-2">
            <MapPin size={14} />
            {location.name}
          </div>
          <strong className="mt-1 block text-xl font-medium text-[#5c506c]">
            {planningTime(template.start)} – {planningTime(template.end)}
          </strong>
          <p>
            {template.breakMinutes} Minuten Pause ·{" "}
            {template.skills.join(" + ")}
          </p>
        </div>
        <label className={styles.field}>
          Mitarbeitende
          <select
            className={styles.select}
            value={employeeId}
            disabled={fixed}
            onChange={(event) => {
              setEmployeeId(event.target.value);
              setError(null);
            }}
          >
            <option value="">Unbesetzt lassen</option>
            {candidates.map(({ person, problem }) => (
              <option key={person.id} value={person.id} disabled={!!problem}>
                {person.name}
                {problem ? ` — ${problem}` : ""}
              </option>
            ))}
          </select>
        </label>
        {selected && (
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <ShieldCheck size={15} className="text-emerald-600" />
            {planningHours(
              weeklyMinutes(state.shifts, selected.person.id, shift.date),
            )}{" "}
            h bereits in dieser Woche geplant · {selected.person.weeklyHours} h
            Vertrag
          </div>
        )}
        {!fixed && (
          <label className="flex items-center gap-2 rounded-lg border border-[#e5e0eb] p-3 text-xs text-[#786d86]">
            <input
              type="checkbox"
              checked={locked}
              disabled={!employeeId}
              onChange={(event) => setLocked(event.target.checked)}
              className="accent-[#6658d3]"
            />
            <LockKeyhole size={14} />
            Zuordnung für automatische Vorschläge fixieren
          </label>
        )}
        {fixed && (
          <p className={styles.notice}>
            <LockKeyhole size={14} />
            Dieser Monat wurde freigegeben. Die Zuordnung ist verbindlich und
            lässt sich in der Vorschau nicht ändern.
          </p>
        )}
        {!fixed && (
          <details className="text-xs text-stone-500">
            <summary className="cursor-pointer">
              Warum sind manche Personen nicht verfügbar?
            </summary>
            <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
              {candidates
                .filter((item) => item.problem)
                .map(({ person, problem }) => (
                  <li key={person.id}>
                    {person.name}: {problem}
                  </li>
                ))}
            </ul>
          </details>
        )}
        {error && (
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            className={styles.secondary}
            onClick={onClose}
          >
            {fixed ? "Schließen" : "Abbrechen"}
          </Button>
          {!fixed && (
            <Button
              className={styles.primary}
              onClick={() => {
                const result = onSave(employeeId || null, locked);
                if (result) setError(result);
                else onClose();
              }}
            >
              Änderung übernehmen
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
