/**
 * EmployeeEditDialog — Modal form to edit an existing employee.
 *
 * Uses useMutation to PATCH /api/v1/employees/[id].
 * All UI text in German (de-DE).
 */

"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import type { Employee } from "@/types/database";
import type { LeaveBalance } from "@/types/leave";
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
import { ROLE_LABELS, ROLE_OPTIONS } from "@/types/employee";
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
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState(employee.first_name);
  const [lastName, setLastName] = useState(employee.last_name);
  const [role, setRole] = useState<Employee["role"]>(employee.role);
  const [workSchedule, setWorkSchedule] = useState<WorkSchedule>(
    normalizeWorkSchedule(employee.work_schedule, employee.target_hours_week),
  );
  const [bundesland, setBundesland] = useState<string>(
    employee.bundesland ?? "",
  );
  const [employmentStartDate, setEmploymentStartDate] = useState(
    employee.employment_start_date ?? employee.created_at.slice(0, 10),
  );
  const [initialOvertimeHours, setInitialOvertimeHours] = useState(
    String((employee.initial_overtime_minutes ?? 0) / 60),
  );
  const [annualVacationDaysOverride, setAnnualVacationDaysOverride] = useState<string | null>(null);
  const [carriedOverDaysOverride, setCarriedOverDaysOverride] = useState<string | null>(null);
  const [workScheduleValid, setWorkScheduleValid] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const leaveBalanceQuery = useQuery<LeaveBalance>({
    queryKey: ["leaveBalance", employee.id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/leave-entitlements/${employee.id}`);
      const json: ApiResponse<LeaveBalance> = await response.json();
      if (!response.ok || !json.data) {
        throw new Error(json.error ?? "Urlaubsanspruch konnte nicht geladen werden");
      }
      return json.data;
    },
  });

  const annualVacationDays = annualVacationDaysOverride
    ?? (leaveBalanceQuery.data ? String(leaveBalanceQuery.data.annual) : "");
  const carriedOverDays = carriedOverDaysOverride
    ?? (leaveBalanceQuery.data ? String(leaveBalanceQuery.data.carried_over) : "");

  const mutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        first_name: firstName,
        last_name: lastName,
        role,
        target_hours_week: scheduleHours(workSchedule),
        work_schedule: workSchedule,
        employment_start_date: employmentStartDate,
        initial_overtime_minutes: Math.round((Number(initialOvertimeHours) || 0) * 60),
        bundesland: bundesland || null,
      };

      const res = await fetch(`/api/v1/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fehler beim Speichern");

      const entitlementResponse = await fetch(
        `/api/v1/leave-entitlements/${employee.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            total_days: Number(annualVacationDays),
            carried_over: Number(carriedOverDays),
          }),
        },
      );
      const entitlementJson = await entitlementResponse.json();
      if (!entitlementResponse.ok) {
        throw new Error(
          entitlementJson.error ?? "Urlaubsanspruch konnte nicht gespeichert werden",
        );
      }

      return { employee: json.data, entitlement: entitlementJson.data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaveBalance"] });
      onSuccess();
    },
    onError: (err) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const annual = Number(annualVacationDays);
    const carriedOver = Number(carriedOverDays);
    if (!Number.isInteger(annual) || annual < 20 || annual > 40) {
      setError("Der Jahresanspruch muss zwischen 20 und 40 Tagen liegen.");
      return;
    }
    if (!Number.isInteger(carriedOver) || carriedOver < 0 || carriedOver > 20) {
      setError("Der Resturlaub muss zwischen 0 und 20 Tagen liegen.");
      return;
    }

    mutation.mutate();
  }

  const leaveBalanceError = leaveBalanceQuery.error instanceof Error
    ? leaveBalanceQuery.error.message
    : null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Mitarbeiter bearbeiten</DialogTitle>
        </DialogHeader>

        {(error || leaveBalanceError) && (
          <Alert variant="destructive">
            <AlertDescription>{error ?? leaveBalanceError}</AlertDescription>
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
            <Label htmlFor="edit-role">Rolle</Label>
            <Select value={role} onValueChange={(v) => { if (v !== null) setRole(v as Employee["role"]); }}>
              <SelectTrigger id="edit-role" className="w-full">
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
              <Label htmlFor="edit-employment-start">Eintrittsdatum</Label>
              <Input
                id="edit-employment-start"
                type="date"
                value={employmentStartDate}
                onChange={(event) => setEmploymentStartDate(event.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Ab diesem Tag wird Sollzeit berechnet.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-overtime-balance">Überstunden-Startsaldo</Label>
              <Input
                id="edit-overtime-balance"
                type="number"
                step="0.25"
                value={initialOvertimeHours}
                onChange={(event) => setInitialOvertimeHours(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">In Stunden; wird zum erfassten Saldo addiert.</p>
            </div>
          </div>

          <div className="space-y-3 border border-slate-200 p-4">
            <div>
              <h3 className="text-sm font-semibold">Urlaubsanspruch</h3>
              <p className="text-xs text-muted-foreground">Kontingent für das laufende Kalenderjahr.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-annual-vacation-days">Urlaubstage pro Jahr</Label>
                <Input
                  id="edit-annual-vacation-days"
                  type="number"
                  min="20"
                  max="40"
                  step="1"
                  value={annualVacationDays}
                  onChange={(event) => setAnnualVacationDaysOverride(event.target.value)}
                  disabled={leaveBalanceQuery.isLoading || Boolean(leaveBalanceError)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-carried-over-days">Übertragener Resturlaub</Label>
                <Input
                  id="edit-carried-over-days"
                  type="number"
                  min="0"
                  max="20"
                  step="1"
                  value={carriedOverDays}
                  onChange={(event) => setCarriedOverDaysOverride(event.target.value)}
                  disabled={leaveBalanceQuery.isLoading || Boolean(leaveBalanceError)}
                  required
                />
              </div>
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
            <Button
              type="submit"
              disabled={
                mutation.isPending ||
                !workScheduleValid ||
                leaveBalanceQuery.isLoading ||
                Boolean(leaveBalanceError)
              }
            >
              {mutation.isPending ? "Wird gespeichert…" : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
