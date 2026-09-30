"use client";

import { useState } from "react";
import { BedDouble, Clock3, GraduationCap, Search } from "lucide-react";
import {
  PLANNING_ABSENCES,
  PLANNING_EMPLOYEES,
  PLANNING_LOCATIONS,
} from "@/config/planning-preview";
import {
  planningDate,
  planningHours,
  weeklyMinutes,
} from "@/services/planningPreviewService";
import type { PlanningShift } from "@/types/planning-preview";
import styles from "./planning-preview.module.css";

export function PlanningTeam({
  shifts,
  week,
}: {
  shifts: PlanningShift[];
  week: string;
}) {
  const [search, setSearch] = useState("");
  const [skill, setSkill] = useState("all");
  const employees = PLANNING_EMPLOYEES.filter(
    (person) =>
      person.name
        .toLocaleLowerCase("de-DE")
        .includes(search.toLocaleLowerCase("de-DE")) &&
      (skill === "all" || person.skills.some((item) => item === skill)),
  );
  return (
    <>
      <section
        className={styles.board}
        aria-label="Team und Arbeitszeitmodelle"
      >
        <div className={styles.boardToolbar}>
          <label className="flex items-center gap-2 text-stone-400">
            <Search size={15} />
            <input
              aria-label="Team durchsuchen"
              placeholder="Name suchen …"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-40 text-xs text-stone-600 outline-none"
            />
          </label>
          <select
            className={styles.select}
            aria-label="Kompetenz filtern"
            value={skill}
            onChange={(event) => setSkill(event.target.value)}
          >
            <option value="all">Alle Kompetenzen</option>
            {["Backstube", "Verkauf", "Schlüssel"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className={styles.gridScroller}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Mitarbeitende</th>
                <th>Kompetenzen</th>
                <th>Filialen</th>
                <th>Soll / Woche</th>
                <th>Geplant / Woche</th>
                <th>Gleitzeit aktuell</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((person) => (
                <tr key={person.id}>
                  <td>
                    <div className={styles.person}>
                      <span
                        className={styles.avatar}
                        style={{ background: person.color }}
                      >
                        {person.initials}
                      </span>
                      {person.name}
                    </div>
                  </td>
                  <td>
                    {person.skills.map((item) => (
                      <span className={styles.skill} key={item}>
                        {item}
                      </span>
                    ))}
                  </td>
                  <td className="min-w-32 text-[11px]!">
                    {person.locations
                      .map(
                        (id) =>
                          PLANNING_LOCATIONS.find((item) => item.id === id)
                            ?.name,
                      )
                      .join(", ")}
                  </td>
                  <td className="whitespace-nowrap">{person.weeklyHours} h</td>
                  <td className="whitespace-nowrap">
                    {planningHours(weeklyMinutes(shifts, person.id, week))} h
                  </td>
                  <td
                    className={`whitespace-nowrap ${person.balanceHours >= 0 ? "text-emerald-600!" : "text-[#aa7b46]!"}`}
                  >
                    {person.balanceHours > 0 ? "+" : ""}
                    {person.balanceHours.toLocaleString("de-DE")} h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!employees.length && (
          <p className={styles.emptyState}>
            Keine Mitarbeitenden für diesen Filter.
          </p>
        )}
        <p className="px-4 py-3 text-[10px] text-[#aaa1b3]">
          Geplante Stunden für die Woche ab {planningDate(week)}. Die Gleitzeit
          ist ein Beispiel für den aktuellen Saldo und wird durch geplante
          Dienste nicht verändert.
        </p>
      </section>
      <div className={styles.ruleGrid}>
        <section className={styles.summary}>
          <h3 className={styles.ruleTitle}>
            <GraduationCap size={16} />
            Kompetenzen & Filialen
          </h3>
          <p className={styles.muted}>
            Backstube braucht Backkompetenz. Der Frühdienst braucht Verkauf und
            Schlüssel. Eine Zuordnung ist nur in den hinterlegten Filialen
            möglich.
          </p>
        </section>
        <section className={styles.summary}>
          <h3 className={styles.ruleTitle}>
            <BedDouble size={16} />
            Ruhe & Abwesenheiten
          </h3>
          <p className={styles.muted}>
            Mindestens 11 Stunden zwischen Diensten. Urlaub sperrt die Person an
            den hinterlegten Tagen. Höchstens ein Dienst pro Tag.
          </p>
        </section>
        <section className={styles.summary}>
          <h3 className={styles.ruleTitle}>
            <Clock3 size={16} />
            Stunden im Blick
          </h3>
          <p className={styles.muted}>
            30 Minuten Pause je Dienst, höchstens 40 geplante Stunden pro Woche.
            Vertragliches Soll und aktuelle Gleitzeit werden getrennt angezeigt.
          </p>
        </section>
      </div>
      <section className={`${styles.board} mt-4`}>
        <div className={styles.boardToolbar}>
          <h3 className="text-xs font-medium text-stone-500">
            Hinterlegte Abwesenheiten
          </h3>
        </div>
        <div className={styles.agenda}>
          {PLANNING_ABSENCES.map((absence) => (
            <div className={styles.agendaRow} key={absence.employeeId}>
              <span className="min-w-32 font-medium text-[#82718e]">
                {
                  PLANNING_EMPLOYEES.find(
                    (person) => person.id === absence.employeeId,
                  )?.name
                }
              </span>
              <span className="text-xs text-stone-400">
                {planningDate(absence.from)} – {planningDate(absence.to)}
              </span>
              <span className={`${styles.skill} ml-auto`}>{absence.label}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
