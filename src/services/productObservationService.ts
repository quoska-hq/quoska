import { productObservationContext } from "@/config/server/product-observation-context";
import { isSiteAnalyticsEnabled } from "@/config/server/site-analytics-access";
import { getNowIso } from "@/config/server/timestamps";
import { productDay } from "@/config/server/product-analytics-time";
import { productTenantKey } from "@/config/server/product-analytics-key";
import { recordProductAction } from "@/repos/productEventRepo";
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
      await observe(action, outcome);
      return response;
    } catch (error) {
      await observe(action, "error");
      throw error;
    }
  });
}
async function observe(action: ProductAction, outcome: ActionOutcome): Promise<void> {
  try {
    if (!isSiteAnalyticsEnabled()) return;
    const tenantId = productObservationContext.getStore()?.tenantId;
    recordProductAction({ day: productDay(getNowIso()), action, outcome,
      tenantKey: tenantId ? productTenantKey(tenantId) : "", count: 1 });
  } catch {
    // Observability must not change an already completed product operation.
    console.warn("product_observation_unavailable");
  }
}
