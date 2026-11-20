"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";

export function useProjectAssignments(projectId: string, enabled = true) {
  return useQuery<string[]>({
    queryKey: ["projectAssignments", projectId],
    enabled,
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/v1/projects/${projectId}/assign`, { signal });
      const json: ApiResponse<string[]> = await response.json();
      if (!response.ok || !json.data) {
        throw new Error(json.error ?? "Zuordnungen konnten nicht geladen werden.");
      }
      return json.data;
    },
  });
}
