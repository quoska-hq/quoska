import {
  planningModuleCommandSchema,
  planningModuleSchema,
} from "@/types/planning-module";
import { readPlanningModule } from "@/services/planningModuleService";
import {
  planningRequest,
  planningResponse,
  planningFailure,
} from "@/services/planningRequestService";
import { PlanningError } from "@/services/planningPeriodService";

export async function GET() {
  try {
    const { client } = await planningRequest(false, false, true);
    return planningResponse(await readPlanningModule(client));
  } catch (error) {
    return planningFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const { admin, actor } = await planningRequest(true);
    const raw = await request.text();
    if (raw.length > 1000)
      throw new PlanningError("Die Eingabe ist zu groß.", 413);
    const parsed = planningModuleCommandSchema.safeParse(JSON.parse(raw));
    if (!parsed.success)
      throw new PlanningError("Ungültige Modul-Einstellung.");
    const result = await admin.rpc("planning_set_enabled", {
      p_user: actor.userId,
      p_version: parsed.data.version,
      p_enabled: parsed.data.enabled,
    });
    if (result.error) throw result.error;
    return planningResponse(planningModuleSchema.parse(result.data));
  } catch (error) {
    return planningFailure(
      error instanceof SyntaxError
        ? new PlanningError("Ungültige Eingabe.")
        : error,
    );
  }
}
