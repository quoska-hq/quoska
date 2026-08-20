import { createHash, randomBytes } from "node:crypto";
import { mkdir, lstat, readFile, rename, chmod, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";

export const READONLY_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
export const DEFAULT_PROPERTY = "sc-domain:quoska.de";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const WEBMASTERS_API = "https://www.googleapis.com/webmasters/v3";
const INSPECTION_API = "https://searchconsole.googleapis.com/v1";

function base64Url(value) {
  return value.toString("base64url");
}

function pathIsInside(parent, child) {
  const pathFromParent = relative(resolve(parent), resolve(child));
  return pathFromParent === "" || (!pathFromParent.startsWith("..") && !isAbsolute(pathFromParent));
}

function requireAbsolutePath(value, label) {
  if (!isAbsolute(value)) {
    throw new Error(`${label} must be an absolute path.`);
  }
  return resolve(value);
}

export function resolveSearchConsolePaths(env = process.env, cwd = process.cwd()) {
  const defaultConfigRoot = join(env.XDG_CONFIG_HOME || join(homedir(), ".config"), "quoska", "search-console");
  const configDir = requireAbsolutePath(env.GOOGLE_SEARCH_CONSOLE_CONFIG_DIR || defaultConfigRoot, "GOOGLE_SEARCH_CONSOLE_CONFIG_DIR");
  const clientFile = requireAbsolutePath(env.GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_FILE || join(configDir, "oauth-client.json"), "GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_FILE");
  const tokenFile = requireAbsolutePath(env.GOOGLE_SEARCH_CONSOLE_TOKEN_FILE || join(configDir, "token.json"), "GOOGLE_SEARCH_CONSOLE_TOKEN_FILE");

  for (const [label, path] of [["OAuth client file", clientFile], ["token file", tokenFile]]) {
    if (pathIsInside(cwd, path)) {
      throw new Error(`${label} must be stored outside the repository.`);
    }
  }

  return { configDir, clientFile, tokenFile };
}

async function assertPrivateFile(path, label) {
  let fileInfo;
  try {
    fileInfo = await lstat(path);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`${label} not found at ${path}`);
    }
    throw error;
  }

  if (!fileInfo.isFile() || fileInfo.isSymbolicLink()) {
    throw new Error(`${label} must be a regular file, not a link.`);
  }
  if ((fileInfo.mode & 0o077) !== 0) {
    throw new Error(`${label} permissions are too broad. Run: chmod 600 ${path}`);
  }
}

async function readSecureJson(path, label) {
  await assertPrivateFile(path, label);
  let parsed;
  try {
    parsed = JSON.parse(await readFile(path, "utf8"));
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
  return parsed;
}

async function ensurePrivateDirectory(path) {
  await mkdir(path, { recursive: true, mode: 0o700 });
  const directoryInfo = await lstat(path);
  if (!directoryInfo.isDirectory() || directoryInfo.isSymbolicLink()) {
    throw new Error(`Search Console config path must be a regular directory: ${path}`);
  }
  await chmod(path, 0o700);
}

async function writeSecureJson(path, value, configDir) {
  await ensurePrivateDirectory(configDir);
  const temporaryPath = `${path}.${process.pid}.${base64Url(randomBytes(9))}.tmp`;
  if (!pathIsInside(configDir, temporaryPath) || !pathIsInside(configDir, path)) {
    throw new Error("Refusing to write Search Console credentials outside the private config directory.");
  }
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
  await chmod(temporaryPath, 0o600);
  await rename(temporaryPath, path);
  await chmod(path, 0o600);
}

export function parseOAuthClient(document) {
  const client = document?.installed;
  if (!client || typeof client.client_id !== "string" || client.client_id.trim() === "") {
    throw new Error("The OAuth client JSON must be a Google Desktop app credential (the `installed` format).");
  }
  return {
    clientId: client.client_id,
    clientSecret: typeof client.client_secret === "string" ? client.client_secret : "",
  };
}

async function loadOAuthClient(paths) {
  return parseOAuthClient(await readSecureJson(paths.clientFile, "Google OAuth client file"));
}

function googleErrorMessage(status, body) {
  try {
    const parsed = JSON.parse(body);
    const message = parsed?.error?.message || parsed?.error_description || parsed?.error;
    if (typeof message === "string" && message !== "") return `Google API ${status}: ${message}`;
  } catch {
    // Fall through to the status-only error. Never echo an unexpected response body.
  }
  return `Google API request failed with status ${status}.`;
}

async function requestJson(url, init = {}, fetchImpl = fetch) {
  const response = await fetchImpl(url, init);
  const body = await response.text();
  if (!response.ok) throw new Error(googleErrorMessage(response.status, body));
  return body === "" ? null : JSON.parse(body);
}

function tokenForm(values) {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== "" && value !== undefined) form.set(key, String(value));
  }
  return form;
}

