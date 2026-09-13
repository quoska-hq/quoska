import { productObservationContext } from "@/config/server/product-observation-context";
import { isSiteAnalyticsEnabled } from "@/config/server/site-analytics-access";
import { getNowIso } from "@/config/server/timestamps";
import { productDay } from "@/config/server/product-analytics-time";
import { productTenantKey, productEmployeeKey } from "@/config/server/product-analytics-key";
import { recordProductAction } from "@/repos/productEventRepo";
import { recordAccountActivity } from "@/repos/productAccountActivityRepo";
import type { ProductAction, ActionOutcome } from "@/types/product-analytics";

export function outcomeForStatus(status: number): ActionOutcome {
  if (status < 400) return "ok";
  if (status === 401 || status === 403) return "denied";
  if (status === 409) return "conflict";
  if (status === 429) return "limited";
  return status >= 500 ? "error" : "invalid";
}
export function observeProductAction(action: ProductAction, handler: (request: Request) => Promise<Response>) {
  return (request: Request): Promise<Response> => productObservationContext.run({}, async () => {
    try {
      const response = await handler(request);
      let outcome = outcomeForStatus(response.status);
      // Import previews can reject rows while returning HTTP 200. Record only
      // the classification; never retain a response, CSV, filename or message.
      if (action === "import") {
        const body = await response.clone().json().catch(() => null);
        if (body?.data?.errorCount > 0) outcome = "invalid";
        if (body?.error === "Importprüfung fehlgeschlagen. Bitte versuche es erneut oder wende dich an die Administration.") outcome = "error";
      }
      await observe(action, outcome, request);
      return response;
    } catch (error) {
      await observe(action, "error", request);
      throw error;
    }
  });
}
async function observe(action: ProductAction, outcome: ActionOutcome, request: Request): Promise<void> {
  try {
    if (!isSiteAnalyticsEnabled()) return;
    const { tenantId, employeeId } = productObservationContext.getStore() ?? {};
    const at = getNowIso();
    recordProductAction({ day: productDay(at), action, outcome,
      tenantKey: tenantId ? productTenantKey(tenantId) : "", count: 1 });
    if (outcome === "ok" && tenantId && employeeId && request.headers.get("dnt") !== "1" && request.headers.get("sec-gpc") !== "1") {
      recordAccountActivity({ tenantKey: productTenantKey(tenantId), employeeKey: productEmployeeKey(employeeId), at, action });
    }
  } catch {
    // Observability must not change an already completed product operation.
    console.warn("product_observation_unavailable");
  }
}
