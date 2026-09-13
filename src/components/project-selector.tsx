"use client";

import { Combobox } from "@base-ui/react/combobox";
import { Briefcase, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ProjectOption {
  id: string;
  name: string;
  color: string | null;
}

interface ProjectSelectorProps {
  projects: ProjectOption[];
  value: string | null;
  onValueChange: (value: string | null) => void;
  disabled?: boolean;
}

const noProject: ProjectOption = { id: "none", name: "Kein Projekt", color: null };

export function ProjectSelector({ projects, value, onValueChange, disabled }: ProjectSelectorProps) {
  if (projects.length === 0) return null;

  const selected = projects.find((project) => project.id === value) ?? noProject;
  return (
    <div className="space-y-2 rounded-sm border border-slate-900/15 bg-white p-4">
      <Combobox.Root
        items={[noProject, ...projects]}
        value={selected}
        onValueChange={(project) => onValueChange(project?.id === "none" ? null : project?.id ?? null)}
        itemToStringLabel={(project) => project.name}
        isItemEqualToValue={(a, b) => a.id === b.id}
        disabled={disabled}
      >
        <Combobox.Label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Briefcase className="size-3" />
          Projektzuordnung
        </Combobox.Label>
        <Combobox.Trigger render={<Button variant="outline" />} className="h-9 w-full justify-between bg-[#faf9f6]">
          <span className="truncate">{selected.name}</span>
          <ChevronsUpDown className="size-4 text-muted-foreground" />
        </Combobox.Trigger>
        <Combobox.Portal>
          <Combobox.Positioner sideOffset={4} align="start" className="z-50">
            <Combobox.Popup className="w-(--anchor-width) max-w-(--available-width) rounded-sm border border-slate-900/20 bg-popover p-1 text-popover-foreground shadow-lg">
              <Combobox.Input
                aria-label="Projekt suchen"
                placeholder="Projekt suchen…"
                className="mb-1 h-9 w-full rounded-sm border border-input bg-white px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-brand/20 md:text-sm"
              />
              <Combobox.Empty className="px-3 py-4 text-sm text-muted-foreground empty:hidden">
                Keine passenden Projekte gefunden.
              </Combobox.Empty>
              <Combobox.List className="max-h-60 overflow-y-auto overscroll-contain">
                {(project: ProjectOption) => (
                  <Combobox.Item key={project.id} value={project} className="flex cursor-default items-center gap-2 rounded-sm px-2.5 py-2 text-sm outline-none data-highlighted:bg-accent">
                    {project.color && <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />}
                    <span className="min-w-0 flex-1 break-words">{project.name}</span>
                    <Combobox.ItemIndicator><Check className="size-4" /></Combobox.ItemIndicator>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </div>
  );
}
