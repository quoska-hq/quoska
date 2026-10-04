import { planningCommandSchema } from "@/types/planning-schemas";
import { readPlanningJobs } from "@/repos/planningRepo";
import { loadPlanningSnapshot } from "@/services/planningSnapshotService";
import { executePlanningCommand } from "@/services/planningCommandService";
import {
  planningRequest,
  planningResponse,
  planningFailure,
} from "@/services/planningRequestService";
import { PlanningError } from "@/services/planningPeriodService";

export async function GET() {
  try {
    const { client, actor } = await planningRequest();
    const [snapshot, jobs] = await Promise.all([
      loadPlanningSnapshot(client, actor.tenantId),
      readPlanningJobs(client, actor.tenantId),
    ]);
    return planningResponse({ ...snapshot, jobs });
  } catch (error) {
    return planningFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    const { client, admin, actor } = await planningRequest(true);
    const raw = await request.text();
    if (raw.length > 2_000_000)
      throw new PlanningError("Die Eingabe ist zu groß.", 413);
    const parsed = planningCommandSchema.safeParse(JSON.parse(raw));
    if (!parsed.success)
      throw new PlanningError(
        "Ungültige Angaben. Bitte die Pflichtfelder und Zeitangaben prüfen.",
      );
    const snapshot = await loadPlanningSnapshot(client, actor.tenantId);
    return planningResponse(
      await executePlanningCommand(admin, client, actor, snapshot, parsed.data),
    );
  } catch (error) {
    if (error instanceof SyntaxError)
      return planningFailure(new PlanningError("Ungültige Eingabe."));
    return planningFailure(error);
  }
}
