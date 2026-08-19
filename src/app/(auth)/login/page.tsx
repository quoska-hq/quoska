"use client";

/**
 * Login page — email + password authentication.
 *
 * Uses React Hook Form + Zod for validation.
 * On success redirects to /app/dashboard.
 * On failure shows generic German error (no hint which field is wrong).
 */

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/config/supabase/client";
import { loginInputSchema, type LoginInput } from "@/types/auth";
import { GoogleSignInButton, isGoogleOAuthEnabled } from "@/components/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

function safeRedirectPath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/app/dashboard";
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const linkError = searchParams.get("error") === "auth"
    ? "Der Link ist ungültig oder abgelaufen. Bitte fordere eine neue E-Mail an."
    : null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        setServerError("E-Mail oder Passwort falsch");
        return;
      }

      const redirectTo = safeRedirectPath(searchParams.get("redirect"));
      // eslint-disable-next-line react-hooks/immutability -- full navigation needed for cookie propagation
      window.location.href = redirectTo;
    } catch {
      setServerError("Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6658d3]">
        Willkommen zurück
      </p>
      <h1 className="mb-7 font-serif text-3xl tracking-[-0.035em] text-slate-950">
        Anmelden
      </h1>

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

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">Passwort</Label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-[#6658d3] hover:text-slate-950"
            >
              Passwort vergessen?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        {(serverError || linkError) && (
          <Alert variant="destructive">
            <AlertDescription>{serverError || linkError}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={isSubmitting} className="h-10 w-full">
          {isSubmitting ? "Anmeldung…" : "Anmelden"}
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
          <GoogleSignInButton next={safeRedirectPath(searchParams.get("redirect"))} />
        </>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        Noch kein Account?{" "}
        <Link
          href="/register"
          className="font-semibold text-[#6658d3] hover:text-slate-950"
        >
          Registrieren
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div>
          <h1 className="mb-6 font-serif text-3xl tracking-[-0.035em] text-slate-950">Anmelden</h1>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">E-Mail</label>
              <div className="h-9 bg-[#ebe8e0] animate-pulse" />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Passwort</label>
              <div className="h-9 bg-[#ebe8e0] animate-pulse" />
            </div>
            <div className="h-9 bg-[#ebe8e0] animate-pulse" />
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
