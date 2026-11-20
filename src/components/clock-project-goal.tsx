"use client";

import Link from "next/link";
import { getWeekMondayForOffset } from "@/config/client/date-utils";
import { usePersonalProjectGoals } from "@/hooks/use-personal-project-goals";
import { projectGoalProgress } from "@/lib/project-goal-progress";
import { formatWorkMinutes } from "@/types/work-schedule";

export function ClockProjectGoal({ projectId, isTracking }: { projectId: string | null; isTracking: boolean }) {
  const { data } = usePersonalProjectGoals(getWeekMondayForOffset(0));
  if (!data?.length) return null;

  const link = (
    <Link href="/app/my-times#projektziele" className="font-medium text-primary underline underline-offset-2">
      Meine Projektziele
    </Link>
  );
  const goal = data.find((entry) => entry.projectId === projectId);
  if (!goal) {
    return (
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1 text-sm">
        {projectId && <p className="text-muted-foreground">Für dieses Projekt gibt es in dieser Woche kein Ziel.</p>}
        {link}
      </div>
    );
  }
  const progress = projectGoalProgress(goal);
  return (
    <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-sm border border-border px-3 py-2 text-sm">
      <div className="min-w-0 [overflow-wrap:anywhere]">
        <p className="font-medium">{goal.projectName}</p>
        <p className="text-muted-foreground">
          {goal.plannedMinutes > 0 && `Wochenziel ${formatWorkMinutes(goal.plannedMinutes)} · `}
          {progress.label}{progress.minutes !== null && ` ${formatWorkMinutes(progress.minutes)}`}
        </p>
        {isTracking && <p className="mt-1 text-xs text-muted-foreground">Die laufende Buchung zählt nach dem Ausstempeln oder einem Projektwechsel.</p>}
      </div>
      {link}
    </div>
  );
}
