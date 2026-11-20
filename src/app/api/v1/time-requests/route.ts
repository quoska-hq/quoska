import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { submitMissingTimeRequest } from "@/services/missingTimeRequestService";
import { missingTimeRequestSchema } from "@/types/time-entry";

export async function POST(request: Request) {
  try {
    const auth = await getEmployeeFromAuth(await createClient());
    if (!auth.data) return NextResponse.json({ data: null, error: auth.error }, { status: 401 });
    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ data: null, error: "Ungültige Eingabe" }, { status: 400 }); }
    const parsed = missingTimeRequestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({
      data: null, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe",
    }, { status: 400 });
    const result = await submitMissingTimeRequest(
      createAdminClient(), auth.data.tenantId, auth.data.employeeId, parsed.data,
    );
    return NextResponse.json(result, { status: result.data ? 201 : 400 });
  } catch (error) {
    console.error("Missing time request error:", error);
    return NextResponse.json({ data: null, error: "Ein unerwarteter Fehler ist aufgetreten." }, { status: 500 });
  }
}
