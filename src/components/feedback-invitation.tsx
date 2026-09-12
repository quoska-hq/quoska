"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, X } from "lucide-react";
import { useSupabase } from "@/providers/supabase-provider";
import { getCurrentEpochDays } from "@/config/client/date-utils";
import type { FeedbackPromptState } from "@/types/feedback";
import { FeedbackForm } from "@/components/feedback-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

async function updatePrompt(action: "visit" | "claim" | "dismiss"): Promise<FeedbackPromptState | null> {
  try {
    const response = await fetch("/api/v1/feedback/prompt", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
    });
    return response.ok ? (await response.json()).data : null;
  } catch { return null; }
}

export function FeedbackInvitation() {
  const { user } = useSupabase();
  const pathname = usePathname();
  const [invitedUser, setInvitedUser] = useState<string | null>(null);
  const handledUser = useRef<string | null>(null);
  const visit = useRef<{ userId: string; day: number; eligible: boolean } | null>(null);

  useEffect(() => {
    if (!user?.id || handledUser.current === user.id) return;
    const userId = user.id;
    let stopped = false;
    let checking = false;
    let timer: ReturnType<typeof setTimeout>;
    if (pathname === "/app/help") {
      // Opening the permanent feedback form also opts out of future invitations.
      void updatePrompt("dismiss").then((result) => { if (result) handledUser.current = userId; });
      return;
    }

    async function recordVisit() {
      const day = getCurrentEpochDays();
      if (visit.current?.userId !== userId || visit.current.day !== day) {
        const state = await updatePrompt("visit");
        if (!state || stopped) return false;
        visit.current = { userId, day, eligible: state.eligible };
      }
      return visit.current.eligible;
    }

    async function check() {
      if (stopped || checking || document.visibilityState !== "visible") return;
      checking = true;
      try {
        if (!await recordVisit() || !["/app/dashboard", "/app/clock"].includes(pathname)) return;
        const otherDialog = [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')]
          .some((element) => !element.hasAttribute("data-closed") && element.getClientRects().length > 0);
        if (otherDialog ||
          document.activeElement?.matches('input, textarea, select, [contenteditable="true"]')) {
          timer = setTimeout(check, 15_000);
          return;
        }
        const state = await updatePrompt("claim");
        if (!state || stopped) return;
        handledUser.current = userId;
        if (state.claimed) setInvitedUser(userId);
      } finally { checking = false; }
    }
    if (document.visibilityState === "visible") void recordVisit();
    // Let people finish arriving/stamping before offering the once-only dialog.
    timer = setTimeout(check, 30_000);
    const onVisible = () => {
      clearTimeout(timer);
      if (document.visibilityState === "visible") timer = setTimeout(check, 30_000);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => { stopped = true; clearTimeout(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [user?.id, pathname]);

  return (
    <Dialog open={Boolean(user?.id && invitedUser === user.id)} onOpenChange={(open) => { if (!open) setInvitedUser(null); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg" showCloseButton={false} data-testid="feedback-invitation">
        <Button variant="ghost" size="icon-sm" className="absolute right-3 top-3" aria-label="Feedback-Hinweis schließen" onClick={() => setInvitedUser(null)}><X className="size-4" /></Button>
        <DialogHeader className="pr-6">
          <span className="mb-1 flex size-10 items-center justify-center rounded-full bg-[#f3f0fc] text-[#6658d3]"><MessageSquare className="size-5" /></span>
          <DialogTitle className="text-xl">Wie läuft’s mit Quoska?</DialogTitle>
          <DialogDescription className="leading-relaxed">Du nutzt Quoska schon eine Weile. Was hilft dir im Alltag, was fehlt noch? Wir freuen uns über deine Rückmeldung.</DialogDescription>
        </DialogHeader>
        <FeedbackForm onDone={() => setInvitedUser(null)} />
        <p className="border-t border-slate-100 pt-3 text-[11px] text-slate-500">Diesen Hinweis zeigen wir dir nur einmal. Unter „Hilfe &amp; Feedback“ kannst du uns jederzeit schreiben.</p>
      </DialogContent>
    </Dialog>
  );
}
