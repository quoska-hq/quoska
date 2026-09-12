import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeedbackMessage } from "@/types/feedback";

const mocks = vi.hoisted(() => ({ claim: vi.fn(), finish: vi.fn(), send: vi.fn() }));
vi.mock("@/repos/feedbackRepo", () => ({ claimFeedbackDelivery: mocks.claim, finishFeedbackDelivery: mocks.finish }));
vi.mock("@/config/server/feedback-mail", () => ({
  getFeedbackMailTransport: () => ({ transport: { sendMail: mocks.send }, from: "app@quoska.test", to: "support@quoska.test" }),
}));
vi.mock("@/config/server/timestamps", () => ({ getNowIso: () => "2026-09-12T12:00:00Z" }));
import { deliverFeedback } from "@/services/feedbackService";

const client = {} as SupabaseClient;
const feedback = {
  id: "message-1", sender_name: "Lena Beispiel", sender_email: "lena@example.test",
  category: "feature", message: "Ein Wunsch: <script>nicht ausführen</script>", page: "/app/clock",
} as FeedbackMessage;

describe("feedback email delivery", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.claim.mockResolvedValue(true); mocks.finish.mockResolvedValue(undefined); mocks.send.mockResolvedValue({ accepted: ["support@quoska.test"] }); });

  it("sends plain text to the configured support mailbox with a verified reply address", async () => {
    await deliverFeedback(client, feedback);
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      from: { name: "Quoska App-Feedback", address: "app@quoska.test" },
      to: "support@quoska.test", replyTo: { name: "Lena Beispiel", address: "lena@example.test" },
      subject: "[Quoska] Funktionswunsch", messageId: "<feedback-message-1@quoska.test>",
      text: expect.stringContaining(feedback.message), headers: expect.objectContaining({ "Auto-Submitted": "auto-generated" }),
    }));
    expect(mocks.send.mock.calls[0][0]).not.toHaveProperty("html");
    expect(mocks.finish).toHaveBeenCalledWith(client, feedback.id, "2026-09-12T12:00:00Z");
  });

  it("does not resend a claimed, delivered or failed message", async () => {
    mocks.claim.mockResolvedValue(false);
    await deliverFeedback(client, feedback);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("preserves the submission for operator review on an uncertain SMTP result", async () => {
    mocks.send.mockRejectedValue(new Error("Timeout with secret details"));
    const log = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await deliverFeedback(client, feedback);
    expect(mocks.finish).toHaveBeenCalledWith(client, feedback.id, null);
    expect(log).toHaveBeenCalledWith("feedback_delivery_requires_review", "message-1");
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret");
    log.mockRestore();
  });
});
