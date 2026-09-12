import Link from "next/link";
import { MessageSquare, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function FeedbackSettingsCard() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-[#f3f0fc] text-[#6658d3]"><MessageSquare className="size-4" /></span>
          <div><h2 className="font-medium text-slate-900">Hilfe &amp; Feedback</h2><p className="mt-1 text-sm text-slate-500">Eine Frage, ein Fehler oder eine Idee? Schreib uns.</p></div>
        </div>
        <Link href="/app/help" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-sm border border-slate-200 px-3 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-[#6658d3]">Nachricht schreiben<ArrowUpRight className="size-4" /></Link>
      </CardContent>
    </Card>
  );
}
