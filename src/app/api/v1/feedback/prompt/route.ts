import { NextResponse } from "next/server";
import { createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";
import { updateFeedbackPrompt } from "@/repos/feedbackRepo";
import { feedbackPromptSchema } from "@/types/feedback";

export async function POST(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return new NextResponse(null, { status: 403 });
  try {
    const client = await createClient();
    const auth = await getEmployeeFromAuth(client);
    if (!auth.data) return new NextResponse(null, { status: 401 });
    const parsed = feedbackPromptSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return new NextResponse(null, { status: 400 });
    const data = await updateFeedbackPrompt(client, parsed.data.action);
    return NextResponse.json({ data, error: null }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ data: null, error: "Feedback-Hinweis nicht verfügbar." }, { status: 503 });
  }
}
