import { afterEach, describe, expect, test, vi } from "vitest";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

describe("cron request authentication", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("fails closed when CRON_SECRET is missing", () => {
    vi.stubEnv("CRON_SECRET", "");
    const request = new Request("http://localhost/api/v1/cron/retention");

    expect(isAuthorizedCronRequest(request)).toBe(false);
  });

  test("rejects an incorrect bearer token", () => {
    vi.stubEnv("CRON_SECRET", "a".repeat(32));
    const request = new Request("http://localhost/api/v1/cron/retention", {
      headers: { authorization: `Bearer ${"b".repeat(32)}` },
    });

    expect(isAuthorizedCronRequest(request)).toBe(false);
  });

  test("accepts the configured bearer token", () => {
    const secret = "c".repeat(32);
    vi.stubEnv("CRON_SECRET", secret);
    const request = new Request("http://localhost/api/v1/cron/retention", {
      headers: { authorization: `Bearer ${secret}` },
    });

    expect(isAuthorizedCronRequest(request)).toBe(true);
  });
});
