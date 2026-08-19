import { z } from "zod";

const BASE64_URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const CHROMIUM_EXTENSION_ID_PATTERN = /^[a-p]{32}$/;

export function isBrowserExtensionRedirectUri(value: string): boolean {
  try {
    const url = new URL(value);
    const extensionId = url.hostname.split(".")[0] ?? "";
    return (
      url.protocol === "https:" &&
      url.hostname === `${extensionId}.chromiumapp.org` &&
      CHROMIUM_EXTENSION_ID_PATTERN.test(extensionId) &&
      url.port === "" &&
      url.username === "" &&
      url.password === "" &&
      url.pathname === "/connected" &&
      url.search === "" &&
      url.hash === ""
    );
  } catch {
    return false;
  }
}

export const browserExtensionRedirectUriSchema = z
  .string()
  .refine(isBrowserExtensionRedirectUri, "Ungültige Erweiterungs-Weiterleitung");

export const browserExtensionAuthorizationSchema = z.object({
  redirectUri: browserExtensionRedirectUriSchema,
  state: z.string().min(16).max(128).regex(BASE64_URL_PATTERN),
  codeChallenge: z.string().length(43).regex(BASE64_URL_PATTERN),
});

export const browserExtensionTokenExchangeSchema = z.object({
  code: z.string().length(43).regex(BASE64_URL_PATTERN),
  codeVerifier: z.string().min(43).max(128).regex(BASE64_URL_PATTERN),
  redirectUri: browserExtensionRedirectUriSchema,
});

export const browserExtensionClockActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("clock-in"),
    notes: z.string().trim().max(500).optional(),
    projectId: z.string().uuid().nullable().optional(),
  }),
  z.object({ action: z.literal("clock-out") }),
  z.object({ action: z.literal("pause") }),
  z.object({ action: z.literal("resume") }),
]);

export interface BrowserExtensionProject {
  id: string;
  name: string;
  color: string | null;
}

export interface BrowserExtensionEntry {
  id: string;
  clockIn: string;
  breakMinutes: number;
  status: "running" | "paused";
  notes: string | null;
  projectId: string | null;
}

export interface BrowserExtensionBreak {
  id: string;
  breakStart: string;
}

export interface BrowserExtensionStatus {
  employeeName: string;
  serverNow: string;
  todayWorkedSeconds: number;
  todayTargetMinutes: number;
  activeEntry: BrowserExtensionEntry | null;
  activeBreak: BrowserExtensionBreak | null;
  projects: BrowserExtensionProject[];
}

export interface BrowserExtensionTokenResponse {
  accessToken: string;
  tokenType: "Bearer";
  expiresAt: string;
}

export interface BrowserExtensionConnection {
  id: string;
  employeeName: string;
  extensionId: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
}

export type BrowserExtensionClockAction = z.infer<
  typeof browserExtensionClockActionSchema
>;
