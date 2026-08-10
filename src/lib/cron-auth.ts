import { timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/config/env";

/**
 * Authenticate an internal scheduler request without leaking the secret.
 * Missing configuration always fails closed, including in development.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = serverEnv.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || !authorization?.startsWith("Bearer ")) return false;

  const supplied = authorization.slice("Bearer ".length);
  const expectedBuffer = Buffer.from(secret);
  const suppliedBuffer = Buffer.from(supplied);

  if (expectedBuffer.length !== suppliedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, suppliedBuffer);
}
