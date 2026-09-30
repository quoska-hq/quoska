import { timingSafeEqual } from "node:crypto";
export function planningWorkerAuthorized(request: Request): boolean {
  const expected = process.env.PLANNING_WORKER_TOKEN;
  const actual = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (
    !expected ||
    expected.length < 32 ||
    !actual ||
    actual.length !== expected.length
  )
    return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}
