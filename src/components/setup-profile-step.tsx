"use client";

import { useState } from "react";
import type { SetupProfileInput } from "@/types/setup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SetupProfileStepProps {
  initialData: SetupProfileInput;
  email: string;
  onSubmit: (data: SetupProfileInput) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function SetupProfileStep({
  initialData,
  email,
  onSubmit,
  loading,
  error,
}: SetupProfileStepProps) {
  const [firstName, setFirstName] = useState(initialData.firstName);
  const [lastName, setLastName] = useState(initialData.lastName);
  const [employmentStartDate, setEmploymentStartDate] = useState(
    initialData.employmentStartDate,
  );
  const [initialOvertimeHours, setInitialOvertimeHours] = useState(
    String(initialData.initialOvertimeHours),
  );

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          employmentStartDate,
          initialOvertimeHours: Number(initialOvertimeHours) || 0,
        });
      }}
    >
      <div>
        <h2 className="text-lg font-semibold">Dein Profil</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          So sehen dich deine Mitarbeiter später in Quoska.
        </p>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="setup-first-name">Vorname</Label>
          <Input id="setup-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="setup-last-name">Nachname</Label>
          <Input id="setup-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="setup-email">E-Mail</Label>
        <Input id="setup-email" value={email} disabled />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="setup-employment-start">Eintrittsdatum</Label>
          <Input
            id="setup-employment-start"
            type="date"
            value={employmentStartDate}
            onChange={(event) => setEmploymentStartDate(event.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">Ab diesem Tag wird Sollzeit berechnet.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="setup-overtime-balance">Überstunden-Startsaldo</Label>
          <div className="relative">
            <Input
              id="setup-overtime-balance"
              type="number"
              step="0.25"
              value={initialOvertimeHours}
              onChange={(event) => setInitialOvertimeHours(event.target.value)}
              className="pr-16"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
              Stunden
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Negative Werte sind möglich.</p>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading || !firstName.trim() || !lastName.trim() || !employmentStartDate}>
        {loading ? "Wird gespeichert…" : "Weiter"}
      </Button>
    </form>
  );
}
