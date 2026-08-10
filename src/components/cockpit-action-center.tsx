"use client";

import { useState } from "react";
import Link from "next/link";
import type { CockpitActionItem } from "@/types/cockpit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";

export function CockpitActionCenter({
  actions,
  onEmployeeSelect,
}: {
  actions: CockpitActionItem[];
  onEmployeeSelect: (employeeId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (actions.length === 0) {
    return (
      <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-800">
        <CheckCircle2 className="size-4" />
        <span className="font-medium">Alles im grünen Bereich</span>
        <span className="hidden text-emerald-700 sm:inline">Keine offenen Auffälligkeiten.</span>
      </div>
    );
  }

  const visible = expanded ? actions : actions.slice(0, 4);
  return (
    <Card className="gap-0 border-amber-300 bg-white py-0" data-testid="cockpit-action-center">
      <CardHeader className="flex-row items-center justify-between border-b py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center bg-amber-50 text-amber-700">
            <AlertTriangle className="size-4" />
          </span>
          <div>
            <CardTitle>Handlungsbedarf</CardTitle>
            <p className="mt-0.5 text-xs text-slate-500">{actions.length} offene Hinweise</p>
          </div>
        </div>
        {actions.length > 4 && (
          <Button variant="ghost" size="sm" onClick={() => setExpanded((value) => !value)}>
            {expanded ? "Weniger" : "Alle anzeigen"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid p-0! sm:grid-cols-2">
        {visible.map((item) => (
          <div
            key={item.id}
            className="flex min-w-0 items-center gap-3 border-b border-slate-900/10 px-4 py-3 odd:sm:border-r"
          >
            <i className={`size-2 shrink-0 rounded-full ${severityColor(item.severity)}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">{item.description}</p>
            </div>
            {item.href ? (
              <Link href={item.href} className="text-xs font-semibold text-[#6658d3] hover:underline">
                Prüfen
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => onEmployeeSelect(item.employeeId)}
                className="flex size-8 shrink-0 items-center justify-center text-slate-400 hover:text-[#6658d3]"
                aria-label={`${item.employeeName} ansehen`}
              >
                <ChevronRight className="size-4" />
              </button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function severityColor(severity: CockpitActionItem["severity"]): string {
  if (severity === "critical") return "bg-red-500";
  if (severity === "warning") return "bg-amber-500";
  return "bg-slate-400";
}
