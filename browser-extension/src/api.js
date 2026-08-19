/* global chrome, QUOSKA_CONFIG */

(() => {
  "use strict";

  const TOKEN_KEY = "quoskaExtensionToken";

  class ApiError extends Error {
    constructor(message, status = 0) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  }

  function randomBase64Url() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  }

  async function pkceChallenge(verifier) {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(verifier),
    );
    let binary = "";
    for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  }

  async function getStoredToken() {
    const stored = (await chrome.storage.local.get(TOKEN_KEY))[TOKEN_KEY];
    if (!stored?.accessToken) return null;
    if (stored.expiresAt && Date.parse(stored.expiresAt) <= Date.now()) {
      await chrome.storage.local.remove(TOKEN_KEY);
      return null;
    }
    return stored;
  }

  async function clearToken() {
    await chrome.storage.local.remove(TOKEN_KEY);
  }

  async function request(path, options = {}) {
    const token = options.accessToken
      ? { accessToken: options.accessToken }
      : options.auth === false ? null : await getStoredToken();
    if (options.auth !== false && !token) throw new ApiError("Nicht verbunden", 401);

    let response;
    try {
      response = await fetch(`${QUOSKA_CONFIG.appUrl}${path}`, {
        method: options.method ?? "GET",
        headers: {
          Accept: "application/json",
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token.accessToken}` } : {}),
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      });
    } catch {
      throw new ApiError("Quoska ist gerade nicht erreichbar. Bitte prüfe deine Verbindung.");
    }

    if (response.status === 204) return null;
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.data) {
      if (response.status === 401 && !options.accessToken) await clearToken();
      throw new ApiError(payload?.error ?? "Die Anfrage ist fehlgeschlagen.", response.status);
    }
    return payload.data;
  }

  async function revokeAccessToken(accessToken) {
    await request("/api/v1/browser-extension/token", {
      method: "DELETE",
      accessToken,
    });
  }

  async function connect() {
    const codeVerifier = randomBase64Url();
    const state = randomBase64Url();
    const redirectUri = chrome.identity.getRedirectURL("connected");
    const authorizeUrl = new URL("/app/browser-extension/connect", QUOSKA_CONFIG.appUrl);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("code_challenge", await pkceChallenge(codeVerifier));

    const callbackValue = await chrome.identity.launchWebAuthFlow({
      url: authorizeUrl.toString(),
      interactive: true,
    });
    if (!callbackValue) throw new ApiError("Verbindung wurde abgebrochen.");

    const callback = new URL(callbackValue);
    if (callback.searchParams.get("state") !== state) {
      throw new ApiError("Die Verbindungsantwort konnte nicht bestätigt werden.");
    }
    if (callback.searchParams.get("error")) {
      throw new ApiError("Verbindung wurde abgebrochen.");
    }
    const code = callback.searchParams.get("code");
    if (!code) throw new ApiError("Quoska hat keinen Verbindungscode zurückgegeben.");

    const token = await request("/api/v1/browser-extension/token", {
      method: "POST",
      auth: false,
      body: { code, codeVerifier, redirectUri },
    });
    try {
      await chrome.storage.local.set({ [TOKEN_KEY]: token });
      const persisted = await getStoredToken();
      if (persisted?.accessToken !== token.accessToken) {
        throw new Error("Token storage verification failed");
      }
    } catch {
      await revokeAccessToken(token.accessToken).catch(() => undefined);
      await clearToken().catch(() => undefined);
      throw new ApiError(
        "Die Verbindung konnte im Browser nicht gespeichert werden. Bitte versuche es erneut.",
      );
    }
    return token;
  }

  async function disconnect() {
    await request("/api/v1/browser-extension/token", { method: "DELETE" });
    await clearToken();
  }

  globalThis.QuoskaApi = Object.freeze({
    ApiError,
    appUrl: QUOSKA_CONFIG.appUrl,
    clearToken,
    connect,
    disconnect,
    getStatus: () => request("/api/v1/browser-extension/status"),
    getStoredToken,
    performAction: (body) => request("/api/v1/browser-extension/clock", {
      method: "POST",
      body,
    }),
  });
})();
