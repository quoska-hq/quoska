"use client";

import { Fragment } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LockKeyhole,
  MapPin,
  Plus,
} from "lucide-react";
import {
  PLANNING_EMPLOYEES,
  PLANNING_LOCATIONS,
  PLANNING_TEMPLATES,
} from "@/config/planning-preview";
import {
  addPlanningDays,
  dayNumber,
  planningDate,
  planningTime,
  planningWeek,
} from "@/services/planningPreviewService";
import type { PlanningMonth, PlanningShift } from "@/types/planning-preview";
import styles from "./planning-preview.module.css";

const DAYS = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];

export function PlanningCalendar({
  month,
  shifts,
  week,
  location,
  onWeek,
  onLocation,
  onShift,
}: {
  month: PlanningMonth;
  shifts: PlanningShift[];
  week: string;
  location: string;
  onWeek: (week: string) => void;
  onLocation: (location: string) => void;
  onShift: (shift: PlanningShift) => void;
}) {
  const days = Array.from({ length: 7 }, (_, index) =>
    addPlanningDays(week, index),
  );
  const firstWeek = planningWeek(`${month.id}-01`);
  const nextWeek = addPlanningDays(week, 7);
  const locations = PLANNING_LOCATIONS.filter(
    (item) => location === "all" || location === item.id,
  );
  return (
    <section className={styles.board} aria-label="Wochenplan">
      <div className={styles.boardToolbar}>
        <div className={styles.weekNav}>
          <button
            className={styles.iconButton}
            aria-label="Vorherige Woche"
            disabled={dayNumber(week) <= dayNumber(firstWeek)}
            onClick={() => onWeek(addPlanningDays(week, -7))}
          >
            <ChevronLeft size={15} />
          </button>
          <span>
            {planningDate(week)} – {planningDate(days[6])}
          </span>
          <button
            className={styles.iconButton}
            aria-label="Nächste Woche"
            disabled={!nextWeek.startsWith(month.id)}
            onClick={() => onWeek(nextWeek)}
          >
            <ChevronRight size={15} />
          </button>
        </div>
        <label className="flex items-center gap-2 text-xs text-stone-400">
          <MapPin size={14} />
          <span className="sr-only">Filiale filtern</span>
          <select
            aria-label="Filiale filtern"
            value={location}
            onChange={(event) => onLocation(event.target.value)}
            className={styles.select}
          >
            <option value="all">Alle Filialen</option>
            {PLANNING_LOCATIONS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles.mobileHint}>
        Den Wochenplan seitlich wischen oder unter „Meine Dienste“ als Liste
        ansehen.
      </div>
      <div
        className={styles.gridScroller}
        tabIndex={0}
        role="region"
        aria-label="Kalender, horizontal scrollbar"
      >
        <div className={styles.calendar}>
          <div className={`${styles.dayHeading} text-left! pl-4!`}>
            Schicht / Filiale
          </div>
          {days.map((day, index) => (
            <div
              key={day}
              className={`${styles.dayHeading} ${index > 4 ? styles.weekend : ""}`}
            >
              <strong>{DAYS[index]}</strong>
              {planningDate(day)}
            </div>
          ))}
          {locations.map((item) => (
            <Fragment key={item.id}>
              <div className={styles.locationHeading}>
                <MapPin size={12} />
                {item.name}
                <span className="ml-auto text-[9px] font-normal normal-case tracking-normal text-stone-400">
                  3 Dienste pro Tag
                </span>
              </div>
              {PLANNING_TEMPLATES.map((template) => (
                <Fragment key={template.id}>
                  <div className={styles.rowLabel}>
                    {template.name}
                    <span>{template.skills.join(" · ")}</span>
                  </div>
                  {days.map((date, index) => {
                    const shift = shifts.find(
                      (entry) =>
                        entry.date === date &&
                        entry.locationId === item.id &&
                        entry.templateId === template.id,
                    );
                    const employee = PLANNING_EMPLOYEES.find(
                      (person) => person.id === shift?.employeeId,
                    );
                    return (
                      <div
                        key={date}
                        className={`${styles.cell} ${index > 4 ? styles.weekend : ""}`}
                      >
                        {!shift || !date.startsWith(month.id) ? (
                          <div className={styles.emptyCell}>—</div>
                        ) : (
                          <button
                            className={`${styles.shift} ${shift.employeeId ? styles[template.tone] : styles.open}`}
                            aria-label={`${employee?.name ?? "Offene Schicht"}, ${template.name}, ${item.name}, ${planningDate(date)}`}
                            onClick={() => onShift(shift)}
                          >
                            {(shift.locked || month.status === "fixed") && (
                              <LockKeyhole
                                size={9}
                                className="absolute right-1.5 top-1.5 opacity-55"
                              />
                            )}
                            <strong>
                              {employee ? (
                                `${employee.name.split(" ")[0]} ${employee.name.split(" ")[1][0]}.`
                              ) : (
                                <span className="flex items-center gap-1 text-[11px]! opacity-100!">
                                  <Plus size={11} />
                                  Offen
                                </span>
                              )}
                            </strong>
                            <span>
                              {planningTime(template.start)} –{" "}
                              {planningTime(template.end)}
                            </span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
      <div className={styles.legend}>
        <span>
          <i className={`${styles.dot} bg-[#ad9bdb]`} />
          Backstube
        </span>
        <span>
          <i className={`${styles.dot} bg-[#8aafda]`} />
          Frühdienst
        </span>
        <span>
          <i className={`${styles.dot} bg-[#d6b87a]`} />
          Spätdienst
        </span>
        <span className="ml-auto">
          <LockKeyhole size={10} />
          Fixiert · wird nicht automatisch verändert
        </span>
      </div>
    </section>
  );
}
