/**
 * CorrectionRequestDialog — Employee correction request form.
 *
 * Allows employees to submit a correction request for one of their
 * time entries with a description of the proposed change.
 */

"use client";

import { useState } from "react";
import type { TimeEntry } from "@/types/database";
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
import { Card, CardContent } from "@/components/ui/card";
import { GermanDateTimeFields } from "@/components/german-date-time-fields";
import {
  berlinDateTimeToIso,
  formatDateFullDE,
  formatTimeLocal,
  isGermanTime,
  isoToBerlinDateTime,
} from "@/config/client/date-utils";

interface CorrectionRequestDialogProps {
  entry: TimeEntry;
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export function CorrectionRequestDialog({
  entry,
  open,
  onClose,
  onSubmitted,
}: CorrectionRequestDialogProps) {
  const originalClockIn = isoToBerlinDateTime(entry.clock_in);
  const originalClockOut = entry.clock_out ? isoToBerlinDateTime(entry.clock_out) : null;
  const [proposedClockInDate, setProposedClockInDate] = useState(originalClockIn.date);
  const [proposedClockInTime, setProposedClockInTime] = useState("");
  const [proposedClockOutDate, setProposedClockOutDate] = useState(
    originalClockOut?.date ?? entry.date,
  );
  const [proposedClockOutTime, setProposedClockOutTime] = useState("");
  const [proposedBreak, setProposedBreak] = useState("");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    if (!reason.trim()) {
      setError("Ein Grund ist für die Korrektur erforderlich");
      return;
    }

    // Build proposed change object (only include changed fields)
    const proposedChange: Record<string, unknown> = {};

    if (
      (proposedClockInTime && !isGermanTime(proposedClockInTime)) ||
      (proposedClockOutTime && !isGermanTime(proposedClockOutTime))
    ) {
      setError("Bitte gib Uhrzeiten im Format HH:MM ein, zum Beispiel 08:30");
      return;
    }

    if (proposedClockInTime) {
      if (!proposedClockInDate) {
        setError("Bitte wähle ein Datum für den neuen Beginn");
        return;
      }
      proposedChange.clock_in = berlinDateTimeToIso(
        proposedClockInDate, proposedClockInTime,
      );
    }
    if (proposedClockOutTime) {
      if (!proposedClockOutDate) {
        setError("Bitte wähle ein Datum für das neue Ende");
        return;
      }
      proposedChange.clock_out = berlinDateTimeToIso(
        proposedClockOutDate, proposedClockOutTime,
      );
    }
    if (proposedBreak !== "") {
      proposedChange.break_minutes = parseInt(proposedBreak) || 0;
    }

    if (Object.keys(proposedChange).length === 0) {
      setError("Bitte gib mindestens eine Änderung an");
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch("/api/v1/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          time_entry_id: entry.id,
          proposed_change: proposedChange,
          reason: reason.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error ?? "Fehler beim Absenden");
        return;
      }

      onSubmitted();
      onClose();
    } catch {
      setError("Verbindung fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Korrektur anfordern</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card size="sm">
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Aktueller Eintrag am {formatDateFullDE(entry.date)}:{" "}
                {entry.clock_in ? formatTimeLocal(entry.clock_in) : "–"}
                {" – "}
                {entry.clock_out ? formatTimeLocal(entry.clock_out) : "laufend"}
                {entry.break_minutes > 0 && ` · Pause: ${entry.break_minutes} Min`}
              </p>
            </CardContent>
          </Card>

          <p className="text-sm text-muted-foreground">
            Welche Werte sollen korrigiert werden?
          </p>

          <GermanDateTimeFields
            id="correction-clock-in"
            label="Neuer Beginn (optional)"
            date={proposedClockInDate}
            time={proposedClockInTime}
            onDateChange={setProposedClockInDate}
            onTimeChange={setProposedClockInTime}
          />

          <GermanDateTimeFields
            id="correction-clock-out"
            label="Neues Ende (optional)"
            date={proposedClockOutDate}
            time={proposedClockOutTime}
            onDateChange={setProposedClockOutDate}
            onTimeChange={setProposedClockOutTime}
          />

          <div className="space-y-2">
            <Label>Neue Pause in Minuten (optional)</Label>
            <Input
              type="number"
              min="0"
              value={proposedBreak}
              onChange={(e) => setProposedBreak(e.target.value)}
              placeholder={String(entry.break_minutes)}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Grund <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="z.B. Ausstempeln war 17:00, nicht 16:00"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Abbrechen
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Senden..." : "Anfragen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
