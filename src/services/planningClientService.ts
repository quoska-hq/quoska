import type { ApiResponse } from "@/types/api";
export async function planningFetch<T>(
  resource = "",
  body?: unknown,
): Promise<T> {
  const response = await fetch(
    `/api/v1/planning${resource}`,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : { cache: "no-store" },
  );
  const result = (await response.json()) as ApiResponse<T>;
  if (!response.ok || result.error)
    throw new Error(
      result.error ?? "Dienstplanung konnte nicht geladen werden.",
    );
  return result.data as T;
}
