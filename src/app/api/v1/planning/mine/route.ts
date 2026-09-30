import {
  planningRequest,
  planningResponse,
  planningFailure,
} from "@/services/planningRequestService";
import { z } from "zod";
import { PlanningError } from "@/services/planningPeriodService";

export async function GET() {
  try {
    const { client } = await planningRequest(false, false);
    const { data, error } = await client.rpc("planning_my_schedule");
    if (error) throw error;
    return planningResponse(data);
  } catch (error) {
    return planningFailure(error);
  }
}
const schema = z
  .object({
    preferredDays: z
      .array(z.number().int().min(0).max(6))
      .max(7)
      .refine((d) => new Set(d).size === d.length),
  })
  .strict();
export async function POST(request: Request) {
  try {
    const { admin, actor } = await planningRequest(true, false);
    const raw = await request.text();
    if (raw.length > 1000)
      throw new PlanningError("Die Eingabe ist zu groß.", 413);
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success)
      throw new PlanningError("Ungültige Wunsch-Arbeitstage.");
    const result = await admin.rpc("planning_set_preferences", {
      p_user: actor.userId,
      p_days: parsed.data.preferredDays,
    });
    if (result.error) throw result.error;
    return planningResponse({ version: Number(result.data) });
  } catch (error) {
    return planningFailure(
      error instanceof SyntaxError
        ? new PlanningError("Ungültige Eingabe.")
        : error,
    );
  }
}