async function exchangeAuthorizationCode({ code, codeVerifier, redirectUri, client }, fetchImpl = fetch) {
  return requestJson(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: tokenForm({
      client_id: client.clientId,
      client_secret: client.clientSecret,
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  }, fetchImpl);
}

async function refreshAccessToken({ token, client }, fetchImpl = fetch) {
  if (typeof token.refresh_token !== "string" || token.refresh_token === "") {
    throw new Error("No refresh token is stored. Run the `auth` command again.");
  }
  return requestJson(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: tokenForm({
      client_id: client.clientId,
      client_secret: client.clientSecret,
      refresh_token: token.refresh_token,
      grant_type: "refresh_token",
    }),
  }, fetchImpl);
}

function normalizeToken(token, previousToken, clientId) {
  if (typeof token.access_token !== "string" || token.access_token === "") {
    throw new Error("Google did not return an access token.");
  }
  const expiresIn = Number(token.expires_in || 3600);
  return {
    access_token: token.access_token,
    refresh_token: token.refresh_token || previousToken?.refresh_token,
    scope: token.scope || previousToken?.scope || READONLY_SCOPE,
    token_type: token.token_type || previousToken?.token_type || "Bearer",
    expiry_date: Date.now() + expiresIn * 1000,
    client_id: clientId,
  };
}

function assertReadOnlyToken(token, clientId) {
  if (token.client_id && token.client_id !== clientId) {
    throw new Error("The stored token belongs to a different OAuth client. Run `auth` again.");
  }
  const scopes = String(token.scope || "").split(/\s+/);
  if (!scopes.includes(READONLY_SCOPE)) {
    throw new Error("The stored Google token does not include the required read-only Search Console scope.");
  }
}

async function loadAccessToken(paths, fetchImpl = fetch) {
  const client = await loadOAuthClient(paths);
  const token = await readSecureJson(paths.tokenFile, "Google Search Console token");
  assertReadOnlyToken(token, client.clientId);
  if (typeof token.access_token === "string" && Number(token.expiry_date) > Date.now() + 60_000) {
    return token.access_token;
  }

  const refreshed = await refreshAccessToken({ token, client }, fetchImpl);
  const updatedToken = normalizeToken(refreshed, token, client.clientId);
  assertReadOnlyToken(updatedToken, client.clientId);
  await writeSecureJson(paths.tokenFile, updatedToken, paths.configDir);
  return updatedToken.access_token;
}

export function buildSiteApiUrl(property, resource = "") {
  const suffix = resource === "" ? "" : `/${resource.replace(/^\/+/, "")}`;
  return `${WEBMASTERS_API}/sites/${encodeURIComponent(property)}${suffix}`;
}

const PERFORMANCE_DIMENSIONS = new Set(["date", "hour", "query", "page", "country", "device", "searchAppearance"]);
const SEARCH_TYPES = new Set(["web", "image", "video", "news", "discover", "googleNews"]);

function assertIsoDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`${label} must use YYYY-MM-DD.`);
  }
}

export function buildPerformanceRequest(options) {
  assertIsoDate(options.startDate, "start date");
  assertIsoDate(options.endDate, "end date");
  if (options.startDate > options.endDate) throw new Error("start date must not be after end date.");

  const dimensions = options.dimensions || ["date", "query", "page"];
  if (!Array.isArray(dimensions) || dimensions.length === 0 || dimensions.some((value) => !PERFORMANCE_DIMENSIONS.has(value))) {
    throw new Error(`dimensions must contain only: ${[...PERFORMANCE_DIMENSIONS].join(", ")}`);
  }

  const rowLimit = Number(options.rowLimit || 1000);
  if (!Number.isInteger(rowLimit) || rowLimit < 1 || rowLimit > 25_000) {
    throw new Error("row limit must be an integer from 1 to 25000.");
  }
  const type = options.type || "web";
  if (!SEARCH_TYPES.has(type)) throw new Error(`type must be one of: ${[...SEARCH_TYPES].join(", ")}`);
  const startRow = Number(options.startRow || 0);
  if (!Number.isInteger(startRow) || startRow < 0) throw new Error("start row must be a non-negative integer.");
  const dataState = options.dataState || "final";
  if (!["final", "all", "hourly_all"].includes(dataState)) {
    throw new Error("data state must be final, all, or hourly_all.");
  }

  const filters = [];
  for (const dimension of ["query", "page", "country", "device"]) {
    if (options[dimension]) filters.push({ dimension, operator: "equals", expression: options[dimension] });
  }

  return {
    startDate: options.startDate,
    endDate: options.endDate,
    dimensions,
    rowLimit,
    startRow,
    type,
    dataState,
    ...(filters.length > 0 ? { dimensionFilterGroups: [{ groupType: "and", filters }] } : {}),
  };
}

