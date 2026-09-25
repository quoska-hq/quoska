"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { saveContactPreference } from "@/lib/contact-preferences";
import { type ContactPreference } from "@/types/contact-preferences";
import { ContactConsentField } from "@/components/contact-consent-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ContactPreferencesCard() {
  const client = useQueryClient();
  const [choice, setChoice] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const query = useQuery<ContactPreference>({
    queryKey: ["contact-preference"],
    queryFn: async () => {
      const response = await fetch("/api/v1/settings/contact");
      const body = await response.json();
      if (!response.ok || !body.data) throw new Error("E-Mail-Einstellung konnte nicht geladen werden.");
      return body.data;
    },
  });
  async function save(enabled: boolean) {
    setSaving(true); setMessage(null); setError(null);
    try {
      const preference = await saveContactPreference(enabled, "settings");
      client.setQueryData(["contact-preference"], preference);
      setChoice(null);
      setMessage(enabled ? "Deine Einwilligung ist gespeichert." : "Deine Einwilligung ist widerrufen. Du erhältst keine weiteren Einstiegs- oder Feedbackmails.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Speichern fehlgeschlagen.");
    } finally { setSaving(false); }
  }
  if (query.isPending) return null;
  if (query.data && !query.data.canEnable && !query.data.enabled) return null;
  const checked = choice ?? (query.data?.canEnable && !query.data.eligible ? false : query.data?.enabled ?? false);
  return (
    <Card data-testid="contact-preferences">
      <CardHeader><CardTitle>Einstieg &amp; Feedback per E-Mail</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {query.isError ? <p role="alert">E-Mail-Einstellung konnte nicht geladen werden. <button className="underline" onClick={() => void query.refetch()}>Erneut versuchen</button></p> : <>
          <ContactConsentField checked={checked} disabled={saving || !query.data?.canEnable} onChange={value => { setChoice(value); setMessage(null); }} />
          {query.data?.enabled && !query.data.eligible && <p className="text-sm text-muted-foreground">Der Versand ist für dein Konto ausgesetzt. Nach einem E-Mail-Wechsel ist eine neue Zustimmung erforderlich.</p>}
          <div className="flex flex-wrap gap-2">
            {query.data?.canEnable && <Button variant="outline" disabled={saving || choice === null} onClick={() => void save(checked)}>{saving ? "Wird gespeichert…" : "Auswahl speichern"}</Button>}
            {query.data?.enabled && <Button variant="ghost" disabled={saving} onClick={() => void save(false)}>Einwilligung widerrufen</Button>}
          </div>
        </>}
        {message && <p role="status" className="text-sm">{message}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
