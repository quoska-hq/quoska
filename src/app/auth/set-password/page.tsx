"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/config/supabase/client";
import {
  setPasswordInputSchema,
  type SetPasswordInput,
} from "@/types/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordInput>({
    resolver: zodResolver(setPasswordInputSchema),
    defaultValues: { password: "", passwordConfirmation: "" },
  });

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active || !session) return;
      setReady(true);
      setSessionError(null);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) {
        setReady(true);
        setSessionError(null);
      } else {
        setSessionError("Der Link ist ungültig oder abgelaufen. Bitte fordere eine neue E-Mail an.");
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(values: SetPasswordInput) {
    setSessionError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: values.password });

    if (error) {
      setError("root", {
        message: "Das Passwort konnte nicht gespeichert werden. Bitte fordere eine neue E-Mail an.",
      });
      return;
    }

    // Invitations receive their tenant claims after the invite was created.
    // Refresh once so the first dashboard request carries those current claims.
    await supabase.auth.refreshSession();
    router.replace("/app/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f3ee] p-4">
      <div className="w-full max-w-md border-t-2 border-slate-950 bg-white p-8 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6658d3]">
          Sicherer Zugang
        </p>
        <h1 className="mb-2 font-serif text-3xl tracking-[-0.035em] text-slate-950">
          Neues Passwort festlegen
        </h1>
        <p className="mb-7 text-sm text-slate-500">
          Verwende mindestens acht Zeichen und wiederhole das Passwort zur Sicherheit.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Neues Passwort</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              disabled={!ready || isSubmitting}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="passwordConfirmation">Passwort wiederholen</Label>
            <Input
              id="passwordConfirmation"
              type="password"
              autoComplete="new-password"
              disabled={!ready || isSubmitting}
              {...register("passwordConfirmation")}
            />
            {errors.passwordConfirmation && (
              <p className="text-xs text-destructive">{errors.passwordConfirmation.message}</p>
            )}
          </div>

          {(sessionError || errors.root?.message) && (
            <Alert variant="destructive">
              <AlertDescription>{sessionError || errors.root?.message}</AlertDescription>
            </Alert>
          )}

          <Button className="h-10 w-full" type="submit" disabled={!ready || isSubmitting}>
            {isSubmitting ? "Wird gespeichert…" : "Passwort speichern"}
          </Button>
        </form>
      </div>
    </main>
  );
}
