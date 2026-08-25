export const CHROME_EXTENSION_ID = "nkjalipmbhbgbbclhmghlhglljlkdclh";

export const CHROME_WEB_STORE_URL =
  `https://chromewebstore.google.com/detail/quoska-zeiterfassung/${CHROME_EXTENSION_ID}`;

export type ChromeWebStorePlacement =
  | "dashboard"
  | "settings"
  | "landing-hero"
  | "landing-final";

/** Add stable campaign parameters so Store visits can be compared by placement. */
export function getChromeWebStoreUrl(
  placement: ChromeWebStorePlacement,
): string {
  const params = new URLSearchParams({
    utm_source: "quoska",
    utm_medium: "owned",
    utm_campaign: "browser_extension",
    utm_content: placement,
  });

  return `${CHROME_WEB_STORE_URL}?${params.toString()}`;
}
