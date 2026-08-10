/**
 * EmployeeEditDialog — Modal form to edit an existing employee.
 *
 * Uses useMutation to PATCH /api/v1/employees/[id].
 * All UI text in German (de-DE).
 */

"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { Employee } from "@/types/database";
import type { Bundesland } from "@/types/tenant";
import { BUNDESLAENDER, BUNDESLAND_LABELS, getBundeslandLabel } from "@/types/tenant";
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
import {
  normalizeWorkSchedule,
  scheduleHours,
  type WorkSchedule,
} from "@/types/work-schedule";

interface EmployeeEditDialogProps {
  employee: Employee;
  onClose: () => void;
  onSuccess: () => void;
}

export function EmployeeEditDialog({
  employee,
  onClose,
  onSuccess,
}: EmployeeEditDialogProps) {
  const [firstName, setFirstName] = useState(employee.first_name);
  const [lastName, setLastName] = useState(employee.last_name);
  const [role, setRole] = useState<Employee["role"]>(employee.role);
  const [workSchedule, setWorkSchedule] = useState<WorkSchedule>(
    normalizeWorkSchedule(employee.work_schedule, employee.target_hours_week),
  );
  const [bundesland, setBundesland] = useState<string>(
    employee.bundesland ?? "",
  );
  const [workScheduleValid, setWorkScheduleValid] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        first_name: firstName,
        last_name: lastName,
        role,
        target_hours_week: scheduleHours(workSchedule),
        work_schedule: workSchedule,
        bundesland: bundesland || null,
      };

      const res = await fetch(`/api/v1/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fehler beim Speichern");
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
          <DialogTitle>Mitarbeiter bearbeiten</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-firstName">Vorname</Label>
            <Input
              id="edit-firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-lastName">Nachname</Label>
            <Input
              id="edit-lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Rolle</Label>
            <Select value={role} onValueChange={(v) => { if (v !== null) setRole(v as Employee["role"]); }}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Mitarbeiter</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
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
            <Label>Bundesland</Label>
            <Select value={bundesland} onValueChange={(v) => setBundesland(v ?? "")}>
              <SelectTrigger className="w-full">
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
              {mutation.isPending ? "Wird gespeichert…" : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
