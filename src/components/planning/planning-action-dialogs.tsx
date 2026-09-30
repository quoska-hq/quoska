"use client";

import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";
import {
  PLANNING_EMPLOYEES,
  PLANNING_LOCATIONS,
} from "@/config/planning-preview";
import {
  getPlanningTemplate,
  planningDate,
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
  PlanningProposal,
  PlanningState,
} from "@/types/planning-preview";
import styles from "./planning-preview.module.css";

export function PlanningProposalDialog({
  proposal,
  month,
  state,
  onClose,
  onApply,
}: {
  proposal: PlanningProposal;
  month: PlanningMonth;
  state: PlanningState;
  onClose: () => void;
  onApply: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="rounded-xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={19} className="text-[#8874c6]" />
            Vorschlag für {month.name}
          </DialogTitle>
          <DialogDescription>
            Prüfe die Änderungen, bevor du sie in den Plan übernimmst.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className={styles.dialogInfo}>
            <strong className="block text-2xl text-[#6854a8]">
              {proposal.changes.length}
            </strong>
            offene Dienste werden besetzt
          </div>
          <div className={styles.dialogInfo}>
            <strong className="block text-2xl">{proposal.remaining}</strong>
            Dienste bleiben offen
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto rounded-lg border border-[#e8e1ee]">
          {proposal.changes.map((change) => {
            const shift = state.shifts.find(
              (item) => item.id === change.shiftId,
            )!;
            const employee = PLANNING_EMPLOYEES.find(
              (item) => item.id === change.employeeId,
            )!;
            return (
              <div
                className="flex items-center gap-3 border-b border-[#f0ebf5] px-3 py-3 text-xs last:border-0"
                key={change.shiftId}
              >
                <div className="flex-1">
                  <strong className="block font-medium text-[#716280]">
                    {planningDate(shift.date)} ·{" "}
                    {getPlanningTemplate(shift.templateId).name}
                  </strong>
                  <span className="mt-1 block text-[10px] text-stone-400">
                    {
                      PLANNING_LOCATIONS.find(
                        (item) => item.id === shift.locationId,
                      )?.name
                    }
                  </span>
                </div>
                <ArrowRight size={13} className="text-stone-300" />
                <span
                  className={styles.avatar}
                  style={{ background: employee.color }}
                >
                  {employee.initials}
                </span>
                {employee.name}
              </div>
            );
          })}
          {!proposal.changes.length && (
            <p className={styles.emptyState}>
              {proposal.remaining
                ? "Für die offenen Dienste ist keine passende Zuordnung verfügbar."
                : "Alle Dienste sind bereits besetzt."}
            </p>
          )}
        </div>
        <p className="flex items-start gap-2 text-xs leading-relaxed text-[#a297ae]">
          <LockKeyhole size={14} className="mt-0.5 shrink-0" />
          Bestehende Zuordnungen und fixierte Dienste bleiben erhalten. Die
          Vorabversion nutzt eine vereinfachte Beispielplanung.
        </p>
        <DialogFooter>
          <Button
            variant="outline"
            className={styles.secondary}
            onClick={onClose}
          >
            Verwerfen
          </Button>
          <Button
            className={styles.primary}
            disabled={!proposal.changes.length}
            onClick={onApply}
          >
            Vorschlag übernehmen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PlanningPublishDialog({
  month,
  error,
  onClose,
  onPublish,
}: {
  month: PlanningMonth;
  error: string | null;
  onClose: () => void;
  onPublish: () => void;
}) {
  const draft = month.status === "draft";
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="rounded-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {month.name} {draft ? "ankündigen" : "verbindlich freigeben"}
          </DialogTitle>
          <DialogDescription>
            {draft
              ? "Der Plan wird in der Mitarbeiteransicht sichtbar. Änderungen und Tausch sind weiterhin möglich."
              : "Alle Zuordnungen dieses Monats werden verbindlich. Die Planung und der Schichttausch werden gesperrt."}
          </DialogDescription>
        </DialogHeader>
        <p className={styles.dialogInfo}>
          In dieser Vorabversion ändert sich nur der Beispielplan. Es werden
          keine Benachrichtigungen an Mitarbeitende versendet.
        </p>
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
            Abbrechen
          </Button>
          <Button className={styles.primary} onClick={onPublish}>
            {draft ? "Monat ankündigen" : "Verbindlich freigeben"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PlanningHorizonDialog({
  state,
  onClose,
  onRoll,
}: {
  state: PlanningState;
  onClose: () => void;
  onRoll: () => void;
}) {
  const ready = state.months[1].status === "fixed";
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="rounded-xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Monatswechsel simulieren</DialogTitle>
          <DialogDescription>
            Der Planungshorizont bleibt bei drei Monaten.
          </DialogDescription>
        </DialogHeader>
        <div className={styles.dialogInfo}>
          {state.months[0].name} verlässt die aktuelle Ansicht.{" "}
          {state.months[1].name} wird zum ersten verbindlichen Monat. Am Ende
          wird ein neuer Monat berechnet und als Entwurf ergänzt. Bestehende
          Dienste bleiben erhalten.
        </div>
        {!ready && (
          <p className="text-xs leading-relaxed text-amber-700">
            Bitte zuerst {state.months[1].name} vollständig besetzen und
            verbindlich freigeben. Danach kannst du hier den nächsten Monat
            ergänzen.
          </p>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            className={styles.secondary}
            onClick={onClose}
          >
            Abbrechen
          </Button>
          <Button disabled={!ready} className={styles.primary} onClick={onRoll}>
            Nächsten Monat ergänzen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PlanningInfoDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="rounded-xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Dienstplanung in Quoska</DialogTitle>
          <DialogDescription>
            Eine interaktive Vorabversion mit einem erfundenen Betrieb.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm leading-relaxed text-[#81758f]">
          <p>
            Du kannst Wochen und Filialen ansehen, Dienste zuordnen,
            Planungsvorschläge übernehmen, Monate ankündigen oder sperren und
            Dienste in der Mitarbeiteransicht tauschen. „Monatswechsel
            simulieren“ ergänzt den nächsten Monat.
          </p>
          <p>
            Die Beispielprüfung berücksichtigt Kompetenzen, Filialzuordnung,
            Urlaub, 11 Stunden Ruhezeit und maximal 40 geplante Wochenstunden.
          </p>
          <p>
            Die vollständige Optimierung, echte Mitarbeiterdaten,
            Arbeitszeitkonten, Berechtigungen und Benachrichtigungen sind noch
            nicht angebunden. Die Vorschau ist kein Nachweis der
            arbeitsrechtlichen Zulässigkeit.
          </p>
          <p className="rounded-lg bg-[#f4f1f8] p-3 text-xs">
            Änderungen bleiben während dieser Sitzung im Browser. Neuladen oder
            „Beispiel zurücksetzen“ stellt die Ausgangsdaten wieder her.
          </p>
        </div>
        <DialogFooter>
          <Button className={styles.primary} onClick={onClose}>
            Vorschau erkunden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
