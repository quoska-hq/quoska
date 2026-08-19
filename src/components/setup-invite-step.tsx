"use client";

import { FREE_PLAN_EMPLOYEE_LIMIT } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getLocalToday } from "@/config/client/date-utils";

interface InviteRow {
  firstName: string;
  lastName: string;
  email: string;
  employmentStartDate: string;
  initialOvertimeHours: number;
}

interface InviteStepProps {
  invites: InviteRow[];
  setInvites: (invites: InviteRow[]) => void;
  onSubmit: () => Promise<void>;
  onBack: () => void;
  loading: boolean;
  error: string | null;
}

export function InviteStep({
  invites,
  setInvites,
  onSubmit,
  onBack,
  loading,
  error,
}: InviteStepProps) {
  function addRow() {
    if (invites.length < FREE_PLAN_EMPLOYEE_LIMIT - 1) {
      setInvites([...invites, {
        firstName: "",
        lastName: "",
        email: "",
        employmentStartDate: getLocalToday(),
        initialOvertimeHours: 0,
      }]);
    }
  }

  function updateRow<K extends keyof InviteRow>(
    index: number,
    field: K,
    value: InviteRow[K],
  ) {
    const updated = [...invites];
    updated[index] = { ...updated[index], [field]: value };
    setInvites(updated);
  }

  function removeRow(index: number) {
    setInvites(invites.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Lade dein Team ein (optional). Max.{" "}
        {FREE_PLAN_EMPLOYEE_LIMIT - 1} weitere Mitarbeiter im kostenlosen
        Tarif.
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {invites.length === 0 && (
        <div className="border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
          <p className="text-sm font-medium">Du kannst diesen Schritt überspringen.</p>
          <p className="mt-1 text-xs text-muted-foreground">Mitarbeiter lassen sich jederzeit später hinzufügen.</p>
        </div>
      )}

      {invites.map((invite, index) => (
        <Card key={index} size="sm">
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Mitarbeiter {index + 1}
                </span>
                {invites.length > 0 && (
                  <Button
                    variant="link"
                    size="xs"
                    className="text-destructive px-0"
                    onClick={() => removeRow(index)}
                  >
                    Entfernen
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={invite.firstName}
                  onChange={(e) => updateRow(index, "firstName", e.target.value)}
                  placeholder="Vorname"
                />
                <Input
                  value={invite.lastName}
                  onChange={(e) => updateRow(index, "lastName", e.target.value)}
                  placeholder="Nachname"
                />
              </div>
              <Input
                value={invite.email}
                onChange={(e) => updateRow(index, "email", e.target.value)}
                placeholder="E-Mail"
                type="email"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`invite-start-${index}`}>Eintrittsdatum</Label>
                  <Input
                    id={`invite-start-${index}`}
                    type="date"
                    value={invite.employmentStartDate}
                    onChange={(e) => updateRow(index, "employmentStartDate", e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Beginn der Sollzeitberechnung</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`invite-overtime-${index}`}>Startsaldo (Std.)</Label>
                  <Input
                    id={`invite-overtime-${index}`}
                    type="number"
                    step="0.25"
                    value={invite.initialOvertimeHours}
                    onChange={(e) => updateRow(
                      index,
                      "initialOvertimeHours",
                      Number(e.target.value) || 0,
                    )}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {invites.length < FREE_PLAN_EMPLOYEE_LIMIT - 1 && (
        <Button
          variant="outline"
          className="w-full border-dashed"
          onClick={addRow}
        >
          + Mitarbeiter hinzufügen
        </Button>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onBack}
        >
          Zurück
        </Button>
        <Button
          className="flex-1"
          onClick={onSubmit}
          disabled={loading}
        >
          {loading ? "Wird gespeichert..." : invites.length === 0 ? "Ohne Einladungen weiter" : "Weiter zur Übersicht"}
        </Button>
      </div>
    </div>
  );
}
