import { z } from "zod";

export const feedbackCategories = {
  feedback: "Feedback",
  bug: "Fehler melden",
  feature: "Funktionswunsch",
} as const;
export type FeedbackCategory = keyof typeof feedbackCategories;

export const feedbackSchema = z.object({
  id: z.string().uuid(),
  category: z.enum(["feedback", "bug", "feature"]),
  message: z.string().trim().min(10, "Bitte beschreibe dein Anliegen mit mindestens 10 Zeichen.").max(4000),
  page: z.string().max(100).regex(/^\/app\/[a-z/-]+$/),
}).strict();
export type FeedbackInput = z.infer<typeof feedbackSchema>;
export const feedbackPromptSchema = z.object({ action: z.enum(["visit", "claim", "dismiss"]) }).strict();
export interface FeedbackPromptState { eligible: boolean; claimed: boolean }
export interface FeedbackMessage {
  id: string;
  user_id: string;
  tenant_id: string;
  employee_id: string;
  sender_name: string;
  sender_email: string;
  category: FeedbackCategory;
  message: string;
  page: string;
  delivery_status: "pending" | "sending" | "sent" | "failed";
  created_at: string;
  sent_at: string | null;
}
