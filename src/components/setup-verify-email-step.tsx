"use client";

import { useState } from "react";
import { createClient } from "@/config/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MailCheck } from "lucide-react";

interface SetupVerifyEmailStepProps {
  email: string;
  onBack: () => void;
}

export function SetupVerifyEmailStep({ email, onBack }: SetupVerifyEmailStepProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function resendConfirmation() {
    setLoading(true);
    setMessage(null);
    setError(null);

    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/setup`,
      },
    });

    if (resendError) {
      setError("Die Bestätigungs-E-Mail konnte nicht erneut gesendet werden.");
    } else {
      setMessage("Wir haben dir eine neue Bestätigungs-E-Mail geschickt.");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-5 text-center">
      <MailCheck className="mx-auto size-11 text-[#6658d3]" />
      <div>
        <h2 className="text-xl font-semibold">Jetzt noch deine E-Mail bestätigen</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Deine Einrichtung ist vollständig vorbereitet. Öffne den Bestätigungslink, den wir an
          {" "}<strong className="text-slate-800">{email}</strong> geschickt haben. Erst danach
          wird deine Firma angelegt und du kommst ins Dashboard.
        </p>
      </div>

      <Alert className="text-left">
        <AlertDescription>
          Du kannst dieses Fenster schließen. Deine Angaben bleiben in diesem Browser gespeichert.
        </AlertDescription>
      </Alert>
      {message && <Alert><AlertDescription>{message}</AlertDescription></Alert>}
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onBack}>Angaben ändern</Button>
        <Button className="flex-1" onClick={() => void resendConfirmation()} disabled={loading}>
          {loading ? "Wird gesendet…" : "E-Mail erneut senden"}
        </Button>
      </div>
    </div>
  );
}
