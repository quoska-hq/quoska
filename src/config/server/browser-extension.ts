import { serverEnv } from "@/config/env";
import { isBrowserExtensionRedirectUri } from "@/types/browser-extension";

const EXTENSION_ID_PATTERN = /^[a-p]{32}$/;

export function parseBrowserExtensionIds(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => EXTENSION_ID_PATTERN.test(id)),
  );
}
export function isAllowedBrowserExtensionRedirect(
  redirectUri: string,
  environment = serverEnv.NODE_ENV,
  configuredIds = serverEnv.BROWSER_EXTENSION_IDS,
): boolean {
  if (!isBrowserExtensionRedirectUri(redirectUri)) return false;
  if (environment !== "production") return true;

  const extensionId = new URL(redirectUri).hostname.split(".")[0] ?? "";
  return parseBrowserExtensionIds(configuredIds).has(extensionId);
}
