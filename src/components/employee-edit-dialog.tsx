/**
 * EmployeeEditDialog — Modal form to edit an existing employee.
 *
 * Uses useMutation to PATCH /api/v1/employees/[id].
 * All UI text in German (de-DE).
 */

"use client";

import { EmployeeLeaveFields } from "@/components/employee-leave-fields";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import type { Employee } from "@/types/database";
import { updateEntitlementSchema, type LeaveBalance } from "@/types/leave";
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
import { GermanDateInput } from "@/components/german-date-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmployeeScheduleHistory } from "@/components/employee-schedule-history";
import { WorkScheduleEditor } from "@/components/work-schedule-editor";
import { getLocalToday } from "@/config/client/date-utils";
import { ROLE_LABELS, ROLE_OPTIONS, type EmployeeListResponse } from "@/types/employee";
import {
  employeeScheduleForDate,
  sameSchedule,
  WORKDAY_KEYS,
  type WorkSchedule,
} from "@/types/work-schedule";

interface EmployeeEditDialogProps {
  employee: Employee;
  today?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function EmployeeEditDialog({
  employee,
  today = getLocalToday(),
  onClose,
  onSuccess,
}: EmployeeEditDialogProps) {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState(employee.first_name);
  const [lastName, setLastName] = useState(employee.last_name);
  const [role, setRole] = useState<Employee["role"]>(employee.role);
  const [scheduleDraft, setScheduleDraft] = useState<WorkSchedule | null>(null);
  const [effectiveDateOverride, setEffectiveDateOverride] = useState<string | null>(null);
  const [bundesland, setBundesland] = useState<string>(employee.bundesland ?? "");
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

  const defaultEffectiveDate = employmentStartDate > today ? employmentStartDate : today;
  const effectiveDate = effectiveDateOverride ?? defaultEffectiveDate;
  const savedSchedule = employeeScheduleForDate(employee, effectiveDate || defaultEffectiveDate);
  const workSchedule = scheduleDraft ?? savedSchedule;
  const scheduleChanged = !sameSchedule(savedSchedule, workSchedule);
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
      const body: Record<string, unknown> = {};
      if (firstName !== employee.first_name) body.first_name = firstName;
      if (lastName !== employee.last_name) body.last_name = lastName;
      if (role !== employee.role) body.role = role;
      if ((bundesland || null) !== employee.bundesland) body.bundesland = bundesland || null;
      if (employmentStartDate !== (employee.employment_start_date ?? employee.created_at.slice(0, 10))) {
        body.employment_start_date = employmentStartDate;
      }
      const openingBalance = Math.round((Number(initialOvertimeHours) || 0) * 60);
      if (openingBalance !== (employee.initial_overtime_minutes ?? 0)) {
        body.initial_overtime_minutes = openingBalance;
      }
      if (scheduleChanged) {
        body.work_schedule = workSchedule;
        body.work_schedule_effective_from = effectiveDate;
      }
      if (Number(annualVacationDays) !== leaveBalanceQuery.data?.annual
        || Number(carriedOverDays) !== leaveBalanceQuery.data?.carried_over) {
        body.leave_entitlement = { total_days: Number(annualVacationDays), carried_over: Number(carriedOverDays) };
      }
      if (!Object.keys(body).length) return employee;

      const res = await fetch(`/api/v1/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json: ApiResponse<Employee> = await res.json();
      if (!res.ok || !json.data) throw new Error(json.error ?? "Fehler beim Speichern");

      return json.data;
    },
    onSuccess: async (updatedEmployee) => {
      // Reopening immediately must use the saved profile, even while the list refetches.
      await queryClient.cancelQueries({ queryKey: ["employees"] });
      queryClient.setQueryData<EmployeeListResponse>(["employees"], (current) => current ? {
        ...current,
        active: current.active.map((item) => item.id === updatedEmployee.id ? updatedEmployee : item),
        deactivated: current.deactivated.map((item) => item.id === updatedEmployee.id ? updatedEmployee : item),
      } : current);
      queryClient.invalidateQueries({ queryKey: ["leaveBalance"] });
      if (scheduleChanged) {
        for (const queryKey of ["adminCockpit", "managerDashboard", "weeklyReport", "myTimes", "clockStatus"]) {
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        }
      }
      onSuccess();
    },
    onError: (err) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const annual = Number(annualVacationDays);
    const carriedOver = Number(carriedOverDays);
    const entitlement = updateEntitlementSchema.safeParse({ total_days: annual, carried_over: carriedOver });
    if (!entitlement.success) {
      setError(entitlement.error.issues[0].message);
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
              <GermanDateInput
                id="edit-employment-start"
                value={employmentStartDate}
                onChange={setEmploymentStartDate}
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
            <EmployeeLeaveFields annualDays={annualVacationDays} carriedDays={carriedOverDays}
              disabled={leaveBalanceQuery.isLoading || Boolean(leaveBalanceError)}
              onAnnualChange={setAnnualVacationDaysOverride} onCarriedChange={setCarriedOverDaysOverride} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-schedule-effective-date">Arbeitszeitmodell gültig ab</Label>
            <GermanDateInput
              id="edit-schedule-effective-date"
              calendarLabel="Kalender für Gültigkeitsdatum öffnen"
              value={effectiveDate}
              min={employmentStartDate || undefined}
              onChange={(date) => {
                const nextSchedule = employeeScheduleForDate(employee, date || defaultEffectiveDate);
                if (!sameSchedule(nextSchedule, savedSchedule)) setWorkScheduleValid(true);
                setEffectiveDateOverride(date);
              }}
              required={scheduleChanged}
            />
            <p className="text-xs text-muted-foreground">Änderungen gelten ab diesem Datum. Die Sollzeit davor bleibt erhalten.</p>
            <WorkScheduleEditor
              key={WORKDAY_KEYS.map((day) => savedSchedule[day]).join(",")}
              value={workSchedule}
              onChange={setScheduleDraft}
              onValidityChange={setWorkScheduleValid}
            />
            <EmployeeScheduleHistory employee={employee} today={today} />
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
                (scheduleChanged && (!effectiveDate || effectiveDate < employmentStartDate)) ||
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
