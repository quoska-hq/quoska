import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { COCKPIT_UNDO_SECONDS, type CockpitActionItem, type CockpitDismissalInput, type CockpitDismissalResult } from "@/types/cockpit";
import { failure, success } from "@/types/api";
import { getDismissedCockpitActionIds, insertCockpitDismissals } from "@/repos/cockpitDismissalRepo";
import { getAdminCockpit } from "@/services/cockpitService";
import { getCockpitDateRange } from "@/services/cockpitPeriodService";

export async function filterDismissedCockpitActions(
  supabase: SupabaseClient,
  tenantId: string,
  viewerId: string,
  actions: CockpitActionItem[],
): Promise<CockpitActionItem[]> {
  const dismissed = await getDismissedCockpitActionIds(supabase, tenantId, viewerId, actions.map((item) => item.id));
  return actions.filter((item) => !dismissed.has(item.id));
}

export async function dismissCockpitActions(
  supabase: SupabaseClient,
  tenantId: string,
  viewerId: string,
  input: CockpitDismissalInput,
  todayDate: string,
  nowIso: string,
) {
  const { startDate, endDate } = getCockpitDateRange(todayDate, input.days);
  const result = await getAdminCockpit(supabase, tenantId, startDate, endDate, input.days, nowIso, input.employeeId);
  if (!result.data) return failure<CockpitDismissalResult>(result.error ?? "Cockpit konnte nicht geladen werden.");
  const currentIds = new Set(result.data.actions.map((item) => item.id));
  const requestedIds = [...new Set(input.actionIds)];
  if (requestedIds.some((id) => !currentIds.has(id))) {
    return failure<CockpitDismissalResult>("Die Hinweise haben sich geändert. Bitte lade das Cockpit neu.");
  }
  const undoToken = randomUUID();
  const saved = await insertCockpitDismissals(supabase, tenantId, viewerId, requestedIds, undoToken);
  return success<CockpitDismissalResult>({
    dismissedCount: saved.count,
    undoToken: saved.count > 0 ? undoToken : null,
    undoExpiresAt: saved.dismissedAt
      // eslint-disable-next-line @quoska/legal/no-client-timestamps -- derives a UI deadline from the database timestamp
      ? new Date(Date.parse(saved.dismissedAt) + COCKPIT_UNDO_SECONDS * 1000).toISOString() : null,
  });
}
