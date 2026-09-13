/**
 * ProjectList — Admin project management.
 *
 * Supports: create, edit, soft-delete, assign/unassign employees.
 */

"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import type { ProjectWithStats } from "@/types";
import { ProjectFormDialog } from "@/components/project-form-dialog";
import { ProjectAssignPanel } from "@/components/project-assign-panel";
import { useEmployees } from "@/hooks/use-employees";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Pencil, Search, Trash2, Users } from "lucide-react";

export function ProjectList() {
  const queryClient = useQueryClient();
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const [editProject, setEditProject] = useState<ProjectWithStats | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignProjectId, setAssignProjectId] = useState<string | null>(null);

  const { data: projects, isLoading, error: loadError, refetch } = useQuery<ProjectWithStats[]>({
    queryKey: ["projects", showInactive],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/projects${showInactive ? "?all=true" : ""}`,
      );
      const json: ApiResponse<ProjectWithStats[]> = await res.json();
      if (!res.ok || !json.data) throw new Error(json.error ?? "Projekte konnten nicht geladen werden.");
      return json.data;
    },
  });

  const employees = useEmployees();

  const openAssign = useCallback(
    (projectId: string) => {
      setAssignProjectId((prev) =>
        prev === projectId ? null : projectId,
      );
    },
    [],
  );

  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      customer_name: string | null;
      color: string;
    }) => {
      const res = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Projekt konnte nicht erstellt werden.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["myProjects"] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      customer_name: string | null;
      color: string;
    }) => {
      const res = await fetch(`/api/v1/projects/${editProject!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Projekt konnte nicht gespeichert werden.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["myProjects"] });
      setEditProject(null);
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/projects/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Projekt konnte nicht gelöscht werden.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["myProjects"] });
    },
  });

  function openEdit(project: ProjectWithStats) {
    updateMutation.reset();
    createMutation.reset();
    setEditProject(project);
    setDialogOpen(true);
  }

  function handleFormSubmit(data: {
    name: string;
    customer_name: string | null;
    color: string;
  }) {
    if (editProject) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  }

  if (isLoading) return <Skeleton className="h-40 w-full rounded-sm" />;
  if (!projects) return <div role="alert" className="space-y-3 text-sm text-red-700">
    <p>{loadError?.message ?? "Projekte konnten nicht geladen werden."}</p>
    <Button variant="outline" onClick={() => refetch()}>Erneut laden</Button>
  </div>;

  const query = search.trim().toLocaleLowerCase("de-DE");
  const filteredProjects = projects?.filter((project) =>
    `${project.name} ${project.customer_name ?? ""}`.toLocaleLowerCase("de-DE").includes(query),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold">Projekte</h2>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded"
            />
            Inaktive anzeigen
          </label>
        </div>
        <ProjectFormDialog
          key={`${editProject?.id ?? "__create__"}-${dialogOpen}`}
          editProject={dialogOpen ? editProject : null}
          open={dialogOpen}
          onOpenChange={(o) => {
            createMutation.reset();
            updateMutation.reset();
            setDialogOpen(o);
            if (!o) setEditProject(null);
          }}
          onSubmit={handleFormSubmit}
          isPending={createMutation.isPending || updateMutation.isPending}
          serverError={(editProject ? updateMutation.error : createMutation.error)?.message}
        />
      </div>

      {deleteMutation.error && <p role="alert" className="text-sm text-red-700">{deleteMutation.error.message}</p>}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Projekte durchsuchen"
          placeholder="Projekt oder Kunde suchen…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-9"
        />
      </div>

      {projects && projects.length > 0 && filteredProjects?.length === 0 && (
        <p role="status" className="py-8 text-center text-sm text-muted-foreground">
          Keine passenden Projekte gefunden.
        </p>
      )}

      {projects && projects.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              Noch keine Projekte. Erstelle dein erstes Projekt.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {filteredProjects?.map((project) => (
          <Card key={project.id}>
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="size-3 rounded-full shrink-0"
                    style={{
                      backgroundColor: project.color ?? "#6366f1",
                    }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {project.name}
                      </span>
                      {project.customer_name && (
                        <span className="text-xs text-muted-foreground truncate">
                          · {project.customer_name}
                        </span>
                      )}
                      {!project.active && (
                        <Badge
                          variant="secondary"
                          className="text-[10px]"
                        >
                          Inaktiv
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {project.employee_count} Mitarbeiter
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openAssign(project.id)}
                    title="Mitarbeiter zuordnen"
                  >
                    <Users className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openEdit(project)}
                    title="Bearbeiten"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => deleteMutation.mutate(project.id)}
                    title="Löschen"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="size-3.5 text-red-500" />
                  </Button>
                </div>
              </div>

              {assignProjectId === project.id && (
                employees.isLoading ? <p className="mt-3 text-sm text-muted-foreground">Mitarbeiter werden geladen…</p>
                : employees.error ? <div role="alert" className="mt-3 space-y-2 text-sm text-red-700">
                  <p>{employees.error.message}</p>
                  <Button variant="outline" size="sm" onClick={() => employees.refetch()}>Erneut laden</Button>
                </div> : <ProjectAssignPanel
                  projectId={project.id}
                  employees={employees.data?.active ?? []}
                  onClose={() => setAssignProjectId(null)}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
