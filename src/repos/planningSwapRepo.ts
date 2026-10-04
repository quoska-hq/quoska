import type { SupabaseClient } from "@supabase/supabase-js";
export async function readPlanningSwaps(
  client: SupabaseClient,
  tenantId: string,
) {
  const result = await client
    .from("planning_swaps")
    .select("*")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);
  if (result.error) throw result.error;
  return result.data;
}
export async function planningSwapCommand(
  client: SupabaseClient,
  userId: string,
  action: string,
  id?: string,
  source?: string,
  target?: string,
) {
  const result = await client.rpc("planning_swap_command", {
    p_user: userId,
    p_action: action,
    p_id: id ?? null,
    p_source: source ?? null,
    p_target: target ?? null,
  });
  if (result.error) throw result.error;
  return result.data;
}
