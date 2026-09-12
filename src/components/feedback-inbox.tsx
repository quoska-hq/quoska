import { createAdminClient } from "@/config/supabase/server";
import { getRecentFeedback } from "@/repos/feedbackRepo";
import { feedbackCategories } from "@/types/feedback";
import { formatCockpitTimestamp } from "@/components/cockpit-formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Rendered only after the operator allowlist check on /app/help.
export async function FeedbackInbox() {
  let messages;
  try { messages = await getRecentFeedback(createAdminClient()); }
  catch { return <p role="alert">Der Feedback-Posteingang konnte nicht geladen werden.</p>; }
  return (
    <Card className="mt-8" data-testid="feedback-inbox">
      <CardHeader><CardTitle>Feedback-Posteingang</CardTitle><p className="text-xs text-slate-500">Nur für den Quoska-Betreiber · letzte 50 Nachrichten</p></CardHeader>
      <CardContent className="divide-y divide-slate-200">
        {messages.length === 0 && <p className="py-5 text-sm text-slate-500">Noch keine Rückmeldungen.</p>}
        {messages.map((message) => (
          <details key={message.id} className="py-3">
            <summary className="cursor-pointer text-sm">
              <span className="font-medium">{feedbackCategories[message.category]} · {message.sender_name}</span>
              <span className="ml-2 text-xs text-slate-500">{formatCockpitTimestamp(message.created_at)}</span>
              {message.delivery_status !== "sent" && <span className="ml-2 text-xs text-amber-700">E-Mail-Zustellung prüfen</span>}
            </summary>
            <div className="space-y-3 pt-3 text-sm">
              <p className="whitespace-pre-wrap break-words">{message.message}</p>
              <p className="text-xs text-slate-500">{message.sender_email} · {message.page} · {message.id}</p>
              <a className="inline-block font-medium text-[#6658d3] underline" href={`mailto:${message.sender_email}?subject=${encodeURIComponent(`Re: [Quoska] ${feedbackCategories[message.category]}`)}`}>Per E-Mail antworten</a>
            </div>
          </details>
        ))}
      </CardContent>
    </Card>
  );
}
