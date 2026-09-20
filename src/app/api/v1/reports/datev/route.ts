import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/config/supabase/server";
import { getTodayDate } from "@/config/server/timestamps";
import { datevDownloadSchema, datevMonthSchema, datevSettingsSchema } from "@/types/datev";
import { getDatevSnapshot, saveDatevSettings, storeDatevExport } from "@/repos/datevRepo";
import { buildDatevPreview, generateLodasFile } from "@/services/datevExportService";
import { observeProductAction } from "@/services/productObservationService";
import { setObservedTenant } from "@/config/server/product-observation-context";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers });

async function authenticate() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  const { data, error } = await client.from("employees").select("id,tenant_id,role")
    .eq("user_id", user.id).is("deleted_at", null).single();
  return !error && data?.role === "admin" ? data : null;
}
async function body(request: Request) {
  const text = await request.text();
  if (text.length > 250_000) return null;
  try { return JSON.parse(text); } catch { return null; }
}

export async function GET(request: Request) {
  try {
    const employee = await authenticate();
    if (!employee) return fail("DATEV-Exporte sind nur für aktive Administratoren verfügbar.", 403);
    const params = new URL(request.url).searchParams;
    const month = datevMonthSchema.safeParse(params.get("month") ?? getTodayDate().slice(0, 7));
    if (!month.success) return fail("Ungültiger Monat.", 400);
    const snapshot = await getDatevSnapshot(createAdminClient(), employee.tenant_id, month.data);
    return NextResponse.json({ data: { settings: snapshot.settings ?? { revision: 0, advisorNumber: null,
      clientNumber: null, employees: [] }, employees: snapshot.employees,
      preview: buildDatevPreview(snapshot, month.data) } }, { headers });
  } catch { return fail("DATEV-Daten konnten nicht geladen werden. Bitte erneut versuchen.", 503); }
}

export async function PUT(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return fail("Keine Berechtigung.", 403);
  try {
    const employee = await authenticate();
    if (!employee) return fail("Keine Berechtigung.", 403);
    const parsed = datevSettingsSchema.safeParse(await body(request));
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Ungültige Einstellungen.", 400);
    await saveDatevSettings(createAdminClient(), employee.tenant_id, parsed.data);
    return NextResponse.json({ data: true }, { headers });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Speichern fehlgeschlagen.", 409);
  }
}

async function handlePost(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return fail("Keine Berechtigung.", 403);
  try {
    const employee = await authenticate();
    if (!employee) return fail("Keine Berechtigung.", 403);
    setObservedTenant(employee.tenant_id, employee.id);
    const parsed = datevDownloadSchema.safeParse(await body(request));
    if (!parsed.success) return fail("Bitte die aktuelle Vorschau prüfen und bestätigen.", 400);
    const admin = createAdminClient();
    const snapshot = await getDatevSnapshot(admin, employee.tenant_id, parsed.data.month);
    const preview = buildDatevPreview(snapshot, parsed.data.month);
    if (preview.fingerprint !== parsed.data.fingerprint) return fail("Daten wurden inzwischen geändert. Bitte Vorschau aktualisieren.", 409);
    if (preview.errors.length || !snapshot.settings) return fail(preview.errors.join(" "), 422);
    if (preview.history.length && !parsed.data.repeatConfirmed) return fail("Für diesen Monat existiert bereits ein Export. Bitte erneuten Download ausdrücklich bestätigen.", 409);
    const content = generateLodasFile(snapshot.settings, preview);
    const saved = await storeDatevExport(admin, employee.tenant_id, employee.id,
      preview.month, preview.fingerprint, content);
    return new NextResponse(saved.content, { headers: { ...headers,
      "Content-Type": "text/plain; charset=windows-1252",
      "Content-Disposition": `attachment; filename="quoska-lodas-${preview.month}-${saved.id.slice(0, 8)}.txt"`,
    } });
  } catch { return fail("DATEV-Export konnte nicht erstellt werden. Bitte erneut versuchen.", 503); }
}

export const POST = observeProductAction("report_export", handlePost);
