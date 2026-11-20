"use client";

import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/providers/supabase-provider";
import type { ApiResponse } from "@/types/api";
import type { PersonalProjectGoal } from "@/types/project-balance";

export function usePersonalProjectGoals(weekStart: string) {
  const { user } = useSupabase();
  return useQuery({
    queryKey: ["projectBalances", "mine", user?.id, weekStart],
    enabled: Boolean(user),
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/v1/my-times/project-goals?weekStart=${weekStart}`, { signal });
      const json: ApiResponse<PersonalProjectGoal[]> = await response.json();
      if (!response.ok || !json.data) {
        throw new Error(json.error ?? "Projektziele konnten nicht geladen werden.");
      }
      return json.data;
    },
  });
}
