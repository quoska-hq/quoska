import { after, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { deliverFeedback } from "@/services/feedbackService";
import { saveFeedback } from "@/repos/feedbackRepo";
import { feedbackSchema } from "@/types/feedback";

export async function POST(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return new NextResponse(null, { status: 403 });
  try {
    const client = await createClient();
    const auth = await getEmployeeFromAuth(client);
    if (!auth.data) return NextResponse.json({ data: null, error: "Bitte melde dich erneut an." }, { status: 401 });
    const body = await request.text();
    if (body.length > 20_000) return NextResponse.json({ data: null, error: "Die Nachricht ist zu lang." }, { status: 413 });
    const parsed = feedbackSchema.safeParse(JSON.parse(body));
    if (!parsed.success) return NextResponse.json({ data: null, error: "Bitte wähle ein Anliegen und schreibe 10 bis 4.000 Zeichen." }, { status: 400 });
    const feedback = await saveFeedback(client, parsed.data);
    after(() => deliverFeedback(createAdminClient(), feedback));
    return NextResponse.json({ data: { id: feedback.id }, error: null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    const status = code === "P0001" ? 429 : code === "23505" ? 409 : code === "42501" ? 403 : error instanceof SyntaxError ? 400 : 500;
    const message = status === 429 ? "Du hast in den letzten 24 Stunden bereits fünf Nachrichten gesendet. Bitte versuche es später erneut."
      : status === 403 ? "Bitte bestätige deine E-Mail-Adresse, bevor du Feedback sendest."
        : status === 409 ? "Diese Nachricht wurde bereits mit anderem Inhalt übermittelt. Bitte öffne das Formular erneut."
          : "Deine Nachricht konnte nicht gespeichert werden. Bitte versuche es erneut.";
    return NextResponse.json({ data: null, error: message }, { status });
  }
}
