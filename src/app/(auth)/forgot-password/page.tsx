"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/config/supabase/client";
import {
  forgotPasswordInputSchema,
  type ForgotPasswordInput,
} from "@/types/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestComplete, setRequestComplete] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordInputSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/auth/set-password`,
      });
    } catch {
      // Keep the response indistinguishable from an unknown email address.
    } finally {
      // Deliberately identical for existing, unknown and temporarily failing
      // addresses so this page cannot be used for account enumeration.
      setRequestComplete(true);
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6658d3]">
        Zugang wiederherstellen
      </p>
      <h1 className="mb-3 font-serif text-3xl tracking-[-0.035em] text-slate-950">
        Passwort zurücksetzen
      </h1>
      <p className="mb-7 text-sm leading-6 text-slate-500">
        Wir senden dir einen sicheren Link, mit dem du ein neues Passwort festlegen kannst.
      </p>

      {requestComplete ? (
        <div className="space-y-6">
          <Alert>
            <AlertDescription>
              Falls für diese Adresse ein Konto besteht, erhältst du eine E-Mail. Prüfe bitte auch deinen Spam-Ordner oder versuche es später erneut.
            </AlertDescription>
          </Alert>
          <Link
            href="/login"
            className="block text-center text-sm font-semibold text-[#6658d3] hover:text-slate-950"
          >
            Zurück zur Anmeldung
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@firma.de"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting} className="h-10 w-full">
            {isSubmitting ? "Wird gesendet…" : "Reset-Link senden"}
          </Button>

          <Link
            href="/login"
            className="block text-center text-sm font-semibold text-[#6658d3] hover:text-slate-950"
          >
            Zurück zur Anmeldung
          </Link>
        </form>
      )}
    </div>
  );
}
