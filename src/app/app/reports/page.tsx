/**
 * Reports Page — /app/reports
 *
 * Manager view: weekly report, project report, correction review.
 */

"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { WeeklyReportTable } from "@/components/weekly-report-table";
import { ProjectReportTable } from "@/components/project-report-table";
import { DatevExportPanel } from "@/components/datev-export-panel";
import { CorrectionReviewList } from "@/components/correction-review-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ManualTimeEntryDialog } from "@/components/manual-time-entry-dialog";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";

export default function ReportsPage() {
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab = requestedTab === "projects" || requestedTab === "corrections" || requestedTab === "datev"
    ? requestedTab
    : "weekly";

  return (
    <div data-testid="reports-page">
      <PageHeader
        title="Berichte"
        description="Wochenübersicht, Projekte und Korrekturanfragen"
        actions={(
          <Button
            onClick={() => setManualEntryOpen(true)}
            className="w-full gap-1.5 sm:w-auto"
          >
            <Plus className="size-4" />
            Zeit hinzufügen
          </Button>
        )}
      />

      <ManualTimeEntryDialog
        open={manualEntryOpen}
        onClose={() => setManualEntryOpen(false)}
        allowEmployeeSelection
      />

      <Tabs defaultValue={initialTab} className="min-w-0">
        <TabsList className="grid w-full grid-cols-2 auto-rows-9 group-data-horizontal/tabs:h-auto sm:flex sm:w-fit sm:group-data-horizontal/tabs:h-9">
          <TabsTrigger value="weekly" className="min-w-0 px-1.5 text-xs sm:px-3 sm:text-sm">
            Wochenbericht
          </TabsTrigger>
          <TabsTrigger value="projects" className="min-w-0 px-1.5 text-xs sm:px-3 sm:text-sm">
            Projekte
          </TabsTrigger>
          <TabsTrigger value="corrections" className="min-w-0 px-1.5 text-xs sm:px-3 sm:text-sm">
            Korrekturen
          </TabsTrigger>
          <TabsTrigger value="datev" className="min-w-0 px-1.5 text-xs sm:px-3 sm:text-sm">DATEV</TabsTrigger>
        </TabsList>
        <TabsContent value="weekly" className="min-w-0">
          <WeeklyReportTable />
        </TabsContent>
        <TabsContent value="projects" className="min-w-0">
          <ProjectReportTable />
        </TabsContent>
        <TabsContent value="corrections" className="min-w-0">
          <CorrectionReviewList />
        </TabsContent>
        <TabsContent value="datev" className="min-w-0"><DatevExportPanel /></TabsContent>
      </Tabs>
    </div>
  );
}
