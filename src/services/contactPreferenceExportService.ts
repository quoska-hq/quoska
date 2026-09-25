import type { ContactConsentEvent } from "@/types/contact-preferences";
import { formatDateTimeDE } from "@/config/client/date-utils";
import { escapeCSV } from "@/services/exportService";

export function generateContactPreferenceCSV(events: ContactConsentEvent[]): string {
  const text = (value: string) => escapeCSV(/^\s*[=+\-@]/.test(value) ? `'${value}` : value);
  return ["", "# E-Mail-Einwilligungen", "Zeitpunkt,E-Mail,Auswahl,Textversion,Wortlaut,Bereich",
    ...events.map(event => [formatDateTimeDE(event.created_at), event.email,
      event.enabled ? "Zugestimmt" : "Widerrufen", event.text_version, event.consent_text,
      event.source === "setup" ? "Einrichtung" : "Einstellungen"].map(text).join(",")),
  ].join("\n");
}
