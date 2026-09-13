"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import type { EmployeeListResponse } from "@/types/employee";

/** Cache the complete response consistently; consumers select the fields they need. */
export function useEmployees() {
  return useQuery({
    queryKey: ["employees"],
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/v1/employees", { signal });
      const json: ApiResponse<EmployeeListResponse> = await response.json();
      if (!response.ok || !json.data) {
        throw new Error(json.error ?? "Mitarbeiter konnten nicht geladen werden.");
      }
      return json.data;
    },
  });
}
