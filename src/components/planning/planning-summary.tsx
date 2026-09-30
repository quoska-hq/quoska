"use client";

import {
  CalendarCheck,
  CheckCheck,
  CircleAlert,
  ShieldCheck,
} from "lucide-react";
import {
  PLANNING_EMPLOYEES,
  PLANNING_LOCATIONS,
} from "@/config/planning-preview";
import {
  assignmentProblem,
  getPlanningTemplate,
  planningDate,
  planningHours,
  shiftMinutes,
} from "@/services/planningPreviewService";
import type { PlanningMonth, PlanningShift } from "@/types/planning-preview";
import styles from "./planning-preview.module.css";

export function PlanningSummary({
  month,
  shifts,
  location,
  onShift,
}: {
  month: PlanningMonth;
  shifts: PlanningShift[];
  location: string;
  onShift: (shift: PlanningShift) => void;
}) {
  const visible = shifts.filter(
    (shift) =>
      shift.date.startsWith(month.id) &&
      (location === "all" || shift.locationId === location),
  );
  const gaps = visible.filter((shift) => !shift.employeeId);
  const filled = visible.length - gaps.length;
  const hours = visible
    .filter((shift) => shift.employeeId)
    .reduce((sum, shift) => sum + shiftMinutes(shift), 0);
  const problems = visible.filter((shift) => {
    const employee = PLANNING_EMPLOYEES.find(
      (person) => person.id === shift.employeeId,
    );
    return employee && assignmentProblem(shifts, shift, employee);
  });
  return (
    <div className={styles.bottomGrid}>
      <section className={styles.summary}>
        <div className={styles.summaryTitle}>
          Besetzung im {month.name}
          <CalendarCheck size={16} />
        </div>
        <div className={styles.summaryValue}>
          {visible.length ? Math.round((filled / visible.length) * 100) : 0} %
          <small>
            {filled} von {visible.length} Diensten
          </small>
        </div>
        <div className={styles.progress}>
          <span
            style={{
              width: `${visible.length ? (filled / visible.length) * 100 : 0}%`,
            }}
          />
        </div>
        <p className={styles.muted}>
          {planningHours(hours)} Stunden geplant · Pausen abgezogen
        </p>
      </section>
      <section
        className={`${styles.summary} ${gaps.length ? "bg-[#fcf8ef]! border-[#e5dac3]!" : ""}`}
      >
        <div className={styles.summaryTitle}>
          {gaps.length ? "Hier fehlt noch jemand" : "Alle Dienste besetzt"}
          {gaps.length ? (
            <CircleAlert size={16} className="text-[#b69c66]" />
          ) : (
            <CheckCheck size={16} className="text-emerald-600" />
          )}
        </div>
        <div className={styles.summaryValue}>
          {gaps.length}
          <small>offene Schichten</small>
        </div>
        {gaps.slice(0, 2).map((shift) => (
          <div className={styles.gapItem} key={shift.id}>
            <div>
              {planningDate(shift.date)} ·{" "}
              {getPlanningTemplate(shift.templateId).name}
              <span className="block pt-0.5 text-[10px] text-stone-400">
                {
                  PLANNING_LOCATIONS.find(
                    (item) => item.id === shift.locationId,
                  )?.name
                }
              </span>
            </div>
            <button onClick={() => onShift(shift)}>Besetzen</button>
          </div>
        ))}
        {gaps.length > 2 && (
          <p className={`${styles.muted} mt-2`}>
            + {gaps.length - 2} weitere im Monat
          </p>
        )}
        {!gaps.length && (
          <p className={styles.muted}>
            Der Plan ist bereit für den nächsten Schritt.
          </p>
        )}
      </section>
      <section className={styles.summary}>
        <div className={styles.summaryTitle}>
          Prüfung der Beispielregeln
          <ShieldCheck size={16} />
        </div>
        <div className={styles.summaryValue}>
          {problems.length}
          <small>Regelkonflikte</small>
        </div>
        <p className={styles.muted}>
          Kompetenzen & Filialen · Urlaub
          <br />
          11 h Ruhezeit · höchstens 40 h pro Woche
        </p>
        <p className="mt-2 text-[10px] text-[#a79eaf]">
          Vereinfachte Regeln für diese Vorabversion.
        </p>
      </section>
    </div>
  );
}
