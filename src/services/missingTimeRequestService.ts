import type { SupabaseClient } from "@supabase/supabase-js";
import type { CorrectionRequest } from "@/types/database";
import type { ManualTimeEntryInput } from "@/types/time-entry";
import { failure, success, type ApiResponse } from "@/types/api";
import { allocateBreakMinutes } from "@/types/break";
import { addCalendarDay, getNowIso } from "@/config/server/timestamps";
import { importWallTimeToIso } from "@/config/server/import-timestamps";
import { correctionChangeSummary } from "@/lib/correction-format";
import { notifyManagers, sendNotification } from "@/services/notificationService";

/** The tenant's setting determines whether submission also books the entry. */
export async function submitMissingTimeRequest(
  admin: SupabaseClient,
  tenantId: string,
  employeeId: string,
  input: Omit<ManualTimeEntryInput, "employee_id">,
): Promise<ApiResponse<CorrectionRequest>> {
  let clockIn: string;
  let clockOut: string;
  try {
    clockIn = importWallTimeToIso(input.date, input.start_time, "Europe/Berlin");
    clockOut = importWallTimeToIso(
      input.ends_next_day ? addCalendarDay(input.date) : input.date,
      input.end_time, "Europe/Berlin",
    );
  } catch {
    return failure("Bitte prüfe Datum und Uhrzeit. Die Uhrzeit muss auch bei einer Zeitumstellung eindeutig sein.");
  }
  const grossMinutes = (Date.parse(clockOut) - Date.parse(clockIn)) / 60_000;
  if (grossMinutes <= 0 || grossMinutes > 1440) {
    return failure("Das Ende muss nach dem Beginn liegen; höchstens 24 Stunden sind möglich");
  }
  if (Date.parse(clockOut) > Date.parse(getNowIso())) {
    return failure("Nur bereits abgeschlossene Zeiten können nachgetragen werden");
  }
  if (input.break_minutes >= grossMinutes) return failure("Die Pause muss kürzer als die Anwesenheitszeit sein");

  const allocation = allocateBreakMinutes(grossMinutes, input.break_minutes, input.apply_automatic_break);
  if (allocation.totalMinutes >= grossMinutes) return failure("Die Pause muss kürzer als die Anwesenheitszeit sein");
  const proposal = {
    date: input.date, clock_in: clockIn, clock_out: clockOut,
    break_minutes: allocation.totalMinutes, automatic_break_minutes: allocation.automaticMinutes,
    notes: input.notes?.trim() || null,
  };
  const { data, error } = await admin.rpc("submit_missing_time_request", {
    p_tenant_id: tenantId,
    p_employee_id: employeeId,
    p_proposal: proposal,
    p_reason: input.reason.trim(),
  });
  if (error?.code === "P0001") return failure(error.message);
  if (error || !data) return failure("Zeitnachtrag konnte nicht gespeichert werden");
  const request = data as CorrectionRequest;
  if (request.status === "pending") {
    try {
      await notifyManagers(admin, tenantId, "correction_request", "Neue Nachtragsanfrage",
        `${correctionChangeSummary({ proposed_change: proposal })} · Grund: ${input.reason.trim()}`,
        getNowIso(), admin);
    } catch { /* The request remains available even if notification delivery fails. */ }
  }
  return success(request);
}

export async function reviewMissingTimeRequest(
  admin: SupabaseClient,
  tenantId: string,
  reviewerId: string,
  requestId: string,
  action: "approve" | "reject",
  reviewNote?: string,
): Promise<ApiResponse<CorrectionRequest>> {
  const { data, error } = await admin.rpc("review_missing_time_request", {
    p_tenant_id: tenantId, p_reviewer_id: reviewerId, p_request_id: requestId,
    p_action: action, p_review_note: reviewNote ?? null,
  });
  if (error || !data) return failure(error?.message ?? "Nachtragsanfrage konnte nicht bearbeitet werden");
  const request = data as CorrectionRequest;
  try {
    await sendNotification(admin, tenantId, request.employee_id,
      action === "approve" ? "correction_approved" : "correction_rejected",
      action === "approve" ? "Zeitnachtrag genehmigt" : "Zeitnachtrag abgelehnt",
      action === "approve" ? "Dein Zeitnachtrag wurde genehmigt und gebucht."
        : `Dein Zeitnachtrag wurde abgelehnt.${reviewNote ? ` Grund: ${reviewNote}` : ""}`,
      getNowIso(), admin);
  } catch { /* Review and audit are already committed atomically. */ }
  return success(request);
}
