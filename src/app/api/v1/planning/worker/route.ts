import { createAdminClient } from "@/config/supabase/server";
import { planningWorkerAuthorized } from "@/config/server/planning-worker";
import { planningWorkerResultSchema } from "@/types/planning-worker";
import {
  planningFailure,
  planningResponse,
} from "@/services/planningRequestService";
import { PlanningError } from "@/services/planningPeriodService";
import { validatePlanningWorkerResult } from "@/services/planningWorkerService";

export async function POST(request: Request) {
  try {
    if (!planningWorkerAuthorized(request))
      throw new PlanningError("Keine Berechtigung.", 401);
    const raw = await request.text();
    if (raw.length > 2_000_000)
      throw new PlanningError("Die Eingabe ist zu groß.", 413);
    const body: unknown = JSON.parse(raw);
    const admin = createAdminClient();
    if (
      body &&
      typeof body === "object" &&
      "action" in body &&
      body.action === "claim" &&
      Object.keys(body).length === 1
    ) {
      const response = await admin.rpc("planning_claim_job");
      if (response.error) throw response.error;
      return planningResponse(response.data);
    }
    const result = planningWorkerResultSchema.safeParse(body);
    if (!result.success) throw new PlanningError("Ungültiges Rechenergebnis.");
    const response = await admin.rpc("planning_finish_job", {
      p_job: result.data.jobId,
      p_lease: result.data.leaseToken,
      p_result: await validatePlanningWorkerResult(
        admin,
        result.data.jobId,
        result.data.leaseToken,
        result.data.result,
      ),
    });
    if (response.error) throw response.error;
    if (!response.data)
      throw new PlanningError("Die Rechenfreigabe ist abgelaufen.", 409);
    return planningResponse({ completed: true });
  } catch (error) {
    return planningFailure(
      error instanceof SyntaxError
        ? new PlanningError("Ungültige Eingabe.")
        : error,
    );
  }
}
