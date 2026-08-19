import { readFile } from "node:fs/promises";
import { webcrypto } from "node:crypto";
import vm from "node:vm";
import { describe, expect, test, vi } from "vitest";

const API_SOURCE = new URL(
  "../../browser-extension/src/api.js",
  import.meta.url,
);
const BACKGROUND_SOURCE = new URL(
  "../../browser-extension/src/background.js",
  import.meta.url,
);

describe("browser extension connection lifecycle", () => {
  test("the background worker owns and deduplicates connection attempts", async () => {
    let messageListener: (
      message: { type: string },
      sender: unknown,
      respond: (value: unknown) => void,
    ) => boolean;
    let finishConnection: (() => void) | undefined;
    const connect = vi.fn(() => new Promise<void>((resolve) => {
      finishConnection = resolve;
    }));
    const responses: unknown[] = [];
    const source = await readFile(BACKGROUND_SOURCE, "utf8");
    const chrome = {
      action: {
        setBadgeText: vi.fn(async () => undefined),
        setBadgeBackgroundColor: vi.fn(async () => undefined),
        setIcon: vi.fn(async () => undefined),
        setTitle: vi.fn(async () => undefined),
      },
      alarms: {
        create: vi.fn(),
        onAlarm: { addListener: vi.fn() },
      },
      runtime: {
        onInstalled: { addListener: vi.fn() },
        onStartup: { addListener: vi.fn() },
        onMessage: {
          addListener: vi.fn((listener) => {
            messageListener = listener;
          }),
        },
      },
    };
    const QuoskaApi = {
      connect,
      getStoredToken: vi.fn(async () => ({ accessToken: "token" })),
      getStatus: vi.fn(async () => ({ activeEntry: { status: "running" } })),
    };

    vm.runInNewContext(source, {
      chrome,
      importScripts: vi.fn(),
      QuoskaApi,
    });

    expect(messageListener!({ type: "QUOSKA_CONNECT" }, {}, (value) => {
      responses.push(value);
    })).toBe(true);
    expect(messageListener!({ type: "QUOSKA_CONNECT" }, {}, (value) => {
      responses.push(value);
    })).toBe(true);
    expect(connect).toHaveBeenCalledTimes(1);

    finishConnection!();
    await vi.waitFor(() => expect(responses).toEqual([{ ok: true }, { ok: true }]));
    expect(chrome.action.setIcon).toHaveBeenCalledWith({ path: "icons/icon-192.png" });
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: "" });
    expect(chrome.action.setBadgeBackgroundColor).not.toHaveBeenCalled();
  });

  test("revokes a server token when local persistence fails", async () => {
    const token = {
      accessToken: `qbe_${"a".repeat(43)}`,
      tokenType: "Bearer",
      expiresAt: "2099-01-01T00:00:00.000Z",
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ data: token, error: null }),
      })
      .mockResolvedValueOnce({ ok: true, status: 204 });
    const storage = new Map<string, unknown>();
    const chrome = {
      identity: {
        getRedirectURL: () => "https://abcdefghijklmnopabcdefghijklmnop.chromiumapp.org/connected",
        launchWebAuthFlow: vi.fn(async ({ url }: { url: string }) => {
          const authorizeUrl = new URL(url);
          const callback = new URL("https://abcdefghijklmnopabcdefghijklmnop.chromiumapp.org/connected");
          callback.searchParams.set("state", authorizeUrl.searchParams.get("state")!);
          callback.searchParams.set("code", "b".repeat(43));
          return callback.toString();
        }),
      },
      storage: {
        local: {
          get: vi.fn(async (key: string) => ({ [key]: storage.get(key) })),
          set: vi.fn(async () => {
            throw new Error("storage unavailable");
          }),
          remove: vi.fn(async (key: string) => storage.delete(key)),
        },
      },
    };
    const context = {
      URL,
      TextEncoder,
      btoa,
      chrome,
      crypto: webcrypto,
      fetch: fetchMock,
      QUOSKA_CONFIG: { appUrl: "http://localhost:3000" },
    };
    vm.runInNewContext(await readFile(API_SOURCE, "utf8"), context);

    const api = (context as typeof context & {
      QuoskaApi: { connect: () => Promise<unknown> };
    }).QuoskaApi;
    await expect(api.connect()).rejects.toThrow(
      "Die Verbindung konnte im Browser nicht gespeichert werden.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "http://localhost:3000/api/v1/browser-extension/token",
    );
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: "DELETE",
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });
  });
});
