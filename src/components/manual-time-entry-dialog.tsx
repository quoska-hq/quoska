"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coffee, Info } from "lucide-react";
import { allocateBreakMinutes } from "@/types/break";
import { getLocalToday, isGermanTime } from "@/config/client/date-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/date-picker";
import { GermanTimeInput } from "@/components/german-time-input";

interface EmployeeOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  targetEmployee?: { id: string; name: string };
  allowEmployeeSelection?: boolean;
}

export function ManualTimeEntryDialog({
  open,
  onClose,
  onSaved,
  targetEmployee,
  allowEmployeeSelection = false,
}: Props) {
  const queryClient = useQueryClient();
  const [employeeId, setEmployeeId] = useState(targetEmployee?.id ?? "");
  const [date, setDate] = useState(getLocalToday());
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [endsNextDay, setEndsNextDay] = useState(false);
  const [breakMinutes, setBreakMinutes] = useState(0);
  const [automaticOverride, setAutomaticOverride] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("Manuell nachgetragen");

  const { data: settings } = useQuery<{ automaticBreaksEnabled: boolean }>({
    queryKey: ["timeTrackingSettings"],
    queryFn: async () => {
      const response = await fetch("/api/v1/settings/time-tracking");
      const json = await response.json();
      return json.data ?? { automaticBreaksEnabled: true };
    },
  });

  const { data: employees } = useQuery<EmployeeOption[]>({
    queryKey: ["manualEntryEmployees"],
    queryFn: async () => {
      const response = await fetch("/api/v1/employees");
      const json = await response.json();
      return json.data?.active ?? [];
    },
    enabled: allowEmployeeSelection,
  });

  const automaticEnabled = automaticOverride ?? settings?.automaticBreaksEnabled ?? true;
  const grossMinutes = durationBetween(startTime, endTime, endsNextDay);
  const allocation = allocateBreakMinutes(grossMinutes, breakMinutes, automaticEnabled);
  const netMinutes = Math.max(0, grossMinutes - allocation.totalMinutes);

  const mutation = useMutation({
    mutationFn: async () => {
      const selectedTarget = targetEmployee?.id ?? (allowEmployeeSelection ? employeeId : undefined);
      const response = await fetch("/api/v1/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: selectedTarget || undefined,
          date,
          start_time: startTime,
          end_time: endTime,
          ends_next_day: endsNextDay,
          break_minutes: breakMinutes,
          apply_automatic_break: automaticEnabled,
          notes: notes.trim() || null,
          reason: reason.trim(),
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.data) throw new Error(json.error ?? "Zeiteintrag konnte nicht gespeichert werden");
      return json.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["myTimes"] }),
        queryClient.invalidateQueries({ queryKey: ["employeeEntries"] }),
        queryClient.invalidateQueries({ queryKey: ["weeklyReport"] }),
        queryClient.invalidateQueries({ queryKey: ["adminCockpit"] }),
        queryClient.invalidateQueries({ queryKey: ["notificationUnreadCount"] }),
      ]);
      onSaved?.();
      onClose();
    },
  });

  const canSave = Boolean(
    date && isGermanTime(startTime) && isGermanTime(endTime) && grossMinutes > 0 &&
    breakMinutes < grossMinutes && reason.trim().length >= 5 &&
    (!allowEmployeeSelection || targetEmployee || employeeId),
  );

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Zeit manuell hinzufügen</DialogTitle>
          {targetEmployee && <p className="text-sm text-muted-foreground">Für {targetEmployee.name}</p>}
        </DialogHeader>

        {mutation.error && <Alert variant="destructive"><AlertDescription>{mutation.error.message}</AlertDescription></Alert>}

        <div className="space-y-4">
          {allowEmployeeSelection && !targetEmployee && (
            <div className="space-y-2">
              <Label>Mitarbeiter</Label>
              <Select value={employeeId} onValueChange={(value) => setEmployeeId(value ?? "")}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Mitarbeiter auswählen" /></SelectTrigger>
                <SelectContent>
                  {(employees ?? []).map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>{employee.first_name} {employee.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DatePicker id="manual-date" label="Datum" value={date} onChange={setDate} />
          <div className="grid grid-cols-2 gap-3">
            <GermanTimeInput id="manual-start" label="Beginn" value={startTime} onChange={setStartTime} />
            <GermanTimeInput id="manual-end" label="Ende" value={endTime} onChange={setEndTime} />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={endsNextDay} onChange={(event) => setEndsNextDay(event.target.checked)} className="size-4 accent-[#6658d3]" />Ende am Folgetag</label>

          <div className="space-y-2">
            <Label htmlFor="manual-break">Bereits genommene Pause (Minuten)</Label>
            <Input id="manual-break" type="number" min="0" max="720" value={breakMinutes} onChange={(event) => setBreakMinutes(Math.max(0, Number(event.target.value)))} />
          </div>

          <label className="flex cursor-pointer items-start gap-3 border border-slate-900/15 bg-[#f7f5f0] p-3">
            <input type="checkbox" checked={automaticEnabled} onChange={(event) => setAutomaticOverride(event.target.checked)} className="mt-0.5 size-4 accent-[#6658d3]" />
            <span><span className="flex items-center gap-1.5 text-sm font-medium"><Coffee className="size-3.5 text-[#6658d3]" />Mindestpause automatisch ergänzen</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Fehlende Minuten werden vor dem Speichern angezeigt und am Eintrag gekennzeichnet.</span></span>
          </label>

          <div className="grid grid-cols-3 border border-slate-900/15 text-center">
            <Summary label="Anwesenheit" value={formatMinutes(grossMinutes)} />
            <Summary label="Pause" value={`${formatMinutes(allocation.totalMinutes)}${allocation.automaticMinutes ? ` (${allocation.automaticMinutes} auto)` : ""}`} />
            <Summary label="Arbeitszeit" value={formatMinutes(netMinutes)} />
          </div>

          <div className="space-y-2"><Label htmlFor="manual-notes">Notiz (optional)</Label><Textarea id="manual-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} rows={2} /></div>
          <div className="space-y-2"><Label htmlFor="manual-reason">Grund</Label><Input id="manual-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={200} /></div>
          <p className="flex gap-2 text-xs leading-5 text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" />Der Eintrag wird als manuell gekennzeichnet und vollständig im Änderungsverlauf protokolliert.</p>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Abbrechen</DialogClose>
          <Button onClick={() => mutation.mutate()} disabled={!canSave || mutation.isPending}>{mutation.isPending ? "Speichern…" : "Zeit hinzufügen"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function durationBetween(start: string, end: string, nextDay: boolean): number {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  return (endHour * 60 + endMinute + (nextDay ? 1440 : 0)) - (startHour * 60 + startMinute);
}

function formatMinutes(minutes: number): string {
  if (minutes <= 0) return "—";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="border-r border-slate-900/10 px-2 py-3 last:border-r-0"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-xs font-semibold">{value}</p></div>;
}
