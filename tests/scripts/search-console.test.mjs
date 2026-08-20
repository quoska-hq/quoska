import { afterEach, describe, expect, test, vi } from "vitest";
import { chmod, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  READONLY_SCOPE,
  authorize,
  buildPerformanceRequest,
  buildSiteApiUrl,
  listSites,
  parseOAuthClient,
  resolveSearchConsolePaths,
} from "../../scripts/search-console-core.mjs";

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function privateFixture() {
  const configDir = await mkdtemp(join(tmpdir(), "quoska-search-console-test-"));
  temporaryDirectories.push(configDir);
  const paths = {
    configDir,
    clientFile: join(configDir, "oauth-client.json"),
    tokenFile: join(configDir, "token.json"),
  };
  await writeFile(paths.clientFile, JSON.stringify({ installed: { client_id: "client-id", client_secret: "client-secret" } }), { mode: 0o600 });
  return paths;
}

function response(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("Search Console configuration", () => {
  test("keeps OAuth files outside the repository by default", () => {
    const paths = resolveSearchConsolePaths({ XDG_CONFIG_HOME: "/tmp/quoska-config-test" }, "/workspace/quoska");
    expect(paths).toEqual({
      configDir: "/tmp/quoska-config-test/quoska/search-console",
      clientFile: "/tmp/quoska-config-test/quoska/search-console/oauth-client.json",
      tokenFile: "/tmp/quoska-config-test/quoska/search-console/token.json",
    });
  });

  test("rejects credential paths inside the repository", () => {
    expect(() => resolveSearchConsolePaths({ GOOGLE_SEARCH_CONSOLE_CONFIG_DIR: "/workspace/quoska/secrets" }, "/workspace/quoska"))
      .toThrow("outside the repository");
  });

  test("accepts only a desktop OAuth client", () => {
    expect(parseOAuthClient({ installed: { client_id: "id", client_secret: "secret" } })).toEqual({ clientId: "id", clientSecret: "secret" });
    expect(() => parseOAuthClient({ web: { client_id: "id" } })).toThrow("Desktop app credential");
  });
});

describe("Search Console requests", () => {
  test("completes a PKCE OAuth callback and stores only the read-only token", async () => {
    const paths = await privateFixture();
    let callbackRequest;
    const tokenFetch = vi.fn(async (url, init) => {
      expect(url).toBe("https://oauth2.googleapis.com/token");
      const form = new URLSearchParams(String(init.body));
      expect(form.get("grant_type")).toBe("authorization_code");
      expect(form.get("code")).toBe("authorization-code");
      expect(form.get("code_verifier")).toBeTruthy();
      return response({
        access_token: "private-access-token",
        refresh_token: "private-refresh-token",
        expires_in: 3600,
        scope: READONLY_SCOPE,
        token_type: "Bearer",
      });
    });

    const result = await authorize(paths, {
      timeoutMs: 2_000,
      fetchImpl: tokenFetch,
      onAuthorizationUrl: (value) => {
        const authorizationUrl = new URL(value);
        expect(authorizationUrl.searchParams.get("scope")).toBe(READONLY_SCOPE);
        expect(authorizationUrl.searchParams.get("code_challenge_method")).toBe("S256");
        const redirectUrl = new URL(authorizationUrl.searchParams.get("redirect_uri"));
        redirectUrl.searchParams.set("state", authorizationUrl.searchParams.get("state"));
        redirectUrl.searchParams.set("code", "authorization-code");
        callbackRequest = fetch(redirectUrl);
      },
    });

    await callbackRequest;
    expect(result).toEqual({ tokenFile: paths.tokenFile, scope: READONLY_SCOPE });
    const storedToken = JSON.parse(await readFile(paths.tokenFile, "utf8"));
    expect(storedToken).toMatchObject({
      access_token: "private-access-token",
      refresh_token: "private-refresh-token",
      scope: READONLY_SCOPE,
      client_id: "client-id",
    });
    expect(storedToken).not.toHaveProperty("client_secret");
    expect((await stat(paths.tokenFile)).mode & 0o077).toBe(0);
  });

  test("encodes domain properties without changing their identity", () => {
    expect(buildSiteApiUrl("sc-domain:quoska.de", "sitemaps"))
      .toBe("https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Aquoska.de/sitemaps");
  });

  test("builds a bounded read-only performance query", () => {
    expect(buildPerformanceRequest({
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      dimensions: ["date", "query", "page"],
      rowLimit: "25000",
      query: "zeiterfassung",
      country: "deu",
    })).toEqual({
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      dimensions: ["date", "query", "page"],
      rowLimit: 25000,
      startRow: 0,
      type: "web",
      dataState: "final",
      dimensionFilterGroups: [{
        groupType: "and",
        filters: [
          { dimension: "query", operator: "equals", expression: "zeiterfassung" },
          { dimension: "country", operator: "equals", expression: "deu" },
        ],
      }],
    });
  });

  test("rejects invalid dates, dimensions, and pagination", () => {
    const valid = { startDate: "2026-07-01", endDate: "2026-07-31" };
    expect(() => buildPerformanceRequest({ ...valid, startDate: "07/01/2026" })).toThrow("YYYY-MM-DD");
    expect(() => buildPerformanceRequest({ ...valid, dimensions: ["keyword"] })).toThrow("dimensions");
    expect(() => buildPerformanceRequest({ ...valid, rowLimit: 25001 })).toThrow("row limit");
    expect(() => buildPerformanceRequest({ ...valid, startRow: -1 })).toThrow("start row");
  });

  test("uses a valid stored token without exposing it", async () => {
    const paths = await privateFixture();
    await writeFile(paths.tokenFile, JSON.stringify({
      access_token: "private-access-token",
      refresh_token: "private-refresh-token",
      scope: READONLY_SCOPE,
      expiry_date: Date.now() + 600_000,
      client_id: "client-id",
    }), { mode: 0o600 });
    const fetchMock = vi.fn(async (_url, init) => {
      expect(init.headers.authorization).toBe("Bearer private-access-token");
      return response({ siteEntry: [{ siteUrl: "sc-domain:quoska.de", permissionLevel: "siteRestrictedUser" }] });
    });

    const result = await listSites(paths, fetchMock);
    expect(result.siteEntry[0].siteUrl).toBe("sc-domain:quoska.de");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("refreshes an expired token and preserves private file permissions", async () => {
    const paths = await privateFixture();
    await writeFile(paths.tokenFile, JSON.stringify({
      access_token: "expired-token",
      refresh_token: "private-refresh-token",
      scope: READONLY_SCOPE,
      expiry_date: 1,
      client_id: "client-id",
    }), { mode: 0o600 });
    const fetchMock = vi.fn(async (url, init) => {
      if (url === "https://oauth2.googleapis.com/token") {
        expect(String(init.body)).toContain("grant_type=refresh_token");
        return response({ access_token: "refreshed-token", expires_in: 3600, token_type: "Bearer" });
      }
      expect(init.headers.authorization).toBe("Bearer refreshed-token");
      return response({ siteEntry: [] });
    });

    await listSites(paths, fetchMock);
    const storedToken = JSON.parse(await readFile(paths.tokenFile, "utf8"));
    expect(storedToken.access_token).toBe("refreshed-token");
    expect(storedToken.refresh_token).toBe("private-refresh-token");
    expect((await stat(paths.tokenFile)).mode & 0o077).toBe(0);
  });

  test("refuses credential files readable by other users", async () => {
    const paths = await privateFixture();
    await chmod(paths.clientFile, 0o644);
    await expect(listSites(paths, vi.fn())).rejects.toThrow("permissions are too broad");
  });
});
