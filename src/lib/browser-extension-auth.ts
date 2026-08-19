import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const ACCESS_TOKEN_PATTERN = /^qbe_[A-Za-z0-9_-]{43}$/;

function toBase64Url(value: Buffer): string {
  return value.toString("base64url");
}
export function generateUrlSafeSecret(): string {
  return toBase64Url(randomBytes(32));
}

export function generateBrowserExtensionToken(): string {
  return `qbe_${generateUrlSafeSecret()}`;
}

export function hashBrowserExtensionSecret(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function derivePkceChallenge(verifier: string): string {
  return toBase64Url(createHash("sha256").update(verifier, "utf8").digest());
}

export function verifyPkceChallenge(
  verifier: string,
  expectedChallenge: string,
): boolean {
  const actual = Buffer.from(derivePkceChallenge(verifier), "utf8");
  const expected = Buffer.from(expectedChallenge, "utf8");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function getBrowserExtensionBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length);
  return ACCESS_TOKEN_PATTERN.test(token) ? token : null;
}

export function addExtensionCallbackParams(
  redirectUri: string,
  params: Record<string, string>,
): URL {
  const callback = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) {
    callback.searchParams.set(key, value);
  }
  return callback;
}
