import { expect, it } from "vitest";
import { generateFeedbackCSV } from "@/services/feedbackExportService";
import type { FeedbackMessage } from "@/types/feedback";

it("exports full German dates and quotes multiline feedback without spreadsheet formulas", () => {
  const csv = generateFeedbackCSV([
    { id: "1", category: "feedback", message: '=HYPERLINK("https://example.test")\nZweite Zeile', created_at: "2026-09-12T12:00:00Z", page: "/app/help" },
  ] as FeedbackMessage[]);
  expect(csv).toContain("12.09.2026");
  expect(csv).toContain('"\'=HYPERLINK(""https://example.test"")\nZweite Zeile"');
});
