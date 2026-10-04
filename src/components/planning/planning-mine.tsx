"use client";

import { useState } from "react";
import {
  ArrowLeftRight,
  CalendarDays,
  EyeOff,
  LockKeyhole,
} from "lucide-react";
import {
  PLANNING_EMPLOYEES,
  PLANNING_LOCATIONS,
  PLANNING_STATUS,
} from "@/config/planning-preview";
import {
  getPlanningTemplate,
  planningDate,
  planningHours,
  planningTime,
  shiftMinutes,
  swapPlanningShifts,
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
import type {
  PlanningMonth,
  PlanningShift,
  PlanningState,
} from "@/types/planning-preview";
import styles from "./planning-preview.module.css";

export function PlanningMine({
  state,
  month,
  onSwap,
}: {
  state: PlanningState;
  month: PlanningMonth;
  onSwap: (firstId: string, secondId: string) => string | null;
}) {
  const [employeeId, setEmployeeId] = useState("e5");
  const [swap, setSwap] = useState<PlanningShift | null>(null);
  const shifts = state.shifts.filter(
    (shift) =>
      shift.date.startsWith(month.id) && shift.employeeId === employeeId,
  );
  const employee = PLANNING_EMPLOYEES.find(
    (person) => person.id === employeeId,
  )!;
  return (
    <>
      <div className={styles.notice}>
        <CalendarDays className="size-[15px]" />
        <div>
          Ansicht für Mitarbeitende. Verbindliche und angekündigte Dienste sind
          sichtbar; Entwürfe bleiben bei der Planungsleitung.
        </div>
      </div>
      <section className={styles.board}>
        <div className={styles.boardToolbar}>
          <div className={styles.person}>
            <span
              className={styles.avatar}
              style={{ background: employee.color }}
            >
              {employee.initials}
            </span>
            <select
              className={styles.select}
              aria-label="Mitarbeiteransicht wählen"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
            >
              {PLANNING_EMPLOYEES.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </div>
          {month.status !== "draft" && (
            <span className="text-xs text-stone-400">
              {shifts.length} Dienste ·{" "}
              {planningHours(
                shifts.reduce((sum, shift) => sum + shiftMinutes(shift), 0),
              )}{" "}
              h im {month.name}
            </span>
          )}
        </div>
        {month.status === "draft" ? (
          <div className={styles.emptyState}>
            <EyeOff size={27} className="mx-auto mb-3 text-[#b7aac8]" />
            Für {month.name} wurde noch kein Plan angekündigt.
            <p className="mt-2 text-xs">
              Die Planungsleitung kann ihn im Dienstplan ankündigen.
            </p>
          </div>
        ) : (
          <div className={styles.agenda}>
            {shifts.map((shift) => {
              const template = getPlanningTemplate(shift.templateId);
              return (
                <div className={styles.agendaRow} key={shift.id}>
                  <div className={styles.agendaDate}>
                    {planningDate(shift.date)}
                  </div>
                  <div className={styles.agendaDetail}>
                    <strong className="font-medium text-[#776488]">
                      {template.name} · {planningTime(template.start)} –{" "}
                      {planningTime(template.end)}
                    </strong>
                    <p className="text-[11px] text-stone-400">
                      {
                        PLANNING_LOCATIONS.find(
                          (item) => item.id === shift.locationId,
                        )?.name
                      }{" "}
                      · {template.breakMinutes} min Pause
                    </p>
                  </div>
                  <span
                    className={`${styles.pill} ${PLANNING_STATUS[month.status].color}`}
                  >
                    {PLANNING_STATUS[month.status].label}
                  </span>
                  <div className={styles.agendaActions}>
                    {month.status === "announced" && !shift.locked ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-md border-[#e2dce9] text-[#8b779b]"
                        onClick={() => setSwap(shift)}
                      >
                        <ArrowLeftRight size={12} />
                        Tauschen
                        <span className="sr-only">
                          {" "}
                          am {planningDate(shift.date)}
                        </span>
                      </Button>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-stone-400">
                        <LockKeyhole size={11} />
                        Fixiert
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {!shifts.length && (
              <p className={styles.emptyState}>
                In diesem Monat sind noch keine Dienste zugeordnet.
              </p>
            )}
          </div>
        )}
      </section>
      {swap && (
        <PlanningSwapDialog
          key={swap.id}
          shift={swap}
          state={state}
          onClose={() => setSwap(null)}
          onSwap={(secondId) => onSwap(swap.id, secondId)}
        />
      )}
    </>
  );
}

function PlanningSwapDialog({
  shift,
  state,
  onClose,
  onSwap,
}: {
  shift: PlanningShift;
  state: PlanningState;
  onClose: () => void;
  onSwap: (secondId: string) => string | null;
}) {
  const [targetId, setTargetId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const candidates = state.shifts.filter(
    (other) =>
      other.date.startsWith(shift.date.slice(0, 7)) &&
      other.employeeId &&
      other.employeeId !== shift.employeeId &&
      !swapPlanningShifts(state, shift.id, other.id).error,
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="rounded-xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Dienst tauschen</DialogTitle>
          <DialogDescription>
            Dein Dienst am {planningDate(shift.date)} ·{" "}
            {getPlanningTemplate(shift.templateId).name}
          </DialogDescription>
        </DialogHeader>
        <label className={styles.field}>
          Passenden Dienst auswählen
          <select
            className={styles.select}
            value={targetId}
            onChange={(event) => {
              setTargetId(event.target.value);
              setError(null);
            }}
          >
            <option value="">Bitte auswählen</option>
            {candidates.map((other) => (
              <option key={other.id} value={other.id}>
                {planningDate(other.date)} ·{" "}
                {
                  PLANNING_EMPLOYEES.find(
                    (person) => person.id === other.employeeId,
                  )?.name
                }{" "}
                · {getPlanningTemplate(other.templateId).name} ·{" "}
                {
                  PLANNING_LOCATIONS.find(
                    (item) => item.id === other.locationId,
                  )?.name
                }
              </option>
            ))}
          </select>
        </label>
        {!candidates.length && (
          <p className="text-xs text-amber-700">
            Es gibt keinen passenden Tausch unter den Beispielregeln.
          </p>
        )}
        <div className={styles.dialogInfo}>
          Es werden nur Dienste angeboten, bei denen beide Zuordnungen die
          Beispielregeln erfüllen. Für diese Vorschau wird die Zustimmung beider
          Personen angenommen.
        </div>
        {error && (
          <p role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            className={styles.secondary}
            variant="outline"
            onClick={onClose}
          >
            Abbrechen
          </Button>
          <Button
            className={styles.primary}
            disabled={!targetId}
            onClick={() => {
              const result = onSwap(targetId);
              if (result) setError(result);
              else onClose();
            }}
          >
            Beispieltausch bestätigen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
