import { z } from "zod";
import type { MarketingPlacement } from "@/types/site-analytics";

const STORAGE_KEY = "quoska:signup-attribution:v1";
const ATTRIBUTION_TTL_MS = 90 * 24 * 60 * 60 * 1_000;

const nullableText = (max: number) => z.string().trim().min(1).max(max).nullable();

export const signupTouchSchema = z.object({
  source: z.string().trim().min(1).max(120),
  path: z.string().startsWith("/").max(180),
  referrerHost: nullableText(120),
  utmSource: nullableText(80),
  utmMedium: nullableText(80),
  utmCampaign: nullableText(120),
  occurredAt: z.string().datetime(),
});

export const signupAttributionSchema = z.object({
  version: z.literal(1),
  firstTouch: signupTouchSchema,
  lastTouch: signupTouchSchema,
  signupSourcePath: z.string().startsWith("/").max(180).nullable(),
  signupPlacement: z.enum(["hero", "pricing", "final_cta"]).nullable(),
  signupStartedAt: z.string().datetime().nullable(),
});

export type SignupTouch = z.infer<typeof signupTouchSchema>;
export type SignupAttribution = z.infer<typeof signupAttributionSchema>;

interface TouchInput {
  path: string;
  referrerHost: string | null;
  internalReferrer: boolean;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  occurredAt: string;
}

export function buildSignupAttribution(
  existing: SignupAttribution | null,
  input: TouchInput,
): SignupAttribution {
  const source = input.utmSource
    ?? input.referrerHost
    ?? (input.internalReferrer ? existing?.lastTouch.source : null)
    ?? "Direkt";
  const touch: SignupTouch = {
    source,
    path: input.path,
    referrerHost: input.referrerHost,
    utmSource: input.utmSource,
    utmMedium: input.utmMedium,
    utmCampaign: input.utmCampaign,
    occurredAt: input.occurredAt,
  };

  return {
    version: 1,
    firstTouch: existing?.firstTouch ?? touch,
    lastTouch: touch,
    signupSourcePath: existing?.signupSourcePath ?? null,
    signupPlacement: existing?.signupPlacement ?? null,
    signupStartedAt: existing?.signupStartedAt ?? null,
  };
}

export function captureSignupAttribution(path: string): SignupAttribution | null {
  if (typeof window === "undefined" || navigator.doNotTrack === "1") return null;

  const query = new URLSearchParams(window.location.search);
  const referrer = referrerDetails(document.referrer, window.location.hostname);
  // eslint-disable-next-line @quoska/legal/no-client-timestamps -- Marketing attribution is not a recorded work or audit timestamp.
  const now = new Date().toISOString();
  const existing = loadSignupAttribution(now);
  const candidate = buildSignupAttribution(existing, {
    path,
    referrerHost: referrer.host,
    internalReferrer: referrer.internal,
    utmSource: clean(query.get("utm_source"), 80),
    utmMedium: clean(query.get("utm_medium"), 80),
    utmCampaign: clean(query.get("utm_campaign"), 120),
    occurredAt: now,
  });
  const parsed = signupAttributionSchema.safeParse(candidate);
  if (!parsed.success) return existing;
  save(parsed.data);
  return parsed.data;
}

export function recordSignupAttributionCta(
  sourcePath: string,
  placement: MarketingPlacement,
): SignupAttribution | null {
  if (typeof window === "undefined" || navigator.doNotTrack === "1") return null;

  const existing = loadSignupAttribution() ?? captureSignupAttribution(sourcePath);
  if (!existing) return null;
  // eslint-disable-next-line @quoska/legal/no-client-timestamps -- Marketing attribution is not a recorded work or audit timestamp.
  const signupStartedAt = new Date().toISOString();
  const candidate: SignupAttribution = {
    ...existing,
    signupSourcePath: sourcePath,
    signupPlacement: placement,
    signupStartedAt,
  };
  const parsed = signupAttributionSchema.safeParse(candidate);
  if (!parsed.success) return existing;
  save(parsed.data);
  return parsed.data;
}

export function loadSignupAttribution(nowIso?: string): SignupAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = signupAttributionSchema.safeParse(
      JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null"),
    );
    if (!parsed.success) return null;
    // eslint-disable-next-line @quoska/legal/no-client-timestamps -- Used only to expire optional marketing attribution.
    const referenceTime = Date.parse(nowIso ?? new Date().toISOString());
    const age = referenceTime - Date.parse(parsed.data.firstTouch.occurredAt);
    if (!Number.isFinite(age) || age < 0 || age > ATTRIBUTION_TTL_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export function clearSignupAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Attribution is optional and must never block onboarding.
  }
}

function save(attribution: SignupAttribution): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // Attribution is optional and must never block browsing or onboarding.
  }
}

function referrerDetails(
  value: string,
  ownHostname: string,
): { host: string | null; internal: boolean } {
  if (!value) return { host: null, internal: false };
  try {
    const host = new URL(value).hostname.replace(/^www\./, "").slice(0, 120);
    const ownHost = ownHostname.replace(/^www\./, "");
    return host === ownHost
      ? { host: null, internal: true }
      : { host: host || null, internal: false };
  } catch {
    return { host: null, internal: false };
  }
}

function clean(value: string | null, maxLength: number): string | null {
  const normalized = value?.trim().slice(0, maxLength);
  return normalized || null;
}
