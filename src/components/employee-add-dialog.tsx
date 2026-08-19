/**
 * EmployeeAddDialog — Modal form to invite a new employee.
 *
 * Uses useMutation to POST /api/v1/employees.
 * All UI text in German (de-DE).
 */

"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BUNDESLAENDER, BUNDESLAND_LABELS, getBundeslandLabel } from "@/types/tenant";
import type { Bundesland } from "@/types/tenant";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WorkScheduleEditor } from "@/components/work-schedule-editor";
import { ROLE_LABELS, ROLE_OPTIONS, type Role } from "@/types/employee";
import {
  DEFAULT_WORK_SCHEDULE,
  normalizeWorkSchedule,
  scheduleHours,
  type WorkSchedule,
} from "@/types/work-schedule";

interface EmployeeAddDialogProps {
  defaultBundesland: string | null;
  defaultWorkSchedule: WorkSchedule | null;
  defaultEmploymentStartDate: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function EmployeeAddDialog({
  defaultBundesland,
  defaultWorkSchedule,
  defaultEmploymentStartDate,
  onClose,
  onSuccess,
}: EmployeeAddDialogProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("employee");
  const [workSchedule, setWorkSchedule] = useState<WorkSchedule>(
    normalizeWorkSchedule(defaultWorkSchedule ?? DEFAULT_WORK_SCHEDULE),
  );
  const [bundesland, setBundesland] = useState(defaultBundesland ?? "");
  const [employmentStartDate, setEmploymentStartDate] = useState(
    defaultEmploymentStartDate,
  );
  const [initialOvertimeHours, setInitialOvertimeHours] = useState("0");
  const [workScheduleValid, setWorkScheduleValid] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          role,
          targetHoursWeek: scheduleHours(workSchedule),
          workSchedule,
          employmentStartDate,
          initialOvertimeMinutes: Math.round((Number(initialOvertimeHours) || 0) * 60),
          bundesland: bundesland || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fehler beim Hinzufügen");
      return json;
    },
    onSuccess,
    onError: (err) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    mutation.mutate();
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Mitarbeiter hinzufügen</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-firstName">Vorname</Label>
            <Input
              id="add-firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-lastName">Nachname</Label>
            <Input
              id="add-lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-email">E-Mail</Label>
            <Input
              id="add-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-role">Rolle</Label>
            <Select value={role} onValueChange={(v) => { if (v !== null) setRole(v as Role); }}>
              <SelectTrigger id="add-role" className="w-full">
                <SelectValue>{ROLE_LABELS[role]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((roleOption) => (
                  <SelectItem key={roleOption} value={roleOption}>
                    {ROLE_LABELS[roleOption]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="add-employment-start">Eintrittsdatum</Label>
              <Input
                id="add-employment-start"
                type="date"
                value={employmentStartDate}
                onChange={(event) => setEmploymentStartDate(event.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Ab diesem Tag wird Sollzeit berechnet.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-overtime-balance">Überstunden-Startsaldo</Label>
              <Input
                id="add-overtime-balance"
                type="number"
                step="0.25"
                value={initialOvertimeHours}
                onChange={(event) => setInitialOvertimeHours(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">In Stunden; negative Werte sind möglich.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Arbeitszeit</Label>
            <WorkScheduleEditor
              value={workSchedule}
              onChange={setWorkSchedule}
              onValidityChange={setWorkScheduleValid}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-bundesland">Bundesland</Label>
            <Select value={bundesland} onValueChange={(v) => setBundesland(v ?? "")}>
              <SelectTrigger id="add-bundesland" className="w-full">
                <SelectValue placeholder="Nicht festgelegt">
                  {getBundeslandLabel(bundesland) || "Nicht festgelegt"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nicht festgelegt</SelectItem>
                {BUNDESLAENDER.map((bl: Bundesland) => (
                  <SelectItem key={bl} value={bl}>
                    {BUNDESLAND_LABELS[bl]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Abbrechen
            </DialogClose>
            <Button type="submit" disabled={mutation.isPending || !workScheduleValid}>
              {mutation.isPending ? "Wird hinzugefügt…" : "Einladen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
