"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { usePersonalProjectGoals } from "@/hooks/use-personal-project-goals";
import { projectGoalProgress } from "@/lib/project-goal-progress";
import { formatWorkMinutes } from "@/types/work-schedule";

export function PersonalProjectGoalsCard({ weekStart }: { weekStart: string }) {
  const query = usePersonalProjectGoals(weekStart);
  const anchor = useRef<HTMLElement>(null);
  const hasScrolled = useRef(false);
  const visible = Boolean(query.data?.length);

  useEffect(() => {
    if (visible && !hasScrolled.current && window.location.hash === "#projektziele") {
      anchor.current?.scrollIntoView();
      hasScrolled.current = true;
    }
  }, [visible]);

  if (!query.data && query.isError) {
    return (
      <div role="alert" className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>Projektziele konnten nicht geladen werden.</span>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>Erneut laden</Button>
      </div>
    );
  }
  if (!query.data?.length) return null;

  return (
    <section id="projektziele" ref={anchor} aria-labelledby="projektziele-heading" className="mb-6 scroll-mt-20">
      <Card className="shadow-sm">
        <CardHeader>
          <h2 id="projektziele-heading" className="font-medium">Meine Projektziele</h2>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {query.data.map((goal) => {
              const hasTarget = goal.plannedMinutes > 0;
              const progress = projectGoalProgress(goal);
              const balanceSign = goal.balanceMinutes > 0 ? "+" : goal.balanceMinutes < 0 ? "−" : "";
              return (
                <li key={goal.projectId} className="space-y-2 py-3 first:pt-0 last:pb-0">
                  <h3 className="font-semibold [overflow-wrap:anywhere]">{goal.projectName}</h3>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
                    <div>
                      <dt className="text-xs text-muted-foreground">Wochenziel</dt>
                      <dd className="font-medium tabular-nums">
                        {hasTarget ? formatWorkMinutes(goal.plannedMinutes) : progress.label}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Gebucht</dt>
                      <dd className="font-medium tabular-nums">{formatWorkMinutes(goal.actualMinutes)}</dd>
                    </div>
                    {hasTarget && (
                      <div className="col-span-2 sm:col-span-1">
                        <dt className="text-xs text-muted-foreground">{progress.minutes === null ? "Fortschritt" : progress.label}</dt>
                        <dd className="font-medium tabular-nums">
                          {progress.minutes === null ? progress.label : formatWorkMinutes(progress.minutes)}
                        </dd>
                      </div>
                    )}
                  </dl>
                  {hasTarget && (
                    <progress
                      aria-label={`Wochenfortschritt für ${goal.projectName}`}
                      aria-valuetext={`${formatWorkMinutes(goal.actualMinutes)} von ${formatWorkMinutes(goal.plannedMinutes)} gebucht`}
                      max={goal.plannedMinutes}
                      value={Math.min(Math.max(0, goal.actualMinutes), goal.plannedMinutes)}
                      className="block h-1.5 w-full appearance-none overflow-hidden rounded-full bg-muted [&::-moz-progress-bar]:bg-brand/60 [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-brand/60"
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Projektsaldo seit Zielbeginn <span className="tabular-nums">{balanceSign}{formatWorkMinutes(Math.abs(goal.balanceMinutes))}</span>
                  </p>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
