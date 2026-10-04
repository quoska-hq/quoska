"use client";
import {
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  LockKeyhole,
  Printer,
  Sparkles,
  Users,
} from "lucide-react";
import { PLANNING_STATUS } from "@/config/planning-preview";
import { Button } from "@/components/ui/button";
import type {
  PlanningState,
  PlanningMonth,
  PlanningTab,
} from "@/types/planning-preview";
import styles from "./planning-preview.module.css";

const TABS = [
  { id: "plan", name: "Dienstplan", icon: CalendarDays },
  { id: "team", name: "Team & Regeln", icon: Users },
  { id: "mine", name: "Meine Dienste", icon: Clock3 },
] as const;

export function PlanningControls({
  state,
  month,
  tab,
  standalone,
  onProposal,
  onPublish,
  onInfo,
  onMonth,
  onTab,
}: {
  state: PlanningState;
  month: PlanningMonth;
  tab: PlanningTab;
  standalone: boolean;
  onProposal: () => void;
  onPublish: () => void;
  onInfo: () => void;
  onMonth: (id: string) => void;
  onTab: (tab: PlanningTab) => void;
}) {
  const monthId = month.id;
  return (
    <>
      <div className={styles.header}>
        <div>
          <div className={`${styles.eyebrow} mb-2`}>Gemeinsam gut geplant</div>
          <h1 className={styles.title}>Dienstplanung</h1>
          <p className={styles.subtitle}>
            Zwei Filialen. Ein Team. Die nächsten drei Monate im Blick.
          </p>
        </div>
        <div className={styles.actions}>
          <Button
            variant="outline"
            size="icon"
            className={styles.secondary}
            aria-label="Plan drucken"
            onClick={() => window.print()}
          >
            <Printer size={15} />
          </Button>
          <Button
            variant="outline"
            className={styles.secondary}
            disabled={month.status === "fixed"}
            onClick={onProposal}
          >
            <Sparkles size={15} />
            Planungsvorschlag
          </Button>
          <Button
            className={styles.primary}
            disabled={month.status === "fixed"}
            onClick={onPublish}
          >
            {month.status === "draft" ? (
              "Monat ankündigen"
            ) : month.status === "fixed" ? (
              <>
                <LockKeyhole size={14} />
                Verbindlich
              </>
            ) : (
              "Monat freigeben"
            )}
            {month.status !== "fixed" && <ChevronRight size={14} />}
          </Button>
        </div>
      </div>
      {!standalone && (
        <button
          className={`${styles.previewBadge} mb-4`}
          onClick={() => onInfo()}
        >
          Vorabversion · Beispieldaten
        </button>
      )}
      <div className={styles.months} aria-label="Planungshorizont">
        {state.months.map((item) => {
          const status = PLANNING_STATUS[item.status];
          const open = state.shifts.filter(
            (entry) => entry.date.startsWith(item.id) && !entry.employeeId,
          ).length;
          return (
            <button
              key={item.id}
              className={styles.month}
              data-active={monthId === item.id}
              aria-pressed={monthId === item.id}
              onClick={() => onMonth(item.id)}
              aria-label={`${item.name} ${item.id.slice(0, 4)}, ${status.label}`}
            >
              <div className={styles.monthHeading}>
                <span>
                  {item.name}{" "}
                  <span className="block font-normal text-stone-400 sm:inline">
                    {item.id.slice(0, 4)}
                  </span>
                </span>
                <span className={`${styles.pill} ${status.color}`}>
                  {item.status === "fixed" ? (
                    <LockKeyhole size={10} />
                  ) : item.status === "announced" ? (
                    <CheckCheck size={11} />
                  ) : (
                    <span className="h-1 w-1 rounded-full bg-current" />
                  )}
                  {status.label}
                </span>
              </div>
              <div className={styles.monthDetail}>
                {open ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#c8a967]" />
                    {open} {open === 1 ? "offene Schicht" : "offene Schichten"}
                  </>
                ) : (
                  <>
                    <Check size={11} />
                    {status.detail}
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <div
        role="tablist"
        aria-label="Planungsansichten"
        className={styles.tabs}
      >
        {TABS.map((item) => (
          <button
            role="tab"
            id={`planning-tab-${item.id}`}
            aria-controls="planning-panel"
            aria-selected={tab === item.id}
            data-active={tab === item.id}
            key={item.id}
            onClick={() => onTab(item.id)}
          >
            <item.icon size={13} />
            {item.name}
            {item.id === "team" && (
              <span className="hidden rounded bg-[#e9e5f1] px-1 text-[9px] text-[#9c8db5] sm:inline">
                12
              </span>
            )}
          </button>
        ))}
      </div>
    </>
  );
}
