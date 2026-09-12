import { createClient } from "@/config/supabase/server";
import { isSiteAnalyticsAdmin } from "@/config/server/site-analytics-access";
import { FeedbackForm } from "@/components/feedback-form";
import { FeedbackInbox } from "@/components/feedback-inbox";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { legalInfo } from "@/lib/site";
import { Mail } from "lucide-react";

export default async function HelpPage() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  return (
    <div>
      <PageHeader title="Hilfe & Feedback" description="Deine Fragen und Ideen machen Quoska besser." />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <Card className="bg-white">
          <CardHeader><CardTitle>Schreib uns</CardTitle><p className="mt-1 text-sm text-slate-500">Was können wir für dich verbessern?</p></CardHeader>
          <CardContent><FeedbackForm /></CardContent>
        </Card>
        <Card className="bg-[#faf9f6]">
          <CardHeader><Mail className="mb-2 size-5 text-[#6658d3]" /><CardTitle>Lieber per E-Mail?</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-slate-600">
            <p>Du erreichst uns auch direkt. Für Screenshots oder andere Anhänge nutze bitte E-Mail.</p>
            <a href={`mailto:${legalInfo.email}`} className="inline-block break-all font-medium text-[#6658d3] underline underline-offset-4">{legalInfo.email}</a>
            {user?.email && <p className="border-t border-slate-200 pt-3 text-xs">Auf Nachrichten aus dem Formular antworten wir an <span className="break-all font-medium">{user.email}</span>.</p>}
          </CardContent>
        </Card>
      </div>
      {user && isSiteAnalyticsAdmin(user.email) && <FeedbackInbox />}
    </div>
  );
}
