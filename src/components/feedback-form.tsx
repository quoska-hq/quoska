"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bug, Check, Lightbulb, MessageSquare, Send } from "lucide-react";
import { useSupabase } from "@/providers/supabase-provider";
import { feedbackCategories, type FeedbackCategory } from "@/types/feedback";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const icons = { feedback: MessageSquare, bug: Bug, feature: Lightbulb };
const placeholders = {
  feedback: "Was gefällt dir? Was könnten wir besser machen?",
  bug: "Was ist passiert und was hast du erwartet? Beschreibe kurz, wie der Fehler auftritt.",
  feature: "Was würdest du gerne mit Quoska erledigen? Wie würde dir die Funktion im Alltag helfen?",
};

export function FeedbackForm({ onDone }: { onDone?: () => void }) {
  const { user } = useSupabase();
  const pathname = usePathname();
  const router = useRouter();
  const [category, setCategory] = useState<FeedbackCategory>("feedback");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submission = useRef<{ id: string; category: FeedbackCategory; message: string; page: string } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (message.trim().length < 10) { setError("Bitte beschreibe dein Anliegen mit mindestens 10 Zeichen."); return; }
    setPending(true);
    setError(null);
    if (!submission.current || submission.current.message !== message.trim() || submission.current.category !== category) {
      submission.current = { id: crypto.randomUUID(), category, message: message.trim(), page: pathname };
    }
    try {
      const response = await fetch("/api/v1/feedback", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(submission.current),
      });
      const json = await response.json();
      if (!response.ok || !json.data?.id) throw new Error(json.error ?? "Senden fehlgeschlagen. Bitte versuche es erneut.");
      setSent(true);
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Keine Verbindung. Deine Nachricht bleibt im Formular erhalten.");
    } finally { setPending(false); }
  }

  if (sent) return (
    <div className="py-5 text-center" role="status">
      <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Check className="size-6" /></span>
      <p className="text-base font-semibold text-slate-900">Danke für deine Rückmeldung!</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">Deine Nachricht ist bei uns eingegangen.</p>
      {user?.email && <p className="mt-1 break-words text-xs text-slate-500">Bei Rückfragen antworten wir an {user.email}.</p>}
      {onDone && <Button className="mt-5" onClick={onDone}>Schließen</Button>}
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-5" data-testid="feedback-form">
      <fieldset disabled={pending}>
        <legend className="mb-2 text-xs font-medium text-slate-600">Worum geht es?</legend>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(feedbackCategories) as FeedbackCategory[]).map((value) => {
            const Icon = icons[value];
            return (
              <label key={value} className={`relative flex min-w-0 cursor-pointer flex-col items-center gap-2 rounded-sm border px-1 py-3 text-center text-[11px] font-medium transition-colors has-focus-visible:ring-2 has-focus-visible:ring-[#6658d3] sm:text-xs ${category === value ? "border-[#6658d3]/50 bg-[#f3f0fc] text-[#5548ba]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                <input className="absolute inset-0 z-10 size-full cursor-pointer opacity-0" type="radio" name="feedback-category" aria-label={feedbackCategories[value]} value={value} checked={category === value} onChange={() => setCategory(value)} />
                <Icon className="size-4" />
                <span className="max-w-full break-words">{value === "feature" ? <>Funktions&shy;wunsch</> : feedbackCategories[value]}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="space-y-2">
        <Label htmlFor="feedback-message">Deine Nachricht</Label>
        <Textarea
          id="feedback-message" value={message} onChange={(event) => setMessage(event.target.value)}
          placeholder={placeholders[category]} rows={5} maxLength={4000} required disabled={pending}
          className="min-h-32 resize-y bg-white leading-relaxed" aria-describedby="feedback-message-hint"
        />
        <div id="feedback-message-hint" className="flex justify-between gap-3 text-[11px] text-slate-500">
          <span>Ein paar Sätze reichen.</span><span className="shrink-0 tabular-nums">{message.length.toLocaleString("de-DE")} / 4.000</span>
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-64 text-xs leading-relaxed text-slate-500">Deine Nachricht geht direkt an das Quoska-Team.</p>
        <Button type="submit" disabled={pending || !message.trim()} className="h-10 gap-2 px-4">
          <Send className="size-4" />{pending ? "Wird gesendet…" : "Nachricht senden"}
        </Button>
      </div>
    </form>
  );
}
