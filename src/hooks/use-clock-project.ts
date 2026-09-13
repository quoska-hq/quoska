"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import type { ClockStatusResponse } from "@/types/compliance";
import type { ProjectOption } from "@/components/project-selector";

const changeEvent = "quoska:clock-project-changed";
const memory = new Map<string, string>();

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(changeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(changeEvent, onChange);
  };
}

function readSelection(key: string): string | null {
  if (memory.has(key)) return memory.get(key)!;
  try { return window.localStorage.getItem(key); }
  catch { return null; }
}

function saveSelection(key: string, projectId: string | null) {
  const value = projectId ?? "none";
  try {
    window.localStorage.setItem(key, value);
    memory.delete(key);
  } catch { memory.set(key, value); }
  window.dispatchEvent(new Event(changeEvent));
}

export function useClockProject(status: ClockStatusResponse | null | undefined) {
  const employeeId = status?.employeeId;
  const key = employeeId ? `quoska:clock-project:${employeeId}` : null;
  const remembered = useSyncExternalStore(
    subscribe,
    useCallback(() => key ? readSelection(key) : null, [key]),
    () => null,
  );
  const { data: projects = [], isPending } = useQuery<ProjectOption[]>({
    queryKey: ["myProjects", employeeId],
    enabled: Boolean(employeeId),
    queryFn: async () => {
      const res = await fetch("/api/v1/projects?assigned=true");
      const json: ApiResponse<ProjectOption[]> = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Projekte konnten nicht geladen werden");
      return json.data ?? [];
    },
    staleTime: 60_000,
  });

  const activeProjectId = status?.activeEntry?.project_id;
  // Keep a project used by an active entry as the next default, including after reload.
  useEffect(() => {
    if (key && activeProjectId) saveSelection(key, activeProjectId);
  }, [key, activeProjectId]);

  const candidate = remembered === "none" ? null : remembered ?? status?.lastProjectId;
  const selectedProject = projects.some((project) => project.id === candidate) ? candidate! : null;
  const setSelectedProject = (projectId: string | null) => {
    if (key) saveSelection(key, projectId);
  };

  return { projects, selectedProject, setSelectedProject, isLoading: isPending };
}
