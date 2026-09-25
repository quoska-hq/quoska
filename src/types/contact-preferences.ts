import { z } from "zod";

export const CONTACT_CONSENT_VERSION = "admin-checkin-v1";
export const CONTACT_CONSENT_LABEL = "Quoska darf mir per E-Mail Einstiegshilfe anbieten und nach längerer Nichtnutzung um Feedback bitten.";
export const CONTACT_CONSENT_DETAILS = "Dafür berücksichtigen wir, wann du und dein Team zuletzt aktiv waren. Freiwillig und jederzeit in den Einstellungen widerrufbar.";
export const CONTACT_CONSENT_TEXT = `${CONTACT_CONSENT_LABEL} ${CONTACT_CONSENT_DETAILS}`;

export const contactPreferenceSchema = z.object({
  enabled: z.boolean(),
  version: z.literal(CONTACT_CONSENT_VERSION),
  source: z.enum(["setup", "settings"]),
}).strict();

export interface ContactPreference {
  enabled: boolean;
  canEnable: boolean;
  eligible: boolean;
}
export interface ContactConsentEvent {
  id: number;
  email: string;
  enabled: boolean;
  text_version: string;
  consent_text: string;
  source: string;
  created_at: string;
}
