import { z } from "zod";
import type { PlanningShift } from "@/types/planning";
import { commitPlanning } from "@/repos/planningRepo";
import {
  planningSwapCommand,
  readPlanningSwaps,
} from "@/repos/planningSwapRepo";
import { loadPlanningSnapshot } from "@/services/planningSnapshotService";
import { approvePlanningSwap } from "@/services/planningSwapService";
import {
  planningRequest,
  planningResponse,
  planningFailure,
} from "@/services/planningRequestService";
import { PlanningError } from "@/services/planningPeriodService";

const schema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("request"),
      source: z.string().uuid(),
      target: z.string().uuid(),
    })
    .strict(),
  z
    .object({
      action: z.enum(["accept", "reject", "cancel", "approve"]),
      id: z.string().uuid(),
    })
    .strict(),
]);
export async function GET() {
  try {
    const { client, actor } = await planningRequest(false, false);
    const [swaps, options] = await Promise.all([
      readPlanningSwaps(client, actor.tenantId),
      client.rpc("planning_swap_options"),
    ]);
    if (options.error) throw options.error;
    return planningResponse({
      swaps,
      options: options.data,
      employeeId: actor.employeeId,
    });
  } catch (error) {
    return planningFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    const { client, admin, actor } = await planningRequest(true, false);
    const raw = await request.text();
    if (raw.length > 5000)
      throw new PlanningError("Die Eingabe ist zu groß.", 413);
    const parsed = schema.safeParse(JSON.parse(raw));
    if (!parsed.success) throw new PlanningError("Ungültige Tauschanfrage.");
    const command = parsed.data;
    if (command.action === "request")
      return planningResponse(
        {
          id: await planningSwapCommand(
            admin,
            actor.userId,
            "request",
            undefined,
            command.source,
            command.target,
          ),
        },
        201,
      );
    if (command.action !== "approve")
      return planningResponse({
        id: await planningSwapCommand(
          admin,
          actor.userId,
          command.action,
          command.id,
        ),
      });
    if (!["admin", "manager"].includes(actor.role))
      throw new PlanningError("Keine Berechtigung.", 403);
    const swaps = await readPlanningSwaps(client, actor.tenantId),
      swap = swaps.find((s) => s.id === command.id);
    if (!swap || swap.status !== "accepted")
      throw new PlanningError("Beide Personen müssen dem Tausch zustimmen.");
    const snapshot = await loadPlanningSnapshot(client, actor.tenantId);
    const next = approvePlanningSwap(
      snapshot.state,
      snapshot.context,
      swap.source_snapshot as PlanningShift,
      swap.target_snapshot as PlanningShift,
    );
    return planningResponse({
      version: await commitPlanning(
        admin,
        actor.tenantId,
        actor.userId,
        snapshot.version,
        next,
        "swap",
        "Beidseitig bestätigter Schichttausch",
        undefined,
        command.id,
      ),
    });
  } catch (error) {
    return planningFailure(
      error instanceof SyntaxError
        ? new PlanningError("Ungültige Eingabe.")
        : error,
    );
  }
}
