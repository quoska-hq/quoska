import { createHmac } from "node:crypto";
import { serverEnv } from "@/config/env";
export function productTenantKey(tenantId: string): string {
  const secret = serverEnv.ANALYTICS_HASH_SECRET;
  if (!secret) throw new Error("Analytics sind nicht konfiguriert.");
  return createHmac("sha256", secret).update("product-tenant:" + tenantId).digest("hex").slice(0, 32);
}
