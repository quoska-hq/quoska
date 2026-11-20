import { NextResponse } from "next/server";
import { z } from "zod";
import { setObservedTenant } from "@/config/server/product-observation-context";
import { createClient } from "@/config/supabase/server";
import { observeProductAction } from "@/services/productObservationService";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { failure, success } from "@/types/api";

const switchProjectBodySchema = z.object({
  entryId: z.string().uuid("Ungültige Zeiteintrags-ID"),
  projectId: z.string().uuid("Ungültige Projekt-ID"),
});

async function handlePost(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await getEmployeeFromAuth(supabase);
    if (!auth.data) return NextResponse.json(failure(auth.error ?? "Nicht authentifiziert"), { status: 401 });

    const { tenantId, employeeId } = auth.data;
    setObservedTenant(tenantId, employeeId);
    const input = switchProjectBodySchema.safeParse(await request.json().catch(() => null));
    if (!input.success) {
      return NextResponse.json(failure(input.error.issues[0]?.message ?? "Ungültige Eingabe"), { status: 400 });
    }

    const { data, error } = await supabase.rpc("transition_clock_project", {
      p_tenant_id: tenantId,
      p_employee_id: employeeId,
      p_entry_id: input.data.entryId,
      p_project_id: input.data.projectId,
    });
    if (error?.code === "42501") return NextResponse.json(failure(error.message), { status: 403 });
    if (error?.code === "P0001" || error?.code === "P0002") {
      return NextResponse.json(failure(error.message), { status: 409 });
    }
    if (error || data?.success !== true) {
      console.error("Clock project switch failed:", error);
      return NextResponse.json(failure("Der Projektwechsel ist fehlgeschlagen. Bitte versuche es erneut."), { status: 500 });
    }

    return NextResponse.json(success({ success: true }));
  } catch (error) {
    console.error("Clock project switch failed:", error);
    return NextResponse.json(failure("Der Projektwechsel ist fehlgeschlagen. Bitte versuche es erneut."), { status: 500 });
  }
}

export const POST = observeProductAction("clock_switch_project", handlePost);
