import { CONTACT_CONSENT_VERSION, type ContactPreference } from "@/types/contact-preferences";

export async function saveContactPreference(enabled: boolean, source: "setup" | "settings"): Promise<ContactPreference> {
  const response = await fetch("/api/v1/settings/contact", {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled, version: CONTACT_CONSENT_VERSION, source }),
  });
  const body = await response.json();
  if (!response.ok || !body.data) {
    throw new Error(body.error || "Die E-Mail-Auswahl konnte nicht gespeichert werden. Bitte versuche es erneut.");
  }
  return body.data;
}
