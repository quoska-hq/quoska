/**
 * ClockView — Premium clock in/out UI with circular progress ring,
 * state transitions, break tracking, and compliance warnings.
 *
 * Features:
 * - Optimistic UI: button changes instantly on click, rolls back on error
 * - Pop animation: satisfying bounce on button press
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import type { ClockStatusResponse } from "@/types/compliance";
import { ComplianceWarnings } from "@/components/compliance-warnings";
import { useClockMutations } from "@/components/clock-mutations";
import { ProjectSelector } from "@/components/project-selector";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PageHeader } from "@/components/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Pause, Coffee } from "lucide-react";
import {
  getButtonConfig,
  type OptimisticAction,
} from "@/components/clock-button-config";
import { formatDuration } from "@/components/clock-format";
import { ClockMainCard } from "@/components/clock-main-card";
import { ClockDayProgress } from "@/components/clock-day-progress";
import { TodaySummaryCard } from "@/components/clock-today-summary";
import { WeekSummaryCard } from "@/components/clock-week-summary";
import { useLiveElapsedSeconds } from "@/components/use-live-clock";

export function ClockView() {
  const [displayMinutes, setDisplayMinutes] = useState(0);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [pulsePhase, setPulsePhase] = useState(false);
  // Optimistic UI state: tracks what the user just pressed
  const [optimisticAction, setOptimisticAction] = useState<OptimisticAction>(null);
  const [popKey, setPopKey] = useState(0); // triggers pop animation
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const id = setInterval(() => setPulsePhase((p) => !p), 2000);
    return () => clearInterval(id);
  }, []);

  const { data: statusData, isLoading } = useQuery({
    queryKey: ["clockStatus"],
    queryFn: async () => {
      const res = await fetch("/api/v1/clock/status");
      const json: ApiResponse<ClockStatusResponse> = await res.json();
      return json.data;
    },
    refetchInterval: 30_000,
  });

  const activeEntry = statusData?.activeEntry ?? null;
  const activeBreak = statusData?.activeBreak ?? null;
  const compliance = statusData?.compliance;
  const todaySummary = statusData?.todaySummary;
  const weekSummary = statusData?.weekSummary;
  const monthCarryOverMinutes = statusData?.monthCarryOverMinutes ?? 0;
  const activeBreakSeconds = useLiveElapsedSeconds(activeBreak?.break_start, 0);

  const { data: myProjects } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["myProjects"],
    queryFn: async () => {
      const res = await fetch("/api/v1/projects?assigned=true");
      const json: ApiResponse<{ id: string; name: string }[]> = await res.json();
      return json.data ?? [];
    },
    staleTime: 60_000,
  });
  const projectName = myProjects?.find((p) => p.id === activeEntry?.project_id)?.name;

  const updateProjectMutation = useMutation({
    mutationFn: async ({ entryId, projectId }: { entryId: string; projectId: string }) => {
      const res = await fetch(`/api/v1/time-entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clock_in: activeEntry?.clock_in, reason: "Projekt nachträglich zugewiesen", project_id: projectId }),
      });
      if (!res.ok) throw new Error("Projekt konnte nicht zugewiesen werden");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clockStatus"] }),
  });

  const {
    clockInMutation, clockOutMutation, pauseMutation, resumeMutation,
    isProcessing, error,
  } = useClockMutations(activeEntry, activeBreak, selectedProject);

  // Live duration counter
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!activeEntry?.clock_in) return;

    const clockInMs = Date.parse(activeEntry.clock_in);
    const breakMin = activeEntry.break_minutes ?? 0;

    const tick = () => {
      const endMs = activeBreak
        ? Date.parse(activeBreak.break_start)
        // eslint-disable-next-line @quoska/legal/no-client-timestamps
        : Date.now();
      setDisplayMinutes(Math.round(Math.abs(endMs - clockInMs) / 60_000) - breakMin);
    };

    tick();
    if (activeBreak) return;
    intervalRef.current = setInterval(tick, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeBreak, activeEntry?.clock_in, activeEntry?.break_minutes]);

  // --- Balance calculation ---
  const dailyTargetMinutes = weekSummary
    ? weekSummary.dailyTargetMinutes
    : 480;

  // Today's worked minutes
  // When running: live counter + previously completed sessions today
  // When not running: all completed sessions from the API summary
  const completedTodayMinutes = todaySummary?.netMinutes ?? 0;
  const todayWorkedMinutes = activeEntry
    ? displayMinutes + completedTodayMinutes
    : completedTodayMinutes;

  const todayBalance = todayWorkedMinutes - dailyTargetMinutes;

  const progressFraction = dailyTargetMinutes > 0
    ? todayWorkedMinutes / dailyTargetMinutes
    : 0;

  const isDeficit = todayBalance < 0;
  // Only celebrate if user has actually worked today AND balance is positive
  const hasReachedTarget = todayBalance >= 0 && todayWorkedMinutes > 0;

  // Clear optimistic state when the server reflects the action.
  // Uses React's "set state during render" reconciliation pattern (per the
  // React docs "You Might Not Need an Effect") instead of setState-in-an-effect,
  // which would cause cascading renders. Self-terminating: once cleared to null,
  // no branch matches on subsequent renders.
  if (optimisticAction === "clock-in" && activeEntry?.status === "running") {
    setOptimisticAction(null);
  } else if (optimisticAction === "clock-out" && !activeEntry) {
    setOptimisticAction(null);
  } else if (optimisticAction === "pause" && activeBreak) {
    setOptimisticAction(null);
  } else if (optimisticAction === "resume" && activeEntry?.status === "running" && !activeBreak) {
    setOptimisticAction(null);
  }

  // --- Button configuration ---
  // Optimistic: if user just pressed, show the NEXT state immediately
  const btn = getButtonConfig(activeEntry, activeBreak, optimisticAction);

  const handleClockAction = useCallback(() => {
    // Trigger pop animation
    setPopKey((k) => k + 1);

    if (activeBreak) {
      // Ending a break is server-validated (including the 15-minute minimum).
      // Keep the paused UI stable until the server confirms the transition.
      resumeMutation.mutate(undefined);
      return;
    }
    if (activeEntry?.status === "running") {
      setOptimisticAction("clock-out");
      clockOutMutation.mutate(undefined, {
        onError: () => setOptimisticAction(null),
      });
      return;
    }
    setOptimisticAction("clock-in");
    clockInMutation.mutate(undefined, {
      onError: () => setOptimisticAction(null),
    });
  }, [activeBreak, activeEntry, clockInMutation, clockOutMutation, resumeMutation]);

  const handlePause = useCallback(() => {
    setOptimisticAction("pause");
    pauseMutation.mutate(undefined, {
      onError: () => setOptimisticAction(null),
    });
  }, [pauseMutation]);

  const isActive = activeEntry?.status === "running" || !!activeBreak || !!optimisticAction;
  const activePulse = isActive && pulsePhase;
  const btnShadow = `0 1px 0 rgba(255,255,255,0.16) inset, 0 11px 24px ${btn.shadowColor}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Skeleton className="h-52 w-52 rounded-full" />
      </div>
    );
  }

  const ringSize = 216;
  const ringStroke = 8;
  const ringProgress = Math.min(progressFraction, 1);

  return (
    <TooltipProvider>
      <div className="w-full">
        <PageHeader
          title="Stempeln"
          description="Arbeitszeit starten, pausieren und den Tag im Blick behalten."
        />

        {error && (
          <Alert variant="destructive" className="mb-5">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(19rem,0.85fr)]">
          <section className="space-y-4">
            <ClockMainCard
              ringProgress={ringProgress}
              ringSize={ringSize}
              ringStroke={ringStroke}
              hasReachedTarget={hasReachedTarget}
              isDeficit={isDeficit}
              activeEntry={activeEntry}
              activeBreak={activeBreak}
              isActive={isActive}
              activePulse={activePulse}
              popKey={popKey}
              btn={btn}
              btnShadow={btnShadow}
              isProcessing={isProcessing}
              optimisticAction={optimisticAction}
              onClockAction={handleClockAction}
              projectName={projectName}
              activeBreakSeconds={activeBreakSeconds}
            />

            {!activeEntry && !optimisticAction && (
              <ProjectSelector value={selectedProject} onValueChange={setSelectedProject} />
            )}

            {activeEntry?.status === "running" && !activeBreak && !activeEntry.project_id && (
              <ProjectSelector value={selectedProject} onValueChange={(v) => {
                setSelectedProject(v);
                if (v && activeEntry) updateProjectMutation.mutate({ entryId: activeEntry.id, projectId: v });
              }} />
            )}

            {activeEntry?.status === "running" && !activeBreak && (
              <Button
                variant="outline"
                size="lg"
                onClick={handlePause}
                disabled={isProcessing && !optimisticAction}
                className="w-full gap-2"
              >
                <Pause className="size-4" />
                Pause starten
              </Button>
            )}

            {activeEntry && activeEntry.break_minutes > 0 && (
              <div className="flex items-center gap-1.5 px-1 text-sm text-muted-foreground">
                <Coffee className="size-3.5" />
                Pause heute: {formatDuration(activeEntry.break_minutes)}
              </div>
            )}

            {compliance && compliance.warnings.length > 0 && (
              <ComplianceWarnings warnings={compliance.warnings} />
            )}
          </section>

          <aside className="space-y-4">
            <ClockDayProgress
              workedMinutes={todayWorkedMinutes}
              targetMinutes={dailyTargetMinutes}
              balanceMinutes={todayBalance}
              carryOverMinutes={monthCarryOverMinutes}
            />

            {!activeEntry && todaySummary?.clockIn && (
              <TodaySummaryCard todaySummary={todaySummary} />
            )}

            {weekSummary && (
              <WeekSummaryCard weekSummary={weekSummary} />
            )}
          </aside>
        </div>
      </div>
    </TooltipProvider>
  );
}
