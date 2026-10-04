import type { SupabaseClient } from "@supabase/supabase-js";
import { planningModuleSchema } from "@/types/planning-module";

export async function readPlanningModule(client: SupabaseClient) {
  const result = await client.rpc("planning_module_status");
  if (result.error) throw result.error;
  return planningModuleSchema.parse(result.data);
}
