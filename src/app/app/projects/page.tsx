/**
 * Projects Page — /app/projects
 *
 * Admin/manager: manage projects, assign employees.
 */

import { ProjectList } from "@/components/project-list";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/config/supabase/server";
import { getEmployeeFromAuth } from "@/services/timeEntryService";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data } = await getEmployeeFromAuth(supabase);
  const canManage = data?.role === "admin";
  const canViewReports = canManage || data?.role === "manager";
  return (
    <div>
      <PageHeader
        title="Projekte"
        description="Projekte und Kunden verwalten, Mitarbeitern zuordnen."
      />
      <ProjectList canManage={canManage} canViewReports={canViewReports} />
    </div>
  );
}
