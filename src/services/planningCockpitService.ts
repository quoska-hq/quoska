import type { SupabaseClient } from "@supabase/supabase-js";
import { readPlanningState } from "@/repos/planningRepo";
import type { PlanningState } from "@/types/planning";
import {
  planningAddDays,
  planningAddMonths,
} from "@/config/client/planning-calendar";
export type PlanningExpectations = Record<string, Record<string, boolean>>;
export function planningExpectedDays(
  state: PlanningState,
): PlanningExpectations {
  const result: PlanningExpectations = {};
  if (!state.config.enabled) return result;
  for (const p of state.periods.filter(
    (p) => p.status === "fixed" || p.status === "closed",
  )) {
    for (const profile of state.config.profiles) {
      const days = result[profile.employeeId] ?? {};
      for (
        let date = p.month;
        date < planningAddMonths(p.month, 1);
        date = planningAddDays(date, 1)
      )
        days[date] = p.publishedShifts.some(
          (s) => s.employeeId === profile.employeeId && s.date === date,
        );
      result[profile.employeeId] = days;
    }
  }
  return result;
}
export async function getPlanningExpectations(
  client: SupabaseClient,
  tenantId: string,
  from: string,
): Promise<PlanningExpectations> {
  return planningExpectedDays(
    (await readPlanningState(client, tenantId, from.slice(0, 7) + "-01")).state,
  );
}
