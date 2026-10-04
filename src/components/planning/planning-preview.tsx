"use client";

import { useEffect, useState } from "react";
import { Check, LockKeyhole } from "lucide-react";
import { PlanningControls } from "./planning-controls";
import {
  advancePlanningMonth,
  applyPlanningProposal,
  initialPlanningState,
  planningWeek,
  proposePlanning,
  reassignPlanningShift,
  rollPlanningHorizon,
  swapPlanningShifts,
} from "@/services/planningPreviewService";
import type {
  PlanningProposal,
  PlanningShift,
  PlanningTab,
} from "@/types/planning-preview";
import { PlanningCalendar } from "./planning-calendar";
import {
  PlanningHorizonDialog,
  PlanningInfoDialog,
  PlanningProposalDialog,
  PlanningPublishDialog,
} from "./planning-action-dialogs";
import { PlanningMine } from "./planning-mine";
import { PlanningShell } from "./planning-shell";
import { PlanningShiftDialog } from "./planning-shift-dialog";
import { PlanningSummary } from "./planning-summary";
import { PlanningTeam } from "./planning-team";
import styles from "./planning-preview.module.css";

export function PlanningPreview({
  standalone = true,
}: {
  standalone?: boolean;
}) {
  const [state, setState] = useState(initialPlanningState);
  const [monthId, setMonthId] = useState("2026-11");
  const [week, setWeek] = useState("2026-11-02");
  const [location, setLocation] = useState("all");
  const [tab, setTab] = useState<PlanningTab>("plan");
  const [shift, setShift] = useState<PlanningShift | null>(null);
  const [proposal, setProposal] = useState<PlanningProposal | null>(null);
  const [action, setAction] = useState<"info" | "publish" | "horizon" | null>(
    null,
  );
  const [publishError, setPublishError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const month = state.months.find((item) => item.id === monthId)!;

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 4500);
    return () => clearTimeout(timer);
  }, [message]);

  function selectMonth(id: string) {
    setMonthId(id);
    setWeek(planningWeek(`${id}-07`));
    setProposal(null);
    setShift(null);
    setAction(null);
  }

  function reset() {
    setState(initialPlanningState());
    setMonthId("2026-11");
    setWeek("2026-11-02");
    setLocation("all");
    setTab("plan");
    setShift(null);
    setProposal(null);
    setAction(null);
    setMessage("Das Beispiel wurde zurückgesetzt.");
  }

  const content = (
    <>
      <PlanningControls
        state={state}
        month={month}
        tab={tab}
        standalone={standalone}
        onProposal={() => {
          setTab("plan");
          setProposal(proposePlanning(state, monthId));
        }}
        onPublish={() => {
          setPublishError(null);
          setAction("publish");
        }}
        onInfo={() => setAction("info")}
        onMonth={selectMonth}
        onTab={setTab}
      />
      <div
        id="planning-panel"
        role="tabpanel"
        aria-labelledby={`planning-tab-${tab}`}
      >
        {tab === "plan" && (
          <>
            {month.status === "fixed" && (
              <div className={styles.notice}>
                <LockKeyhole size={15} />
                {month.name} ist verbindlich freigegeben. Du kannst die Dienste
                ansehen; Zuordnungen und automatische Vorschläge sind gesperrt.
              </div>
            )}
            <PlanningCalendar
              month={month}
              shifts={state.shifts}
              week={week}
              location={location}
              onWeek={setWeek}
              onLocation={setLocation}
              onShift={setShift}
            />
            <PlanningSummary
              month={month}
              shifts={state.shifts}
              location={location}
              onShift={setShift}
            />
          </>
        )}
        {tab === "team" && <PlanningTeam shifts={state.shifts} week={week} />}
        {tab === "mine" && (
          <PlanningMine
            key={monthId}
            state={state}
            month={month}
            onSwap={(firstId, secondId) => {
              const result = swapPlanningShifts(state, firstId, secondId);
              if (!result.error) {
                setState(result.state);
                setMessage(
                  "Beispieltausch übernommen. Beide Dienste wurden neu zugeordnet.",
                );
              }
              return result.error;
            }}
          />
        )}
      </div>
      {shift && (
        <PlanningShiftDialog
          key={shift.id}
          shift={shift}
          state={state}
          onClose={() => setShift(null)}
          onSave={(employeeId, locked) => {
            const result = reassignPlanningShift(
              state,
              shift.id,
              employeeId,
              locked,
            );
            if (!result.error) {
              setState(result.state);
              setMessage("Die Zuordnung wurde aktualisiert.");
            }
            return result.error;
          }}
        />
      )}
      {proposal && (
        <PlanningProposalDialog
          proposal={proposal}
          month={month}
          state={state}
          onClose={() => setProposal(null)}
          onApply={() => {
            setState(applyPlanningProposal(state, monthId, proposal));
            setProposal(null);
            setMessage("Der Planungsvorschlag wurde übernommen.");
          }}
        />
      )}
      {action === "publish" && (
        <PlanningPublishDialog
          month={month}
          error={publishError}
          onClose={() => setAction(null)}
          onPublish={() => {
            const result = advancePlanningMonth(state, monthId);
            if (result.error) setPublishError(result.error);
            else {
              setState(result.state);
              setAction(null);
              setMessage(
                month.status === "draft"
                  ? "Der Monat ist jetzt für das Team angekündigt."
                  : "Der Monat wurde verbindlich freigegeben.",
              );
            }
          }}
        />
      )}
      {action === "info" && (
        <PlanningInfoDialog onClose={() => setAction(null)} />
      )}
      {action === "horizon" && (
        <PlanningHorizonDialog
          state={state}
          onClose={() => setAction(null)}
          onRoll={() => {
            const result = rollPlanningHorizon(state);
            if (!result.error) {
              setState(result.state);
              selectMonth(result.state.months.at(-1)!.id);
              setMessage("Der nächste Monat wurde als Entwurf ergänzt.");
            }
          }}
        />
      )}
      {message && (
        <div className={styles.toast} role="status">
          <Check size={14} />
          {message}
          <button
            onClick={() => setMessage(null)}
            aria-label="Hinweis schließen"
            className="ml-2 text-white/50"
          >
            ×
          </button>
        </div>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 text-[10px] text-[#afa6b7]">
        <span>Bäckerei Morgenrot · erfundener Beispielbetrieb</span>
        <div className="flex gap-4">
          <button
            onClick={() => setAction("horizon")}
            className="cursor-pointer underline underline-offset-4"
          >
            Monatswechsel simulieren
          </button>
          <button
            onClick={reset}
            className="cursor-pointer underline underline-offset-4"
          >
            Beispiel zurücksetzen
          </button>
        </div>
      </div>
    </>
  );

  return standalone ? (
    <PlanningShell
      tab={tab}
      onTab={setTab}
      onInfo={() => setAction("info")}
      onReset={reset}
    >
      {content}
    </PlanningShell>
  ) : (
    <div className={styles.shell}>{content}</div>
  );
}
