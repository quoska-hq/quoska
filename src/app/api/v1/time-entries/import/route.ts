import { setObservedTenant } from "@/config/server/product-observation-context";
import { observeProductAction } from "@/services/productObservationService";
import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/config/supabase/server";
import { getNowIso } from "@/config/server/timestamps";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { runTimeImport } from "@/services/timeImportService";
import { MAX_IMPORT_BYTES, timeImportSchema } from "@/types/time-import";

async function handlePost(request: Request) {
  const auth = await getEmployeeFromAuth(await createClient());
  if (!auth.data) return NextResponse.json({ data: null, error: auth.error }, { status: 401 });
  const { tenantId, employeeId, role } = auth.data;
    setObservedTenant(tenantId);
  if (!["admin", "manager"].includes(role)) {
    return NextResponse.json({ data: null, error: "Nur Administratoren und Führungskräfte können Zeiten importieren." }, { status: 403 });
  }
  // Recheck the persisted role: old JWT claims must not authorize a removed manager.
  const admin = createAdminClient();
  const { data: actor, error: actorError } = await admin.from("employees").select("role")
    .eq("id", employeeId).eq("tenant_id", tenantId).is("deleted_at", null).maybeSingle();
  if (actorError) return NextResponse.json({ data: null, error: "Berechtigung konnte nicht geprüft werden." }, { status: 500 });
  if (!actor || !["admin", "manager"].includes(actor.role)) {
    return NextResponse.json({ data: null, error: "Keine Berechtigung." }, { status: 403 });
  }
  try {
    // Bound the actual stream as well as the CSV; JSON escaping increases wire size.
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Die CSV-Datei fehlt.");
    let size = 0;
    let body = "";
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_IMPORT_BYTES * 3) {
        await reader.cancel();
        return NextResponse.json({ data: null, error: "Die Importdatei ist zu groß (maximal 2 MB CSV)." }, { status: 413 });
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    const parsed = timeImportSchema.safeParse(JSON.parse(body));
    if (!parsed.success) throw new Error("Ungültige Import-Einstellungen oder Datei zu groß (maximal 2 MB). ");
    const result = await runTimeImport(admin, tenantId, employeeId, parsed.data, getNowIso());
    return NextResponse.json({ data: result, error: null }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ data: null, error: error instanceof SyntaxError ? "Ungültige Anfrage." : error instanceof Error ? error.message : "Import fehlgeschlagen." }, { status: 400 });
  }
}

export const POST = observeProductAction("import", handlePost);
