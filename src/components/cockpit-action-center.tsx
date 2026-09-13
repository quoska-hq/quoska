"use client";

import { useState } from "react";
import { useCockpitDismissal } from "@/hooks/use-cockpit-dismissal";
import { CockpitUndoNotice } from "@/components/cockpit-undo-notice";
import Link from "next/link";
import type { CockpitActionItem } from "@/types/cockpit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, ChevronRight, X } from "lucide-react";
import { formatDateFullDE } from "@/config/client/date-utils";

export function CockpitActionCenter({
  actions,
  onEmployeeSelect,
  days,
  employeeId,
}: {
  actions: CockpitActionItem[];
  onEmployeeSelect?: (employeeId: string) => void;
  days: 7 | 30;
  employeeId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const { dismiss, undo, undoItems } = useCockpitDismissal();
  const dismissActions = (actionIds: string[]) => dismiss.mutate({
    days, employeeId: employeeId ?? undefined, actionIds,
  });
  if (actions.length === 0) {
    return (
      <>
      <CockpitUndoNotice undo={undo} undoItems={undoItems} />
      <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-800">
        <CheckCircle2 className="size-4" />
        <span className="font-medium">Keine offenen Hinweise</span>
      </div>
      </>
    );
  }

  const visible = expanded ? actions : actions.slice(0, 4);
  return (
    <>
    <CockpitUndoNotice undo={undo} undoItems={undoItems} />
    <Card className="gap-0 border-amber-300 bg-white py-0" data-testid="cockpit-action-center">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 border-b py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center bg-amber-50 text-amber-700">
            <AlertTriangle className="size-4" />
          </span>
          <div>
            <CardTitle>Handlungsbedarf</CardTitle>
            <p className="mt-0.5 text-xs text-slate-500">{actions.length} {actions.length === 1 ? "offener Hinweis" : "offene Hinweise"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {actions.length > 4 && (
            <Button variant="ghost" size="sm" onClick={() => setExpanded((value) => !value)}>
              {expanded ? "Weniger" : "Alle anzeigen"}
            </Button>
          )}
          <Button variant="outline" size="sm" disabled={dismiss.isPending}
            onClick={() => dismissActions(actions.map((item) => item.id))}
            aria-label={employeeId ? "Alle Hinweise dieser Person ausblenden" : "Alle Hinweise des Teams ausblenden"}>
            Alle ausblenden
          </Button>
        </div>
      </CardHeader>
      {dismiss.error && <p role="alert" className="px-4 py-3 text-sm text-red-700">{dismiss.error.message}</p>}
      <CardContent className="grid p-0! sm:grid-cols-2">
        {visible.map((item) => (
          <div
            key={item.id}
            data-testid="cockpit-action"
            data-action-id={item.id}
            className="flex min-w-0 items-start gap-3 border-b border-slate-900/10 px-4 py-3 odd:sm:border-r"
          >
            <i className={`mt-1.5 size-2 shrink-0 rounded-full ${severityColor(item.severity)}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
              <p className={`mt-0.5 text-xs text-slate-500 ${item.detail ? "" : "truncate"}`}>
                {item.description}
              </p>
              {item.detail && (
                <p className="mt-1 text-xs font-medium text-slate-700">
                  {item.detail}
                </p>
              )}
            </div>
            {item.href ? (
              <Link href={item.href} className="text-xs font-semibold text-[#6658d3] hover:underline">
                Prüfen
              </Link>
            ) : onEmployeeSelect ? (
              <button
                type="button"
                onClick={() => onEmployeeSelect(item.employeeId)}
                className="flex size-8 shrink-0 items-center justify-center text-slate-400 hover:text-[#6658d3]"
                aria-label={`${item.employeeName} ansehen`}
              >
                <ChevronRight className="size-4" />
              </button>
            ) : null}
            <Button variant="ghost" size="icon-sm" disabled={dismiss.isPending}
              onClick={() => dismissActions([item.id])}
              aria-label={`Hinweis ausblenden: ${item.title} · ${item.employeeName} · ${formatDateFullDE(item.date)}`}
              title="Hinweis ausblenden">
              <X className="size-3.5" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
    </>
  );
}

function severityColor(severity: CockpitActionItem["severity"]): string {
  if (severity === "critical") return "bg-red-500";
  if (severity === "warning") return "bg-amber-500";
  return "bg-slate-400";
}
