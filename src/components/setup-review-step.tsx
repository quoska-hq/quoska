"use client";

import type { SetupCompanyInput, SetupProfileInput } from "@/types/setup";
import { getBundeslandLabel } from "@/types/tenant";
import { formatWorkMinutes, totalScheduleMinutes, type WorkSchedule } from "@/types/work-schedule";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface InviteSummary {
  firstName: string;
  lastName: string;
  email: string;
  employmentStartDate: string;
  initialOvertimeHours: number;
}

interface SetupReviewStepProps {
  profile: SetupProfileInput;
  company: SetupCompanyInput;
  schedule: WorkSchedule;
  invites: InviteSummary[];
  onBack: () => void;
  onConfirm: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function SetupReviewStep({
  profile,
  company,
  schedule,
  invites,
  onBack,
  onConfirm,
  loading,
  error,
}: SetupReviewStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Alles richtig?</h2>
        <p className="mt-1 text-sm text-muted-foreground">Prüfe deine Angaben vor dem Abschluss.</p>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <dl className="divide-y border border-slate-200 text-sm">
        <div className="grid grid-cols-[8rem_1fr] gap-3 px-4 py-3"><dt className="text-slate-500">Name</dt><dd className="font-medium">{profile.firstName} {profile.lastName}</dd></div>
        <div className="grid grid-cols-[8rem_1fr] gap-3 px-4 py-3"><dt className="text-slate-500">Eintritt</dt><dd className="font-medium">{formatDate(profile.employmentStartDate)}</dd></div>
        <div className="grid grid-cols-[8rem_1fr] gap-3 px-4 py-3"><dt className="text-slate-500">Startsaldo</dt><dd className="font-medium">{formatHours(profile.initialOvertimeHours)}</dd></div>
        <div className="grid grid-cols-[8rem_1fr] gap-3 px-4 py-3"><dt className="text-slate-500">Firma</dt><dd className="font-medium">{company.companyName}</dd></div>
        <div className="grid grid-cols-[8rem_1fr] gap-3 px-4 py-3"><dt className="text-slate-500">Bundesland</dt><dd className="font-medium">{getBundeslandLabel(company.bundesland)}</dd></div>
        <div className="grid grid-cols-[8rem_1fr] gap-3 px-4 py-3"><dt className="text-slate-500">Arbeitszeit</dt><dd className="font-medium">{formatWorkMinutes(totalScheduleMinutes(schedule))}/Woche</dd></div>
        <div className="grid grid-cols-[8rem_1fr] gap-3 px-4 py-3"><dt className="text-slate-500">Einladungen</dt><dd className="font-medium">{invites.length === 0 ? "Keine – kann später erfolgen" : invites.map((invite) => `${invite.firstName} ${invite.lastName}`).join(", ")}</dd></div>
      </dl>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onBack}>Zurück</Button>
        <Button className="flex-1" onClick={() => void onConfirm()} disabled={loading}>
          {loading ? "Wird eingerichtet…" : "Einrichtung abschließen"}
        </Button>
      </div>
    </div>
  );
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

function formatHours(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("de-DE")} Std.`;
}
