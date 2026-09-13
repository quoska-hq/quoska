"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CockpitData, CockpitDismissalInput, CockpitDismissalResult } from "@/types/cockpit";
import type { ApiResponse } from "@/types/api";

interface UndoItem { token: string; expiresAt: string; count: number }
const undoKey = ["cockpitDismissalUndo"];
function remainingMs(expiresAt: string) {
  // eslint-disable-next-line @quoska/legal/no-client-timestamps -- display timer only; the database enforces the actual undo deadline
  return Math.max(0, Date.parse(expiresAt) - Date.now());
}

export function useCockpitDismissal() {
  const queryClient = useQueryClient();
  const { data: undoItems } = useQuery<UndoItem[]>({
    queryKey: undoKey, queryFn: () => [], initialData: [], enabled: false,
  });
  useEffect(() => {
    if (undoItems.length === 0) return;
    const timeout = setTimeout(() => {
      queryClient.setQueryData<UndoItem[]>(undoKey, (items) => items?.filter((item) => remainingMs(item.expiresAt) > 0) ?? []);
    }, Math.min(...undoItems.map((item) => remainingMs(item.expiresAt))) + 1);
    return () => clearTimeout(timeout);
  }, [undoItems, queryClient]);

  const dismiss = useMutation({
    mutationFn: async (input: CockpitDismissalInput) => {
      const response = await fetch("/api/v1/cockpit/dismiss", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
      });
      const json: ApiResponse<CockpitDismissalResult> = await response.json();
      if (!response.ok || !json.data) throw new Error(json.error ?? "Hinweise konnten nicht ausgeblendet werden.");
      return json.data;
    },
    onSuccess: async (result, input) => {
      if (result.undoToken && result.undoExpiresAt) {
        const item = { token: result.undoToken, expiresAt: result.undoExpiresAt, count: result.dismissedCount };
        queryClient.setQueryData<UndoItem[]>(undoKey, (items = []) => [...items, item]);
      }
      const ids = new Set(input.actionIds);
      queryClient.setQueriesData<CockpitData>({ queryKey: ["adminCockpit"] }, (data) =>
        data ? { ...data, actions: data.actions.filter((item) => !ids.has(item.id)) } : data);
      await queryClient.invalidateQueries({ queryKey: ["adminCockpit"] });
    },
  });
  const undo = useMutation({
    mutationFn: async (token: string) => {
      const response = await fetch("/api/v1/cockpit/dismiss/undo", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ undoToken: token }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Hinweise konnten nicht wiederhergestellt werden.");
    },
    onSuccess: async (_result, token) => {
      queryClient.setQueryData<UndoItem[]>(undoKey, (items = []) => items.filter((item) => item.token !== token));
      await queryClient.invalidateQueries({ queryKey: ["adminCockpit"] });
    },
  });
  return { dismiss, undo, undoItems };
}
