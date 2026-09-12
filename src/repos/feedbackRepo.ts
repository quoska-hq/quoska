import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeedbackInput, FeedbackMessage, FeedbackPromptState } from "@/types/feedback";

export async function updateFeedbackPrompt(client: SupabaseClient, action: "visit" | "claim" | "dismiss"): Promise<FeedbackPromptState> {
  const { data, error } = await client.rpc("feedback_prompt", { p_action: action });
  if (error) throw error;
  return data;
}

export async function saveFeedback(client: SupabaseClient, input: FeedbackInput): Promise<FeedbackMessage> {
  const { data, error } = await client.rpc("submit_feedback", {
    p_id: input.id, p_category: input.category, p_message: input.message, p_page: input.page,
  });
  if (error) throw error;
  return data;
}

export async function claimFeedbackDelivery(admin: SupabaseClient, id: string): Promise<boolean> {
  const { data, error } = await admin.from("feedback_messages").update({ delivery_status: "sending" })
    .eq("id", id).eq("delivery_status", "pending").select("id").maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function finishFeedbackDelivery(admin: SupabaseClient, id: string, sentAt: string | null): Promise<void> {
  const { error } = await admin.from("feedback_messages").update({ delivery_status: sentAt ? "sent" : "failed", sent_at: sentAt })
    .eq("id", id).eq("delivery_status", "sending");
  if (error) throw error;
}

export async function getRecentFeedback(admin: SupabaseClient): Promise<FeedbackMessage[]> {
  const { data, error } = await admin.from("feedback_messages").select("*").order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function getOwnFeedback(client: SupabaseClient, employeeId: string): Promise<FeedbackMessage[]> {
  const rows: FeedbackMessage[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.from("feedback_messages").select("*")
      .eq("employee_id", employeeId).order("created_at").order("id").range(offset, offset + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}
