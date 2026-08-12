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
import { CorrectionReviewList } from "@/components/correction-review-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ManualTimeEntryDialog } from "@/components/manual-time-entry-dialog";
import { useSearchParams } from "next/navigation";

export default function ReportsPage() {
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab = requestedTab === "projects" || requestedTab === "corrections"
    ? requestedTab
    : "weekly";

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Berichte</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Wochenübersicht, Projekte und Korrekturanfragen
          </p>
        </div>
        <Button onClick={() => setManualEntryOpen(true)} className="gap-1.5">
          <Plus className="size-4" />
          Zeit hinzufügen
        </Button>
      </div>

      <ManualTimeEntryDialog
        open={manualEntryOpen}
        onClose={() => setManualEntryOpen(false)}
        allowEmployeeSelection
      />

      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="weekly">Wochenbericht</TabsTrigger>
          <TabsTrigger value="projects">Projekte</TabsTrigger>
          <TabsTrigger value="corrections">Korrekturen</TabsTrigger>
        </TabsList>
        <TabsContent value="weekly">
          <WeeklyReportTable />
        </TabsContent>
        <TabsContent value="projects">
          <ProjectReportTable />
        </TabsContent>
        <TabsContent value="corrections">
          <CorrectionReviewList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
