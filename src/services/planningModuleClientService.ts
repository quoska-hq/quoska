import type { ApiResponse } from "@/types/api";
import {
  planningModuleSchema,
  type PlanningModuleStatus,
} from "@/types/planning-module";

export async function planningModuleFetch(command?: PlanningModuleStatus) {
  const response = await fetch(
    "/api/v1/modules/planning",
    command
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(command),
        }
      : { cache: "no-store" },
  );
  const result = (await response.json()) as ApiResponse<PlanningModuleStatus>;
  if (!response.ok || result.error)
    throw new Error(
      result.error ?? "Der Modulstatus konnte nicht geladen werden.",
    );
  return planningModuleSchema.parse(result.data);
}
