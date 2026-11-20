"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { TimeEntry } from "@/types/database";
import { AuditTrailDialog } from "@/components/audit-trail-dialog";
import { TimeEntryProjectField } from "@/components/time-entry-project-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GermanDateTimeFields } from "@/components/german-date-time-fields";
import {
  berlinDateTimeToIso,
  formatDateTimeDE,
  isGermanTime,
  isoToBerlinDateTime,
} from "@/config/client/date-utils";

interface TimeEntryEditDialogProps {
  entry: TimeEntry & { projectName?: string | null };
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function TimeEntryEditDialog({
  entry,
  open,
  onClose,
  onSaved,
}: TimeEntryEditDialogProps) {
  const queryClient = useQueryClient();
  const originalClockIn = isoToBerlinDateTime(entry.clock_in);
  const originalClockOut = entry.clock_out ? isoToBerlinDateTime(entry.clock_out) : null;
  const [clockInDate, setClockInDate] = useState(originalClockIn.date);
  const [clockInTime, setClockInTime] = useState(originalClockIn.time);
  const [clockOutDate, setClockOutDate] = useState(originalClockOut?.date ?? entry.date);
  const [clockOutTime, setClockOutTime] = useState(originalClockOut?.time ?? "");
  const [breakMinutes, setBreakMinutes] = useState(String(entry.break_minutes));
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [reason, setReason] = useState("");
  const [projectId, setProjectId] = useState(entry.project_id ?? null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  const refresh = () => {
    const keys = new Set([
      "myTimes", "employeeEntries", "auditTrail", "weeklyReport", "projectReport",
      "projects", "adminCockpit", "managerDashboard", "dashboard", "datev", "clockStatus", "corrections", "myCorrections",
    ]);
    void queryClient.invalidateQueries({
      predicate: ({ queryKey }) => typeof queryKey[0] === "string" && keys.has(queryKey[0]),
    });
    onSaved();
    onClose();
  };

  const handleSave = async () => {
    setError(null);

    if (reason.trim().length < 5) {
      setError("Ein Grund ist erforderlich (mindestens 5 Zeichen)");
      return;
    }
    if (!isGermanTime(clockInTime) || (clockOutTime && !isGermanTime(clockOutTime))) {
      setError("Bitte gib Uhrzeiten im Format HH:MM ein, zum Beispiel 08:30");
      return;
    }

    setIsSaving(true);

    try {
      const changes: Record<string, unknown> = {};

      if (clockInDate !== originalClockIn.date || clockInTime !== originalClockIn.time) {
        changes.clock_in = berlinDateTimeToIso(clockInDate, clockInTime);
      }
      if (
        clockOutDate !== (originalClockOut?.date ?? entry.date) ||
        clockOutTime !== (originalClockOut?.time ?? "")
      ) {
        changes.clock_out = clockOutTime
          ? berlinDateTimeToIso(clockOutDate, clockOutTime)
          : null;
      }
      if (parseInt(breakMinutes) !== entry.break_minutes) {
        changes.break_minutes = parseInt(breakMinutes) || 0;
      }
      if (notes !== (entry.notes ?? "")) {
        changes.notes = notes || null;
      }
      if (projectId !== (entry.project_id ?? null)) {
        changes.project_id = projectId;
      }

      if (Object.keys(changes).length === 0) {
        setError("Keine Änderungen erkannt");
        setIsSaving(false);
        return;
      }

      const res = await fetch(`/api/v1/time-entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...changes, reason: reason.trim() }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error ?? "Fehler beim Speichern");
        return;
      }

      refresh();
    } catch {
      setError("Verbindung fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEntry = async () => {
    setError(null);
    setIsSaving(true);
    try {
      const response = await fetch(`/api/v1/time-entries/${entry.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      const json = await response.json();
      if (!response.ok || json.error) {
        setError(json.error ?? "Der Zeiteintrag konnte nicht storniert werden.");
        return;
      }
      refresh();
    } catch {
      setError("Verbindung fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <AuditTrailDialog
        timeEntryId={entry.id}
        open={showAudit}
        onClose={() => setShowAudit(false)}
      />
      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && !isSaving) onClose(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmCancel ? "Zeiteintrag stornieren" : "Zeiteintrag bearbeiten"}</DialogTitle>
            {confirmCancel && (
              <DialogDescription>
                Der Eintrag vom {formatDateTimeDE(entry.clock_in)} Uhr entfällt aus dem Arbeitszeitkonto
                und den Berichten. Der Verlauf bleibt abrufbar.
              </DialogDescription>
            )}
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {confirmCancel ? (
            <div className="space-y-2">
              <Label htmlFor="cancel-entry-reason">Grund für das Storno</Label>
              <Textarea id="cancel-entry-reason" value={cancelReason} maxLength={500}
                onChange={(event) => setCancelReason(event.target.value)} rows={2} />
            </div>
          ) : (
            <div className="space-y-4">
              <GermanDateTimeFields
                id="edit-clock-in"
                label="Einstempeln"
                date={clockInDate}
                time={clockInTime}
                onDateChange={setClockInDate}
                onTimeChange={setClockInTime}
              />

              <GermanDateTimeFields
                id="edit-clock-out"
                label="Ausstempeln"
                date={clockOutDate}
                time={clockOutTime}
                onDateChange={setClockOutDate}
                onTimeChange={setClockOutTime}
              />

              <div className="space-y-2">
                <Label htmlFor="edit-break-minutes">Pause (Minuten)</Label>
                <Input
                  id="edit-break-minutes" type="number"
                  min="0"
                  value={breakMinutes}
                  onChange={(e) => setBreakMinutes(e.target.value)}
                />
                {(entry.automatic_break_minutes ?? 0) > 0 && (
                  <p className="text-xs text-violet-700">
                    Davon wurden {entry.automatic_break_minutes} Minuten automatisch ergänzt.
                    Beim manuellen Speichern wird diese Kennzeichnung zurückgesetzt.
                  </p>
                )}
              </div>

              {entry.status === "completed" && (
                <TimeEntryProjectField entry={entry} open={open} value={projectId}
                  onValueChange={setProjectId} disabled={isSaving} />
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-entry-notes">Notizen</Label>
                <Textarea
                  id="edit-entry-notes" value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  maxLength={500}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-entry-reason">
                  Grund <span aria-hidden="true" className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="edit-entry-reason" value={reason} aria-required="true"
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="z.B. Uhrenabweichung korrigiert"
                />
                {reason.length > 0 && reason.length < 5 && (
                  <p className="text-xs text-destructive mt-1">
                    Mindestens 5 Zeichen erforderlich
                  </p>
                )}
              </div>

              <Button
                type="button"
                variant="link"
                onClick={() => setShowAudit(true)}
                className="px-0"
              >
                Verlauf anzeigen →
              </Button>
            </div>
          )}

          {confirmCancel ? (
            <DialogFooter>
              <Button variant="outline" disabled={isSaving} onClick={() => {
                setConfirmCancel(false);
                setError(null);
              }}>Zurück</Button>
              <Button variant="destructive" onClick={handleCancelEntry}
                disabled={isSaving || cancelReason.trim().length < 5}>
                {isSaving ? "Wird storniert…" : "Eintrag stornieren"}
              </Button>
            </DialogFooter>
          ) : (
            <DialogFooter>
              {entry.status === "completed" && !entry.deleted_at && (
                <Button variant="ghost" className="text-destructive sm:mr-auto" disabled={isSaving}
                  onClick={() => { setConfirmCancel(true); setError(null); }}>
                  Stornieren
                </Button>
              )}
              <DialogClose render={<Button variant="outline" disabled={isSaving} />}>
                Abbrechen
              </DialogClose>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Speichern…" : "Speichern"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
