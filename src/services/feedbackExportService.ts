import type { FeedbackMessage } from "@/types/feedback";
import { feedbackCategories } from "@/types/feedback";
import { formatDateTimeDE } from "@/config/client/date-utils";
import { escapeCSV } from "@/services/exportService";

export function generateFeedbackCSV(messages: FeedbackMessage[]): string {
  // Free-form feedback must remain text when opened in a spreadsheet.
  const text = (value: string) => escapeCSV(/^[\s]*[=+\-@]/.test(value) ? `'${value}` : value);
  return [
    "", "# Eigene Rückmeldungen an Quoska", "Zeitpunkt,Art,Nachricht,Bereich,Referenz",
    ...messages.map((message) => [formatDateTimeDE(message.created_at), feedbackCategories[message.category],
      message.message, message.page, message.id].map(text).join(",")),
  ].join("\n");
}
