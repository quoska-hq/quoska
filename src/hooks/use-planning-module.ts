"use client";
import { useQuery } from "@tanstack/react-query";
import { useSupabase } from "@/providers/supabase-provider";
import { planningModuleFetch } from "@/services/planningModuleClientService";

export function usePlanningModule() {
  const { user } = useSupabase();
  return useQuery({
    queryKey: ["planning-module", user?.id],
    queryFn: () => planningModuleFetch(),
    enabled: Boolean(user),
    staleTime: 30000,
    refetchInterval: 60000,
  });
}
