/**
 * Export Buttons — CSV export button for the reports page.
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ExportButtonsProps {
  startDate: string;
  endDate: string;
  employeeId?: string;
  projectId?: string;
  disabled?: boolean;
}

export function ExportButtons({ startDate, endDate, employeeId, projectId, disabled }: ExportButtonsProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (employeeId) params.set("employeeId", employeeId);
      if (projectId) params.set("projectId", projectId);
      const res = await fetch(`/api/v1/reports/export/csv?${params}`);

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Export fehlgeschlagen");
      }

      // Download file
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="(.+?)"/);
      const filename = filenameMatch?.[1] ?? `export.csv`;

      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Export fehlgeschlagen");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex w-full items-center sm:w-auto">
      <Button
        variant="outline"
        size="sm"
        className="w-full sm:w-auto"
        onClick={handleExport}
        disabled={disabled || exporting}
      >
        {exporting ? "…" : "CSV Export"}
      </Button>
    </div>
  );
}
