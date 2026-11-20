/**
 * Clock mutations — React Query mutation hooks for clock operations.
 *
 * Extracted from ClockView to keep file under 300 lines.
 */

"use client";

import { useIsMutating, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";

const projectSwitchKey = ["clockSwitchProject"];

function useClockMutations(
  activeEntry: { id: string } | null,
  activeBreak: { id: string } | null,
  selectedProjectId: string | null,
) {
  const queryClient = useQueryClient();
  const networkErrorMsg = "Verbindung fehlgeschlagen. Bitte versuche es erneut.";
  const isSwitchingProject = useIsMutating({ mutationKey: projectSwitchKey }) > 0;

  const clockInMutation = useMutation({
    mutationFn: async (notes?: string) => {
      let res;
      try {
        res = await fetch("/api/v1/clock/in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes, projectId: selectedProjectId }),
        });
      } catch {
        throw new Error(networkErrorMsg);
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fehler beim Einstempeln");
      return json;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clockStatus"] }),
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      if (!activeEntry) throw new Error("Kein aktiver Eintrag");
      let res;
      try {
        res = await fetch("/api/v1/clock/out", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timeEntryId: activeEntry.id }),
        });
      } catch {
        throw new Error(networkErrorMsg);
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fehler beim Ausstempeln");
      return json;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["clockStatus"] }),
        queryClient.invalidateQueries({ queryKey: ["projectBalances"] }),
        queryClient.invalidateQueries({ queryKey: ["notificationUnreadCount"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async () => {
      if (!activeEntry) throw new Error("Kein aktiver Eintrag");
      let res;
      try {
        res = await fetch("/api/v1/clock/pause", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timeEntryId: activeEntry.id }),
        });
      } catch {
        throw new Error(networkErrorMsg);
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fehler beim Starten der Pause");
      return json;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clockStatus"] }),
  });

  const resumeMutation = useMutation({
    mutationFn: async () => {
      if (!activeBreak) throw new Error("Keine aktive Pause");
      let res;
      try {
        res = await fetch("/api/v1/clock/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ breakSessionId: activeBreak.id }),
        });
      } catch {
        throw new Error(networkErrorMsg);
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fehler beim Beenden der Pause");
      return json;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clockStatus"] }),
  });

  const switchProjectMutation = useMutation({
    mutationKey: projectSwitchKey,
    mutationFn: async ({ entryId, projectId }: { entryId: string; projectId: string }) => {
      let res;
      try {
        res = await fetch("/api/v1/clock/switch-project", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entryId, projectId }),
        });
      } catch {
        throw new Error(networkErrorMsg);
      }
      if (!res.ok) {
        const json: ApiResponse<unknown> | null = await res.json().catch(() => null);
        throw new Error(json?.error ?? "Das Projekt konnte nicht gewechselt werden.");
      }
    },
    onSuccess: async () => {
      await Promise.all([
        "clockStatus", "myTimes", "employeeEntries", "weeklyReport", "projectReport",
        "projectBalances", "adminCockpit", "managerDashboard", "presence", "datev",
      ].map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
    },
    onError: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["clockStatus"] }),
        queryClient.invalidateQueries({ queryKey: ["myProjects"] }),
      ]);
    },
  });

  const isProcessing =
    isSwitchingProject ||
    clockInMutation.isPending ||
    clockOutMutation.isPending ||
    pauseMutation.isPending ||
    resumeMutation.isPending;

  const error =
    clockInMutation.error?.message ??
    clockOutMutation.error?.message ??
    pauseMutation.error?.message ??
    resumeMutation.error?.message;

  const clearError = () => {
    clockInMutation.reset();
    clockOutMutation.reset();
    pauseMutation.reset();
    resumeMutation.reset();
  };

  return {
    clockInMutation,
    clockOutMutation,
    pauseMutation,
    resumeMutation,
    switchProject: (entryId: string, projectId: string) => {
      if (isProcessing || queryClient.isMutating({ mutationKey: projectSwitchKey })) return;
      switchProjectMutation.mutate({ entryId, projectId });
    },
    isSwitchingProject,
    projectSwitchError: switchProjectMutation.error?.message,
    isProcessing,
    error,
    clearError,
  };
}

export { useClockMutations };
