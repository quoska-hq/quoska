import type { SupabaseClient } from "@supabase/supabase-js";
import { getFeedbackMailTransport } from "@/config/server/feedback-mail";
import { getNowIso } from "@/config/server/timestamps";
import { claimFeedbackDelivery, finishFeedbackDelivery } from "@/repos/feedbackRepo";
import { feedbackCategories, type FeedbackMessage } from "@/types/feedback";

export async function deliverFeedback(admin: SupabaseClient, feedback: FeedbackMessage): Promise<void> {
  try {
    if (!await claimFeedbackDelivery(admin, feedback.id)) return;
    const { transport, from, to } = getFeedbackMailTransport();
    const info = await transport.sendMail({
      from: { name: "Quoska App-Feedback", address: from },
      to, replyTo: { name: feedback.sender_name, address: feedback.sender_email },
      messageId: `<feedback-${feedback.id}@${from.split("@")[1]}>`,
      subject: `[Quoska] ${feedbackCategories[feedback.category]}`,
      text: [
        `${feedbackCategories[feedback.category]} aus der Quoska-App`,
        `Von: ${feedback.sender_name} <${feedback.sender_email}>`,
        `Bereich: ${feedback.page}`, "", feedback.message, "", `Referenz: ${feedback.id}`,
      ].join("\n"),
      headers: { "Auto-Submitted": "auto-generated", "X-Auto-Response-Suppress": "All" },
    });
    if (!info.accepted?.length) throw new Error("recipient rejected");
    await finishFeedbackDelivery(admin, feedback.id, getNowIso());
  } catch {
    // Contents and credentials must never enter logs. SMTP outcomes may be
    // ambiguous: keep the original submission in the inbox, never blindly retry.
    console.warn("feedback_delivery_requires_review", feedback.id);
    await finishFeedbackDelivery(admin, feedback.id, null).catch(() => undefined);
  }
}
