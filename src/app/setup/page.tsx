"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/config/supabase/client";
import type { SetupCompanyInput, SetupProfileInput } from "@/types/setup";
import {
  DEFAULT_WORK_SCHEDULE,
  normalizeWorkSchedule,
  scheduleHours,
  type WorkSchedule,
} from "@/types/work-schedule";
import {
  clearOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
  type OnboardingDraft,
  type OnboardingDraftStep,
  type OnboardingInvite,
} from "@/lib/onboarding-draft";
import { SetupProfileStep } from "@/components/setup-profile-step";
import { CompanyStep } from "@/components/setup-company-step";
import { SetupScheduleStep } from "@/components/setup-schedule-step";
import { InviteStep } from "@/components/setup-invite-step";
import { SetupReviewStep } from "@/components/setup-review-step";
import { SetupVerifyEmailStep } from "@/components/setup-verify-email-step";
import { SetupProgress } from "@/components/setup-progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PartyPopper } from "lucide-react";

type SetupStep = OnboardingDraftStep | "verify" | "done";

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<SetupStep>("profile");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<SetupProfileInput>({ firstName: "", lastName: "" });
  const [company, setCompany] = useState<SetupCompanyInput>({ companyName: "", bundesland: "" });
  const [schedule, setSchedule] = useState<WorkSchedule>({ ...DEFAULT_WORK_SCHEDULE });
  const [invites, setInvites] = useState<OnboardingInvite[]>([]);

  useEffect(() => {
    async function loadSetup() {
      const draft = loadOnboardingDraft();
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        if (!draft) {
          router.replace("/register");
          return;
        }
        hydrateDraft(draft, false);
        setReady(true);
        return;
      }

      const response = await fetch("/api/v1/tenants/setup");
      const result = await response.json();
      if (response.ok && result.data?.setupComplete) {
        clearOnboardingDraft();
        router.push("/app/dashboard");
        return;
      }

      const matchingDraft = draft && draft.email === user.email?.toLowerCase()
        ? draft
        : null;
      if (matchingDraft) {
        hydrateDraft(matchingDraft, true);
      } else if (response.ok && result.data) {
        const loadedProfile = result.data.profile;
        setEmail(loadedProfile?.email ?? user.email ?? "");
        setProfile({
          firstName: loadedProfile?.firstName ?? "",
          lastName: loadedProfile?.lastName ?? "",
        });
        setCompany({
          companyName: result.data.company?.name ?? "",
          bundesland: result.data.company?.bundesland ?? loadedProfile?.bundesland ?? "",
        });
        setSchedule(normalizeWorkSchedule(
          loadedProfile?.workSchedule ?? result.data.company?.defaultWorkSchedule,
          Number(loadedProfile?.targetHoursWeek ?? 40),
        ));
      } else if (response.status === 404) {
        // New email/OAuth account: the tenant is deliberately created only
        // after the verified onboarding draft is submitted.
        setEmail(user.email ?? "");
      } else {
        setError(result.error || "Einrichtung konnte nicht geladen werden.");
      }
      setReady(true);
    }

    function hydrateDraft(draft: OnboardingDraft, authenticated: boolean) {
      setEmail(draft.email);
      setProfile(draft.profile);
      setCompany(draft.company);
      setSchedule(normalizeWorkSchedule(draft.schedule));
      setInvites(draft.invites);
      setStep(draft.awaitingVerification
        ? authenticated ? "review" : "verify"
        : draft.step);
    }

    void loadSetup();
  }, [router]);

  function persistDraft(
    nextStep: OnboardingDraftStep,
    overrides: Partial<Pick<OnboardingDraft, "profile" | "company" | "schedule" | "invites" | "awaitingVerification">> = {},
  ) {
    saveOnboardingDraft({
      version: 1,
      email: email.trim().toLowerCase(),
      profile: overrides.profile ?? profile,
      company: overrides.company ?? company,
      schedule: overrides.schedule ?? schedule,
      invites: overrides.invites ?? invites,
      step: nextStep,
      awaitingVerification: overrides.awaitingVerification ?? false,
    });
  }

  function goTo(next: SetupStep) {
    setError(null);
    setStep(next);
  }

  async function updateOwnProfile(body: Record<string, unknown>) {
    const response = await fetch("/api/v1/employees/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok || result.error) {
      throw new Error(result.error || "Profil konnte nicht gespeichert werden.");
    }
  }

  async function onSubmitProfile(data: SetupProfileInput) {
    setProfile(data);
    persistDraft("company", { profile: data });
    goTo("company");
  }

  async function onSubmitCompany(data: SetupCompanyInput) {
    setCompany(data);
    persistDraft("schedule", { company: data });
    goTo("schedule");
  }

  async function onSubmitSchedule() {
    persistDraft("invite", { schedule });
    goTo("invite");
  }

  async function onContinueInvites() {
    const incomplete = invites.some(
      (invite) => !invite.firstName.trim() || !invite.lastName.trim() || !invite.email.trim(),
    );
    if (incomplete) {
      setError("Bitte fülle alle Felder der Einladung aus oder entferne die Zeile.");
      return;
    }
    persistDraft("review", { invites });
    goTo("review");
  }

  async function finishSetup() {
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const mayBypassVerificationLocally = process.env.NODE_ENV !== "production";

    if (!user || (!user.email_confirmed_at && !mayBypassVerificationLocally)) {
      persistDraft("review", { awaitingVerification: true });
      goTo("verify");
      return;
    }

    setLoading(true);
    try {
      // Idempotently provision the tenant now, not when the unverified auth
      // account is created. Existing setup accounts are returned unchanged.
      const registerResponse = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: company.companyName,
          firstName: profile.firstName,
          lastName: profile.lastName,
        }),
      });
      const registerResult = await registerResponse.json();
      if (!registerResponse.ok || registerResult.error) {
        throw new Error(registerResult.error || "Firma konnte nicht angelegt werden.");
      }

      await supabase.auth.refreshSession();
      await updateOwnProfile({ ...profile, workSchedule: schedule });

      const companyResponse = await fetch("/api/v1/tenants/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(company),
      });
      const companyResult = await companyResponse.json();
      if (!companyResponse.ok || companyResult.error) {
        throw new Error(companyResult.error || "Firmendaten konnten nicht gespeichert werden.");
      }

      for (const invite of invites) {
        const response = await fetch("/api/v1/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: invite.firstName.trim(),
            lastName: invite.lastName.trim(),
            email: invite.email.trim(),
            role: "employee",
            targetHoursWeek: scheduleHours(schedule),
            workSchedule: schedule,
            bundesland: company.bundesland,
          }),
        });
        const result = await response.json();
        if (!response.ok || result.error) throw new Error(result.error);
      }

      const response = await fetch("/api/v1/tenants/complete", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupComplete: true }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "Einrichtung konnte nicht abgeschlossen werden.");
      }
      clearOnboardingDraft();
      goTo("done");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Verbindung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f3ee]">
        <p className="text-sm text-muted-foreground">Einrichtung wird geladen…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-[#f5f3ee] px-4 pb-10 pt-[clamp(2rem,8vh,5rem)]">
      <Card className="w-full max-w-2xl border-t-2 border-t-slate-950 shadow-sm">
        <CardContent className="p-6 sm:p-8">
          <div className="mb-7 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6658d3]">Quoska einrichten</p>
            <h1 className="font-serif text-3xl font-medium tracking-[-0.035em]">Willkommen bei Quoska</h1>
            <p className="mt-1 text-sm text-muted-foreground">In wenigen Schritten ist deine Zeiterfassung startklar.</p>
          </div>

          <SetupProgress currentStep={step} />

          {step === "profile" && (
            <SetupProfileStep initialData={profile} email={email} onSubmit={onSubmitProfile} loading={loading} error={error} />
          )}
          {step === "company" && (
            <CompanyStep initialData={company} onSubmit={onSubmitCompany} onBack={() => goTo("profile")} loading={loading} error={error} />
          )}
          {step === "schedule" && (
            <SetupScheduleStep schedule={schedule} setSchedule={setSchedule} onSubmit={onSubmitSchedule} onBack={() => goTo("company")} loading={loading} error={error} />
          )}
          {step === "invite" && (
            <InviteStep invites={invites} setInvites={setInvites} onSubmit={onContinueInvites} onBack={() => goTo("schedule")} loading={loading} error={error} />
          )}
          {step === "review" && (
            <SetupReviewStep profile={profile} company={company} schedule={schedule} invites={invites} onBack={() => goTo("invite")} onConfirm={finishSetup} loading={loading} error={error} />
          )}
          {step === "verify" && (
            <SetupVerifyEmailStep
              email={email}
              onBack={() => {
                persistDraft("review", { awaitingVerification: false });
                goTo("review");
              }}
            />
          )}
          {step === "done" && (
            <div className="space-y-4 text-center">
              <PartyPopper className="mx-auto size-10 text-amber-500" />
              <h2 className="text-lg font-semibold">Alles eingerichtet!</h2>
              <p className="text-sm text-muted-foreground">Dein Profil, deine Arbeitswoche und deine Firma sind gespeichert.</p>
              <Button className="w-full" onClick={() => router.push("/app/dashboard")}>Zum Dashboard →</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
