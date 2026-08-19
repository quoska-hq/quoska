import { describe, expect, test } from "vitest";
import {
  derivePkceChallenge,
  generateBrowserExtensionToken,
  generateUrlSafeSecret,
  getBrowserExtensionBearerToken,
  hashBrowserExtensionSecret,
  verifyPkceChallenge,
} from "@/lib/browser-extension-auth";
import { isBrowserExtensionRedirectUri } from "@/types/browser-extension";
import {
  isAllowedBrowserExtensionRedirect,
  parseBrowserExtensionIds,
} from "@/config/server/browser-extension";

const EXTENSION_ID = "abcdefghijklmnopabcdefghijklmnop";

describe("browser extension authorization security", () => {
  test("accepts only the exact Chromium identity callback", () => {
    expect(
      isBrowserExtensionRedirectUri(
        `https://${EXTENSION_ID}.chromiumapp.org/connected`,
      ),
    ).toBe(true);

    expect(
      isBrowserExtensionRedirectUri(
        `https://${EXTENSION_ID}.chromiumapp.org/connected/extra`,
      ),
    ).toBe(false);
    expect(
      isBrowserExtensionRedirectUri(
        `https://${EXTENSION_ID}.chromiumapp.org/connected?next=evil`,
      ),
    ).toBe(false);
    expect(
      isBrowserExtensionRedirectUri(
        `https://${EXTENSION_ID}.chromiumapp.org.evil.test/connected`,
      ),
    ).toBe(false);
    expect(isBrowserExtensionRedirectUri("https://quoska.de/connected")).toBe(false);
  });

  test("requires an allowlisted extension ID in production", () => {
    const redirect = `https://${EXTENSION_ID}.chromiumapp.org/connected`;
    expect(isAllowedBrowserExtensionRedirect(redirect, "development", undefined)).toBe(true);
    expect(isAllowedBrowserExtensionRedirect(redirect, "production", undefined)).toBe(false);
    expect(
      isAllowedBrowserExtensionRedirect(redirect, "production", EXTENSION_ID),
    ).toBe(true);
    expect(parseBrowserExtensionIds(`invalid, ${EXTENSION_ID}`)).toEqual(
      new Set([EXTENSION_ID]),
    );
  });

  test("creates URL-safe 256-bit secrets and prefixed access tokens", () => {
    expect(generateUrlSafeSecret()).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateBrowserExtensionToken()).toMatch(/^qbe_[A-Za-z0-9_-]{43}$/);
  });

  test("hashes secrets without retaining plaintext", () => {
    const secret = "secret";
    const hash = hashBrowserExtensionSecret(secret);
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain(secret);
  });

  test("verifies the PKCE SHA-256 challenge", () => {
    const verifier = generateUrlSafeSecret();
    const challenge = derivePkceChallenge(verifier);
    expect(challenge).toHaveLength(43);
    expect(verifyPkceChallenge(verifier, challenge)).toBe(true);
    expect(verifyPkceChallenge(generateUrlSafeSecret(), challenge)).toBe(false);
  });

  test("accepts only correctly formed bearer tokens", () => {
    const token = generateBrowserExtensionToken();
    expect(
      getBrowserExtensionBearerToken(
        new Request("https://quoska.de/api", {
          headers: { authorization: `Bearer ${token}` },
        }),
      ),
    ).toBe(token);
    expect(
      getBrowserExtensionBearerToken(
        new Request("https://quoska.de/api", {
          headers: { authorization: "Bearer invalid" },
        }),
      ),
    ).toBeNull();
  });
});