async function authorizedRequest(paths, url, init = {}, fetchImpl = fetch) {
  const accessToken = await loadAccessToken(paths, fetchImpl);
  return requestJson(url, {
    ...init,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  }, fetchImpl);
}

export async function listSites(paths, fetchImpl = fetch) {
  return authorizedRequest(paths, `${WEBMASTERS_API}/sites`, {}, fetchImpl);
}

export async function listSitemaps(paths, property, fetchImpl = fetch) {
  return authorizedRequest(paths, buildSiteApiUrl(property, "sitemaps"), {}, fetchImpl);
}

export async function queryPerformance(paths, property, options, fetchImpl = fetch) {
  const body = buildPerformanceRequest(options);
  return authorizedRequest(paths, buildSiteApiUrl(property, "searchAnalytics/query"), {
    method: "POST",
    body: JSON.stringify(body),
  }, fetchImpl);
}

export async function inspectUrl(paths, property, inspectionUrl, fetchImpl = fetch) {
  const parsedUrl = new URL(inspectionUrl);
  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error("inspection URL must use http or https.");
  }
  return authorizedRequest(paths, `${INSPECTION_API}/urlInspection/index:inspect`, {
    method: "POST",
    body: JSON.stringify({ inspectionUrl: parsedUrl.toString(), siteUrl: property, languageCode: "de-DE" }),
  }, fetchImpl);
}

export async function authorize(paths, { onAuthorizationUrl = console.log, timeoutMs = 300_000, fetchImpl = fetch } = {}) {
  const client = await loadOAuthClient(paths);
  const state = base64Url(randomBytes(32));
  const codeVerifier = base64Url(randomBytes(64));
  const codeChallenge = base64Url(createHash("sha256").update(codeVerifier).digest());
  let completed = false;
  let resolveCallback;
  let rejectCallback;
  const callback = new Promise((resolvePromise, rejectPromise) => {
    resolveCallback = resolvePromise;
    rejectCallback = rejectPromise;
  });

  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
    if (requestUrl.pathname !== "/oauth2/callback") {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    if (completed) {
      response.writeHead(409, { "content-type": "text/plain; charset=utf-8" });
      response.end("Authorization was already handled.");
      return;
    }
    completed = true;
    if (requestUrl.searchParams.get("state") !== state) {
      response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      response.end("Invalid OAuth state. You can close this tab.");
      rejectCallback(new Error("Google OAuth state did not match."));
      return;
    }
    const oauthError = requestUrl.searchParams.get("error");
    const code = requestUrl.searchParams.get("code");
    if (oauthError || !code) {
      response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      response.end("Google authorization was not completed. You can close this tab.");
      rejectCallback(new Error(`Google authorization failed: ${oauthError || "missing code"}`));
      return;
    }
    response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    response.end("Quoska now has read-only Search Console access. You can close this tab.");
    resolveCallback(code);
  });

  await new Promise((resolvePromise, rejectPromise) => {
    server.once("error", rejectPromise);
    server.listen(0, "127.0.0.1", resolvePromise);
  });

  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not start the local OAuth callback.");
  const redirectUri = `http://127.0.0.1:${address.port}/oauth2/callback`;
  const authorizationUrl = new URL(AUTHORIZATION_ENDPOINT);
  authorizationUrl.search = new URLSearchParams({
    client_id: client.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: READONLY_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  }).toString();
  onAuthorizationUrl(authorizationUrl.toString());

  const timeout = setTimeout(() => rejectCallback(new Error("Google authorization timed out after five minutes.")), timeoutMs);
  try {
    const code = await callback;
    const tokenResponse = await exchangeAuthorizationCode({ code, codeVerifier, redirectUri, client }, fetchImpl);
    const token = normalizeToken(tokenResponse, null, client.clientId);
    assertReadOnlyToken(token, client.clientId);
    if (!token.refresh_token) throw new Error("Google did not return a refresh token. Revoke the prior grant and run `auth` again.");
    await writeSecureJson(paths.tokenFile, token, paths.configDir);
    return { tokenFile: paths.tokenFile, scope: READONLY_SCOPE };
  } finally {
    clearTimeout(timeout);
    await new Promise((resolvePromise) => server.close(resolvePromise));
  }
}

export async function connectionStatus(paths) {
  async function fileStatus(path) {
    try {
      const info = await lstat(path);
      return info.isFile() && !info.isSymbolicLink() ? "present" : "invalid";
    } catch (error) {
      if (error?.code === "ENOENT") return "missing";
      throw error;
    }
  }
  return {
    permission: "read-only",
    scope: READONLY_SCOPE,
    property: process.env.GOOGLE_SEARCH_CONSOLE_PROPERTY || DEFAULT_PROPERTY,
    oauthClient: await fileStatus(paths.clientFile),
    token: await fileStatus(paths.tokenFile),
    clientFile: paths.clientFile,
    tokenFile: paths.tokenFile,
  };
}
