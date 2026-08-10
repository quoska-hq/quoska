"use client";

import { useState } from "react";
import type { CockpitActivityCategory, CockpitActivityRow } from "@/types/cockpit";
import { formatCockpitTimestamp } from "@/components/cockpit-formatters";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock3, Coffee, PencilLine, ShieldCheck } from "lucide-react";

type ActivityFilter = "all" | CockpitActivityCategory;

export function CockpitActivityLog({ rows }: { rows: CockpitActivityRow[] }) {
  const [category, setCategory] = useState<ActivityFilter>("all");
  const [visibleCount, setVisibleCount] = useState(20);
  const visible = category === "all"
    ? rows
    : rows.filter((row) => row.category === category);
  const displayed = visible.slice(0, visibleCount);

  const selectCategory = (value: string | null) => {
    if (!value) return;
    setCategory(value as ActivityFilter);
    setVisibleCount(20);
  };

  return (
    <div className="space-y-4" data-testid="cockpit-activity">
      <div className="flex justify-end">
        <Select
          value={category}
          onValueChange={selectCategory}
        >
          <SelectTrigger className="w-full bg-white sm:w-48" aria-label="Ereignistyp">
            <SelectValue>
              {category === "all"
                ? "Alle Ereignisse"
                : category === "clock"
                  ? "Stempelzeiten"
                  : category === "break"
                    ? "Pausen"
                    : "Korrekturen"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Ereignisse</SelectItem>
            <SelectItem value="clock">Stempelzeiten</SelectItem>
            <SelectItem value="break">Pausen</SelectItem>
            <SelectItem value="correction">Korrekturen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="gap-0 bg-white py-0">
        <CardContent className="p-0!">
          {visible.length === 0 ? (
            <div className="py-16 text-center">
              <ShieldCheck className="mx-auto size-6 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">Keine Aktivitäten in diesem Zeitraum.</p>
            </div>
          ) : (
            <ol className="divide-y divide-slate-900/10">
              {displayed.map((row) => <ActivityItem key={row.id} row={row} />)}
            </ol>
          )}
        </CardContent>
      </Card>

      {visible.length > displayed.length && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setVisibleCount((count) => count + 20)}>
            Weitere anzeigen
          </Button>
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <ShieldCheck className="size-3.5" />
        Stempelzeiten, Pausen und Korrekturen werden unveränderlich protokolliert.
      </p>
    </div>
  );
}

function ActivityItem({ row }: { row: CockpitActivityRow }) {
  const Icon = row.category === "break" ? Coffee : row.category === "correction" ? PencilLine : Clock3;
  const actor = row.actorName !== row.employeeName ? ` · durch ${row.actorName}` : "";
  return (
    <li className="grid gap-3 px-4 py-4 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-start">
      <span className="hidden size-8 items-center justify-center bg-[#eeeafd] text-[#6658d3] sm:flex">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Icon className="size-4 shrink-0 text-[#6658d3] sm:hidden" />
          <p className="font-medium text-slate-900">{row.title}</p>
        </div>
        <p className="mt-1 truncate text-xs text-slate-500">
          {row.employeeName}{row.projectName ? ` · ${row.projectName}` : ""}{actor}
        </p>
        {(row.detail || row.reason) && (
          <p className="mt-1.5 text-xs text-slate-700">
            {row.detail}{row.detail && row.reason ? " · " : ""}{row.reason}
          </p>
        )}
      </div>
      <time className="ml-6 whitespace-nowrap text-xs tabular-nums text-slate-500 sm:ml-0">
        {formatCockpitTimestamp(row.occurredAt)}
      </time>
    </li>
  );
}
