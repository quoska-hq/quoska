/**
 * Registration page — create company account.
 *
 * Flow:
 * 1. Sign up with Supabase Auth (email + password only)
 * 2. Store an onboarding draft without sensitive credentials
 * 3. Redirect to /setup; persistence happens after email verification
 *
 * Uses React Hook Form + Zod for validation.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/config/supabase/client";
import { GoogleSignInButton, isGoogleOAuthEnabled } from "@/components/google-sign-in-button";
import { registerInputSchema, type RegisterInput } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createOnboardingDraft, saveOnboardingDraft } from "@/lib/onboarding-draft";

export default function RegisterPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerInputSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // Step 1: Create Supabase Auth user
      const { data: authData, error: authError } =
        await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/setup`,
          },
        });

      if (authError) {
        // Map common Supabase errors to German messages
        if (authError.message.includes("already registered")) {
          setServerError("Diese E-Mail ist bereits registriert.");
        } else {
          setServerError(
            "Registrierung fehlgeschlagen. Bitte versuche es erneut."
          );
        }
        return;
      }

      if (!authData.user?.id) {
        setServerError("Registrierung fehlgeschlagen. Bitte versuche es erneut.");
        return;
      }

      // The draft intentionally contains no password. On hosted Supabase the
      // user can complete it before confirming their email; local Supabase
      // auto-confirms accounts so the same flow remains easy to test.
      saveOnboardingDraft(createOnboardingDraft(values.email));

      // Full navigation ensures a locally auto-confirmed session cookie is
      // visible to middleware. Hosted signups continue as a public draft.
      // eslint-disable-next-line react-hooks/immutability -- full navigation needed for cookie propagation
      window.location.href = "/setup";
    } catch {
      setServerError("Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6658d3]">
        Kostenlos starten
      </p>
      <h1 className="mb-7 font-serif text-3xl tracking-[-0.035em] text-slate-950">
        Account erstellen
      </h1>

      <p className="mb-6 text-sm text-slate-500">
        Zuerst nur die Zugangsdaten. Dein Profil und deine Firma richtest du direkt danach ein.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
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
            <p className="text-xs text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password">Passwort</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Mindestens 8 Zeichen"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Server error */}
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        {/* Submit */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-10 w-full"
        >
          {isSubmitting ? "Account wird erstellt…" : "Weiter zur Einrichtung"}
        </Button>
      </form>

      {/* Google OAuth — only shown when enabled on the hosted build */}
      {isGoogleOAuthEnabled() && (
        <>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-900/15" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400">oder</span>
            </div>
          </div>
          <GoogleSignInButton label="Mit Google registrieren" />
        </>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        Schon ein Account?{" "}
        <Link
          href="/login"
          className="font-semibold text-[#6658d3] hover:text-slate-950"
        >
          Anmelden
        </Link>
      </p>
    </div>
  );
}
