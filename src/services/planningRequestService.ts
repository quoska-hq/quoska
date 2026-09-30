import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/config/supabase/server";
import { readPlanningActor } from "@/repos/planningRepo";
import { PlanningError } from "@/services/planningPeriodService";

export async function planningRequest(write = false, manager = true) {
  const client = await createClient(),
    actor = await readPlanningActor(client);
  if (!actor) throw new PlanningError("Bitte anmelden.", 401);
  if (manager && !["admin", "manager"].includes(actor.role))
    throw new PlanningError("Keine Berechtigung.", 403);
  const admin = createAdminClient();
  const limit = await admin.rpc("planning_take_limit", {
    p_user: actor.userId,
    p_write: write,
  });
  if (limit.error) throw new Error("Planning rate limit unavailable");
  if (!limit.data)
    throw new PlanningError(
      "Zu viele Anfragen. Bitte in einer Minute erneut versuchen.",
      429,
    );
  if (manager) {
    const initialized = await client.rpc("planning_initialize");
    if (initialized.error) throw new Error("Planning initialization failed");
  }
  return { client, admin, actor };
}
export function planningResponse(data: unknown, status = 200) {
  return NextResponse.json({ data, error: null }, { status });
}
export function planningFailure(error: unknown) {
  if (error instanceof PlanningError)
    return NextResponse.json(
      { data: null, error: error.message },
      { status: error.status },
    );
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    ["40001", "40P01", "23505"].includes(String(error.code))
  )
    return NextResponse.json(
      {
        data: null,
        error:
          "Die Daten wurden inzwischen geändert oder ein Rechenlauf ist bereits aktiv. Bitte neu laden.",
      },
      { status: 409 },
    );
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    String(error.code) === "42501"
  )
    return NextResponse.json(
      { data: null, error: "Keine Berechtigung." },
      { status: 403 },
    );
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    ["P0001", "23503"].includes(String(error.code))
  )
    return NextResponse.json(
      {
        data: null,
        error:
          "Die Schichten oder die Angaben zur Anfrage sind nicht mehr gültig. Bitte neu laden.",
      },
      { status: 400 },
    );
  console.error("Planning request failed", error);
  return NextResponse.json(
    { data: null, error: "Dienstplanung konnte nicht verarbeitet werden." },
    { status: 500 },
  );
}
