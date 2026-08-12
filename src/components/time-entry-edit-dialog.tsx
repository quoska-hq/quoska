/**
 * TimeEntryEditDialog — Manager edit dialog for time entries.
 *
 * Allows managers to edit clock_in, clock_out, break_minutes, notes
 * with a mandatory reason field (min 5 chars).
 * Shows audit trail via AuditTrailDialog.
 */

"use client";

import { useState } from "react";
import type { TimeEntry } from "@/types/database";
import { AuditTrailDialog } from "@/components/audit-trail-dialog";
import {
  Dialog,
  DialogContent,
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
  isGermanTime,
  isoToBerlinDateTime,
} from "@/config/client/date-utils";

interface TimeEntryEditDialogProps {
  entry: TimeEntry;
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
  const originalClockIn = isoToBerlinDateTime(entry.clock_in);
  const originalClockOut = entry.clock_out ? isoToBerlinDateTime(entry.clock_out) : null;
  const [clockInDate, setClockInDate] = useState(originalClockIn.date);
  const [clockInTime, setClockInTime] = useState(originalClockIn.time);
  const [clockOutDate, setClockOutDate] = useState(originalClockOut?.date ?? entry.date);
  const [clockOutTime, setClockOutTime] = useState(originalClockOut?.time ?? "");
  const [breakMinutes, setBreakMinutes] = useState(String(entry.break_minutes));
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);

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

      onSaved();
      onClose();
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
      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Zeiteintrag bearbeiten</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

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
              <Label>Pause (Minuten)</Label>
              <Input
                type="number"
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

            <div className="space-y-2">
              <Label>Notizen</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <Label>
                Grund <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={reason}
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

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Abbrechen
            </DialogClose>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Speichern..." : "Speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
