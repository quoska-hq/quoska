/**
 * HeaderClockWidget — compact clock in/out control for the global app header.
 *
 * Reuses the existing clock API endpoints via useClockMutations. Kept compact
 * (icon-led buttons) so it fits a 56px header. Intended for every /app/* page
 * EXCEPT /app/clock, which already has the full stamp button — rendering it
 * there would duplicate the "Stempeln" button and break that page's tests.
 */

"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import type { ClockStatusResponse } from "@/types/compliance";
import { useClockMutations } from "@/components/clock-mutations";
import { useLiveElapsedSeconds, formatStopwatch } from "@/components/use-live-clock";
import { Button } from "@/components/ui/button";
import { MIN_BREAK_BLOCK_SECONDS } from "@/config/break-policy";
import { AlertCircle, Coffee, Play, Square, X } from "lucide-react";

type Optimistic = "clock-in" | "clock-out" | "pause" | null;

export function HeaderClockWidget() {
  const queryClient = useQueryClient();
  const [optimistic, setOptimistic] = useState<Optimistic>(null);

  const { data: status } = useQuery({
    queryKey: ["clockStatus"],
    queryFn: async () => {
      const res = await fetch("/api/v1/clock/status");
      const json: ApiResponse<ClockStatusResponse> = await res.json();
      return json.data;
    },
    refetchInterval: 30_000,
  });

  const activeEntry = status?.activeEntry ?? null;
  const activeBreak = status?.activeBreak ?? null;

  const {
    clockInMutation,
    clockOutMutation,
    pauseMutation,
    resumeMutation,
    isProcessing,
    error,
    clearError,
  } = useClockMutations(activeEntry, activeBreak, null);

  // Effective state honours optimistic overrides so the button reflects the
  // just-pressed action immediately (matches the Stempeln page's behavior).
  const showClockedIn =
    optimistic === "clock-in" ||
    (!!activeEntry?.status && activeEntry.status === "running" && !activeBreak && optimistic !== "clock-out");
  const showPaused = optimistic === "pause" || !!activeBreak;
  const isClockedIn = showClockedIn || showPaused;

  // Live worked-since-clock_in timer (display only; net of completed breaks).
  const elapsed = useLiveElapsedSeconds(
    isClockedIn ? activeEntry?.clock_in : null,
    activeEntry?.break_minutes ?? 0,
  );
  const breakElapsed = useLiveElapsedSeconds(activeBreak?.break_start, 0);
  const visibleElapsed = showPaused
    ? activeBreak
      ? breakElapsed
      : 0
    : elapsed;
  const breakRemainingSeconds = Math.max(0, MIN_BREAK_BLOCK_SECONDS - breakElapsed);
  const canEndBreak = !!activeBreak && breakRemainingSeconds === 0;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["presence"] });
  const wrap = (
    fn: () => void,
    op: Exclude<Optimistic, null>,
    mutate: { mutate: (arg: undefined, opts?: object) => void },
  ) => {
    setOptimistic(op);
    mutate.mutate(undefined, {
      onSuccess: () => {
        setOptimistic(null);
        refresh();
      },
      onError: () => setOptimistic(null),
    });
  };

  return (
    <div className="flex items-center gap-1.5">
      {error && (
        <div
          role="alert"
          className="fixed top-20 right-4 left-4 z-50 flex items-start gap-3 border border-red-200 bg-white p-3 text-sm text-red-800 shadow-lg sm:left-auto sm:max-w-sm"
          data-testid="clock-error-toast"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p className="min-w-0 flex-1">{error}</p>
          <Button
            variant="ghost"
            size="icon-xs"
            className="-mt-1 -mr-1 size-7 shrink-0 text-red-700 hover:bg-red-50 hover:text-red-900"
            onClick={clearError}
            aria-label="Fehlermeldung schließen"
          >
            <X className="size-4" />
          </Button>
        </div>
      )}

      {/* Live elapsed timer — shown whenever clocked in (running or paused) */}
      {isClockedIn && activeEntry?.clock_in && (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/60"
          title={showPaused ? "In Pause" : "Eingestempelt"}
        >
          <span
            className={`size-2 rounded-full ${
              showPaused ? "bg-amber-500" : "bg-green-500 animate-pulse"
            }`}
          />
          <span className="font-mono text-sm font-medium tabular-nums">
            {formatStopwatch(visibleElapsed)}
          </span>
        </span>
      )}

      {/* Pause / resume — secondary, only while clocked in */}
      {showClockedIn && !showPaused && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => wrap(() => {}, "pause", pauseMutation)}
          disabled={isProcessing && !optimistic}
          aria-label="Pause starten"
          title="Pause starten"
          className="size-8"
        >
          <Coffee className="size-4" />
        </Button>
      )}
      {showPaused && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => resumeMutation.mutate(undefined, { onSuccess: refresh })}
          disabled={(isProcessing && !optimistic) || !canEndBreak}
          aria-label="Pause beenden"
          title={canEndBreak
            ? "Pause beenden"
            : `Pause kann in ${formatStopwatch(breakRemainingSeconds)} beendet werden.`}
          className="h-8 gap-1.5 border-amber-700/20 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
        >
          <Play className="size-4" />
          <span className="hidden sm:inline">Pause beenden</span>
        </Button>
      )}

      {/* Primary clock in / out */}
      {showClockedIn && !showPaused ? (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => wrap(() => {}, "clock-out", clockOutMutation)}
          disabled={isProcessing && !optimistic}
          aria-label="Ausstempeln"
          className="h-8 gap-1.5"
        >
          <Square className="size-4" />
          <span className="hidden sm:inline">Ausstempeln</span>
        </Button>
      ) : !showPaused ? (
        <Button
          size="sm"
          onClick={() => wrap(() => {}, "clock-in", clockInMutation)}
          disabled={isProcessing && !optimistic}
          aria-label="Stempeln"
          className="h-8 gap-1.5"
        >
          <Play className="size-4" />
          <span className="hidden sm:inline">Stempeln</span>
        </Button>
      ) : null}
    </div>
  );
}
