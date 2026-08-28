"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ChecklistPrintButton() {
  return (
    <Button
      type="button"
      variant="outline"
      className="mt-7 rounded-none border-slate-400 bg-white"
      onClick={() => window.print()}
      data-checklist-print-hide
    >
      <Printer className="size-4" />
      Checkliste drucken oder als PDF speichern
    </Button>
  );
}
