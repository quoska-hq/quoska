import { NextResponse } from "next/server";
import { getTodayDate } from "@/config/server/timestamps";
import { createClient } from "@/config/supabase/server";
import { getPersonalProjectGoals } from "@/services/projectBalanceService";
import { personalProjectWeekQuerySchema } from "@/types/project-balance";
import type { PersonalProjectGoal } from "@/types/project-balance";
import type { ApiResponse } from "@/types/api";

function reject(status: number, error: string) {
  return NextResponse.json<ApiResponse<PersonalProjectGoal[]>>({ data: null, error }, { status });
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return reject(401, "Nicht authentifiziert.");

    const { searchParams } = new URL(request.url);
    const query = personalProjectWeekQuerySchema.safeParse({ weekStart: searchParams.get("weekStart") });
    if (searchParams.size !== 1 || !query.success) {
      return reject(400, "Bitte gib einen Montag als Wochenbeginn an.");
    }

    const { data: employee, error } = await supabase.from("employees")
      .select("id,tenant_id")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!employee) return reject(403, "Aktives Mitarbeiterprofil nicht gefunden.");

    const data = await getPersonalProjectGoals(
      supabase, employee.tenant_id, employee.id, query.data.weekStart, getTodayDate(),
    );
    return NextResponse.json<ApiResponse<PersonalProjectGoal[]>>({ data, error: null }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Personal project goals lookup failed:", error);
    return reject(500, "Projektziele konnten nicht geladen werden.");
  }
}
