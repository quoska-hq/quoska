"use client";

import { useQuery } from "@tanstack/react-query";
import { ProjectSelector } from "@/components/project-selector";
import type { Project, TimeEntry } from "@/types/database";

interface TimeEntryProjectFieldProps {
  entry: TimeEntry & { projectName?: string | null };
  open: boolean;
  value: string | null;
  onValueChange: (value: string | null) => void;
  disabled: boolean;
}

export function TimeEntryProjectField({ entry, open, value, onValueChange, disabled }: TimeEntryProjectFieldProps) {
  const { data: projects, isError: projectError } = useQuery<Project[]>({
    queryKey: ["entryProjects"],
    enabled: open && entry.status === "completed" && !entry.deleted_at,
    queryFn: async () => {
      const response = await fetch("/api/v1/projects?all=true");
      const json = await response.json();
      if (!response.ok || !json.data) throw new Error("Projekte konnten nicht geladen werden");
      return json.data;
    },
  });
  const projectOptions = (projects ?? []).map((project) => ({
    id: project.id,
    name: project.active ? project.name : `${project.name} (inaktiv)`,
    color: project.color,
  }));
  if (projects && entry.project_id && !projectOptions.some((project) => project.id === entry.project_id)) {
    projectOptions.push({ id: entry.project_id, name: entry.projectName ?? "Bisheriges Projekt", color: null });
  }

  if (projectError) return <p className="text-sm text-destructive">Projekte konnten nicht geladen werden.</p>;
  return <ProjectSelector projects={projectOptions} value={value} onValueChange={onValueChange} disabled={disabled} />;
}
