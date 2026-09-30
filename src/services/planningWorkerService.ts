import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanningJobResult } from "@/types/planning";
import { loadPlanningSnapshot } from "@/services/planningSnapshotService";
import { applyPlanningJob } from "@/services/planningProposalService";
import { PlanningError } from "@/services/planningPeriodService";
export async function validatePlanningWorkerResult(
  admin: SupabaseClient,
  jobId: string,
  lease: string,
  result: PlanningJobResult,
): Promise<PlanningJobResult> {
  if (!["optimal", "feasible"].includes(result.status)) return result;
  const job = await admin
    .from("planning_jobs")
    .select("tenant_id,month,input_version,status,result")
    .eq("id", jobId)
    .eq("lease_token", lease)
    .maybeSingle();
  if (job.error || !job.data)
    throw new PlanningError("Rechenlauf nicht verfügbar.", 409);
  if (job.data.status === "completed")
    return job.data.result as PlanningJobResult;
  const snapshot = await loadPlanningSnapshot(
    admin,
    job.data.tenant_id as string,
  );
  if (snapshot.version !== Number(job.data.input_version))
    return {
      ...result,
      status: "failed",
      assignments: [],
      message: "Die Eingangsdaten haben sich geändert. Bitte neu berechnen.",
    };
  try {
    applyPlanningJob(
      snapshot.state,
      snapshot.context,
      job.data.month as string,
      result,
    );
    return result;
  } catch (error) {
    return {
      ...result,
      status: "failed",
      assignments: [],
      message:
        error instanceof PlanningError
          ? error.message
          : "Die unabhängige Regelprüfung konnte nicht abgeschlossen werden.",
    };
  }
}
