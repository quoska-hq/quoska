/**
 * Projects Page — /app/projects
 *
 * Admin/manager: manage projects, assign employees.
 */

"use client";

import { ProjectList } from "@/components/project-list";
import { PageHeader } from "@/components/page-header";

export default function ProjectsPage() {
  return (
    <div>
      <PageHeader
        title="Projekte"
        description="Projekte und Kunden verwalten, Mitarbeitern zuordnen."
      />
      <ProjectList />
    </div>
  );
}
