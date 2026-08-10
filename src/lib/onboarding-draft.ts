import type { SetupCompanyInput, SetupProfileInput } from "@/types/setup";
import {
  DEFAULT_WORK_SCHEDULE,
  normalizeWorkSchedule,
  type WorkSchedule,
} from "@/types/work-schedule";

export interface OnboardingInvite {
  firstName: string;
  lastName: string;
  email: string;
}

export type OnboardingDraftStep =
  | "profile"
  | "company"
  | "schedule"
  | "invite"
  | "review";

export interface OnboardingDraft {
  version: 1;
  email: string;
  profile: SetupProfileInput;
  company: SetupCompanyInput;
  schedule: WorkSchedule;
  invites: OnboardingInvite[];
  step: OnboardingDraftStep;
  awaitingVerification: boolean;
}

const STORAGE_KEY = "quoska:onboarding-draft:v1";

export function createOnboardingDraft(email: string): OnboardingDraft {
  return {
    version: 1,
    email: email.trim().toLowerCase(),
    profile: { firstName: "", lastName: "" },
    company: { companyName: "", bundesland: "" },
    schedule: { ...DEFAULT_WORK_SCHEDULE },
    invites: [],
    step: "profile",
    awaitingVerification: false,
  };
}

export function loadOnboardingDraft(): OnboardingDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft>;
    if (parsed.version !== 1 || typeof parsed.email !== "string") return null;

    return {
      ...createOnboardingDraft(parsed.email),
      ...parsed,
      profile: {
        firstName: parsed.profile?.firstName ?? "",
        lastName: parsed.profile?.lastName ?? "",
      },
      company: {
        companyName: parsed.company?.companyName ?? "",
        bundesland: parsed.company?.bundesland ?? "",
      },
      schedule: normalizeWorkSchedule(parsed.schedule),
      invites: Array.isArray(parsed.invites) ? parsed.invites : [],
    };
  } catch {
    return null;
  }
}

export function saveOnboardingDraft(draft: OnboardingDraft): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(draft),
  );
}

export function clearOnboardingDraft(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
