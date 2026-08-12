import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApiResponse } from "@/types/api";
import { failure, success } from "@/types/api";
import type { TimeEntry, TimeEntryAudit } from "@/types/database";
import type { ManualTimeEntryInput } from "@/types/time-entry";
import { allocateBreakMinutes } from "@/types/break";
import { addCalendarDay, berlinLocalDateTimeToIso } from "@/config/server/timestamps";
import { createNotification } from "@/repos/notificationRepo";

export interface ManualTimeEntryResult {
  entry: TimeEntry;
  automaticBreakAdded: number;
}

export async function createManualTimeEntry(
  admin: SupabaseClient,
  tenantId: string,
  actorEmployeeId: string,
  targetEmployeeId: string,
  input: ManualTimeEntryInput,
): Promise<ApiResponse<ManualTimeEntryResult>> {
  const { data: target } = await admin
    .from("employees")
    .select("id, first_name, last_name")
    .eq("id", targetEmployeeId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!target) return failure("Mitarbeiter nicht gefunden");

  const endDate = input.ends_next_day ? addCalendarDay(input.date) : input.date;
  const clockIn = berlinLocalDateTimeToIso(input.date, input.start_time);
  const clockOut = berlinLocalDateTimeToIso(endDate, input.end_time);
  const grossMinutes = Math.round((Date.parse(clockOut) - Date.parse(clockIn)) / 60_000);

  if (grossMinutes <= 0) return failure("Das Ende muss nach dem Beginn liegen");
  if (grossMinutes > 24 * 60) return failure("Ein Zeiteintrag darf höchstens 24 Stunden umfassen");
  if (input.break_minutes >= grossMinutes) return failure("Die Pause muss kürzer als die Anwesenheitszeit sein");

  const allocation = allocateBreakMinutes(
    grossMinutes, input.break_minutes, input.apply_automatic_break,
  );

  const { data: overlaps } = await admin
    .from("time_entries")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("employee_id", targetEmployeeId)
    .is("deleted_at", null)
    .lt("clock_in", clockOut)
    .or(`clock_out.is.null,clock_out.gt.${clockIn}`)
    .limit(1);
  if ((overlaps?.length ?? 0) > 0) return failure("Der Zeitraum überschneidet sich mit einem vorhandenen Eintrag");

  const { data: entry, error } = await admin
    .from("time_entries")
    .insert({
      tenant_id: tenantId,
      employee_id: targetEmployeeId,
      date: input.date,
      clock_in: clockIn,
      clock_out: clockOut,
      break_minutes: allocation.totalMinutes,
      automatic_break_minutes: allocation.automaticMinutes,
      entry_source: "manual",
      status: "completed",
      notes: input.notes?.trim() || null,
    })
    .select("*")
    .single();
  if (error || !entry) {
    console.error("Manual time entry failed:", error);
    return failure("Zeiteintrag konnte nicht angelegt werden");
  }

  const auditRows: Array<Omit<TimeEntryAudit, "id" | "changed_at">> = [{
    time_entry_id: entry.id,
    tenant_id: tenantId,
    changed_by: actorEmployeeId,
    action: "create",
    field_name: "manual_entry",
    old_value: null,
    new_value: `${clockIn} – ${clockOut}; Pause ${allocation.totalMinutes} Min`,
    reason: input.reason.trim(),
  }];
  if (allocation.automaticMinutes > 0) {
    auditRows.push({
      time_entry_id: entry.id,
      tenant_id: tenantId,
      changed_by: actorEmployeeId,
      action: "update",
      field_name: "automatic_break_minutes",
      old_value: "0",
      new_value: String(allocation.automaticMinutes),
      reason: "Automatische Mindestpause beim manuellen Nachtrag ergänzt",
    });
  }
  await admin.from("time_entry_audit").insert(auditRows);

  const actorIsTarget = actorEmployeeId === targetEmployeeId;
  if (!actorIsTarget || allocation.automaticMinutes > 0) {
    const { data: actor } = await admin
      .from("employees")
      .select("first_name, last_name")
      .eq("id", actorEmployeeId)
      .eq("tenant_id", tenantId)
      .single();
    const actorName = actor ? `${actor.first_name} ${actor.last_name}` : "Die Verwaltung";
    const automaticText = allocation.automaticMinutes > 0
      ? ` Automatisch ergänzt: ${allocation.automaticMinutes} Minuten Pause.`
      : "";

    await createNotification(admin, {
      tenant_id: tenantId,
      employee_id: targetEmployeeId,
      type: actorIsTarget ? "automatic_break_added" : "manual_time_added",
      title: actorIsTarget ? "Pause automatisch ergänzt" : "Arbeitszeit hinzugefügt",
      message: actorIsTarget
        ? `Für deinen Eintrag am ${formatDate(input.date)} wurden ${allocation.automaticMinutes} Minuten Pause ergänzt. Bitte prüfe den Eintrag.`
        : `${actorName} hat für den ${formatDate(input.date)} ${input.start_time}–${input.end_time} Uhr eingetragen.${automaticText}`,
    });
  }

  return success({ entry, automaticBreakAdded: allocation.automaticMinutes });
}

function formatDate(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
}
