import { describe, expect, test } from "vitest";
import {
  buildSignupAttribution,
  signupAttributionSchema,
  type SignupAttribution,
} from "@/lib/signup-attribution";

const firstTouch = {
  path: "/preise",
  referrerHost: "google.com",
  internalReferrer: false,
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  occurredAt: "2026-09-02T10:00:00.000Z",
};

describe("signup attribution", () => {
  test("keeps the first touch while updating the latest touch", () => {
    const first = buildSignupAttribution(null, firstTouch);
    const latest = buildSignupAttribution(first, {
      path: "/funktionen",
      referrerHost: "chatgpt.com",
      internalReferrer: false,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      occurredAt: "2026-09-02T10:05:00.000Z",
    });

    expect(latest.firstTouch.source).toBe("google.com");
    expect(latest.firstTouch.path).toBe("/preise");
    expect(latest.lastTouch.source).toBe("chatgpt.com");
    expect(latest.lastTouch.path).toBe("/funktionen");
  });

  test("retains the external source across an internal navigation", () => {
    const first = buildSignupAttribution(null, firstTouch);
    const latest = buildSignupAttribution(first, {
      path: "/register",
      referrerHost: null,
      internalReferrer: true,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      occurredAt: "2026-09-02T10:06:00.000Z",
    });

    expect(latest.lastTouch.source).toBe("google.com");
    expect(latest.lastTouch.path).toBe("/register");
  });

  test("prefers UTM attribution and rejects unbounded metadata", () => {
    const attributed = buildSignupAttribution(null, {
      ...firstTouch,
      referrerHost: null,
      utmSource: "newsletter",
      utmMedium: "email",
      utmCampaign: "launch",
    });
    expect(attributed.firstTouch).toMatchObject({
      source: "newsletter",
      utmMedium: "email",
      utmCampaign: "launch",
    });

    const invalid: SignupAttribution = {
      ...attributed,
      firstTouch: { ...attributed.firstTouch, source: "x".repeat(121) },
    };
    expect(signupAttributionSchema.safeParse(invalid).success).toBe(false);
  });
});
