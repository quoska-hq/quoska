import type { SupabaseClient } from "@supabase/supabase-js";

export async function getDismissedCockpitActionIds(
  supabase: SupabaseClient,
  tenantId: string,
  viewerId: string,
  actionIds: string[],
): Promise<Set<string>> {
  const dismissed = new Set<string>();
  // Bound URL size and stay below the database API's response row limit.
  for (let offset = 0; offset < actionIds.length; offset += 100) {
    const { data, error } = await supabase.from("cockpit_action_dismissals")
      .select("action_id")
      .eq("tenant_id", tenantId)
      .eq("dismissed_by", viewerId)
      .in("action_id", actionIds.slice(offset, offset + 100));
    if (error) throw error;
    for (const row of data ?? []) dismissed.add(row.action_id);
  }
  return dismissed;
}

export async function insertCockpitDismissals(
  supabase: SupabaseClient,
  tenantId: string,
  viewerId: string,
  actionIds: string[],
  undoToken: string,
): Promise<{ count: number; dismissedAt: string | null }> {
  if (actionIds.length === 0) return { count: 0, dismissedAt: null };
  const { data, count, error } = await supabase.from("cockpit_action_dismissals").upsert(
    actionIds.map((actionId) => ({ tenant_id: tenantId, dismissed_by: viewerId, action_id: actionId, undo_token: undoToken })),
    { onConflict: "tenant_id,dismissed_by,action_id", ignoreDuplicates: true, count: "exact" },
  ).select("dismissed_at").limit(1);
  if (error) throw error;
  return { count: count ?? 0, dismissedAt: data?.[0]?.dismissed_at ?? null };
}

export async function undoCockpitDismissal(
  supabase: SupabaseClient,
  tenantId: string,
  viewerId: string,
  undoToken: string,
): Promise<number> {
  // RLS also checks the ten-second window using database time.
  const { error, count } = await supabase.from("cockpit_action_dismissals")
    .delete({ count: "exact" })
    .eq("tenant_id", tenantId)
    .eq("dismissed_by", viewerId)
    .eq("undo_token", undoToken);
  if (error) throw error;
  return count ?? 0;
}
