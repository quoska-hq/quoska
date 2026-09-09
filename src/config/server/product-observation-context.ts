import { AsyncLocalStorage } from "node:async_hooks";
export const productObservationContext = new AsyncLocalStorage<{ tenantId?: string }>();
// Only call after the existing route authentication resolved a trusted tenant.
export function setObservedTenant(tenantId: string): void {
  const context = productObservationContext.getStore();
  if (context) context.tenantId = tenantId;
}
