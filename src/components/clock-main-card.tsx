/**
 * ClockMainCard — the primary clock card: circular progress ring, the main
 * stamp button, and the live status.
 *
 * Presentational: all values arrive as already-computed props.
 */

"use client";

import type { TimeEntry, BreakSession } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  Coffee,
} from "lucide-react";
import { formatTimeLocal } from "@/config/client/date-utils";
import { ProgressRing } from "@/components/progress-ring";
import type { ClockButtonConfig, OptimisticAction } from "@/components/clock-button-config";
import { formatStopwatch } from "@/components/use-live-clock";
import { MIN_BREAK_BLOCK_SECONDS } from "@/config/break-policy";

interface ClockMainCardProps {
  ringProgress: number;
  ringSize: number;
  ringStroke: number;
  hasReachedTarget: boolean;
  isDeficit: boolean;
  activeEntry: TimeEntry | null;
  activeBreak: BreakSession | null;
  isActive: boolean;
  activePulse: boolean;
  popKey: number;
  btn: ClockButtonConfig;
  btnShadow: string;
  isProcessing: boolean;
  optimisticAction: OptimisticAction;
  onClockAction: () => void;
  projectName?: string;
  activeBreakSeconds: number;
}

export function ClockMainCard({
  ringProgress,
  ringSize,
  ringStroke,
  hasReachedTarget,
  isDeficit,
  activeEntry,
  activeBreak,
  isActive,
  activePulse,
  popKey,
  btn,
  btnShadow,
  isProcessing,
  optimisticAction,
  onClockAction,
  projectName,
  activeBreakSeconds,
}: ClockMainCardProps) {
  const breakRemainingSeconds = activeBreak
    ? Math.max(0, MIN_BREAK_BLOCK_SECONDS - activeBreakSeconds)
    : 0;
  const canEndBreak = activeBreak
    ? breakRemainingSeconds === 0
    : optimisticAction !== "pause";
  const buttonHint = activeBreak && breakRemainingSeconds > 0
    ? `Noch ${formatStopwatch(breakRemainingSeconds)}`
    : btn.label === "Ausstempeln"
      ? "Arbeitszeit beenden"
      : btn.label === "Pause beenden"
        ? "Zurück an die Arbeit"
        : "Arbeitszeit starten";

  return (
    <Card className="overflow-visible border-slate-900/15 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
      <CardContent className="flex flex-col items-center gap-5 px-6 py-6 sm:px-7 sm:py-7">

        <div className="flex w-full items-center justify-between border-b border-slate-900/10 pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#5145ad]">
            Heute
          </p>

          {isActive ? (
            <Badge
              variant="secondary"
              className="gap-1.5 rounded-full border border-emerald-900/10 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"
            >
              <span className={`size-2 rounded-full ${activeBreak ? "bg-amber-400" : "bg-emerald-500"} ${activePulse ? "animate-pulse" : ""}`} />
              {activeBreak
                ? `Pause seit ${formatTimeLocal(activeBreak.break_start)}`
                : activeEntry
                  ? `Seit ${formatTimeLocal(activeEntry.clock_in)}`
                  : "Aktiv"
              }
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground">
              <Clock className="size-3" />
              Nicht eingestempelt
            </Badge>
          )}
        </div>

        {/* Circular progress ring + button */}
        <div className="relative mt-1">
          <div className="pointer-events-none absolute inset-[13px] rounded-full border border-slate-900/10 bg-[#f2efe7] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <ProgressRing
              progress={ringProgress}
              size={ringSize}
              strokeWidth={ringStroke}
              celebrating={hasReachedTarget && !activeEntry}
              isDeficit={isDeficit}
            />
          </div>

          {/* The main stamp button — with pop animation */}
          <Tooltip key={popKey}>
            <TooltipTrigger
              render={(props: React.ComponentPropsWithoutRef<"button">) => (
                <button
                  {...props}
                  onClick={onClockAction}
                  disabled={isProcessing || !canEndBreak}
                  aria-label={btn.label}
                  className={`
                    stamp-button relative z-10
                    size-[176px]
                    rounded-full
                    overflow-hidden
                    border border-black/10
                    flex items-center justify-center
                    text-white
                    transition-[background-color,transform,box-shadow] duration-300 ease-out
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6658d3]/45 focus-visible:ring-offset-4
                    disabled:cursor-not-allowed
                    ${btn.bgClass} ${!optimisticAction ? btn.hoverClass : ""}
                  `}
                  style={{
                    boxShadow: btnShadow,
                    margin: (ringSize - 176) / 2,
                  }}
                >
                  <div className="pointer-events-none absolute inset-[7px] rounded-full border border-white/12" />
                  <div className="relative z-10 flex flex-col items-center gap-2.5">
                    <span className="flex size-10 items-center justify-center rounded-full border border-white/15 bg-black/10">
                      {btn.iconSvg}
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                      {btn.label}
                    </span>
                    <span className="text-[9px] font-medium tracking-wide text-white/70">
                      {buttonHint}
                    </span>
                  </div>
                </button>
              )}
            />
            <TooltipContent side="bottom">
              <p>
                {activeBreak && breakRemainingSeconds > 0
                  ? `Pause kann in ${formatStopwatch(breakRemainingSeconds)} beendet werden.`
                  : btn.label}
              </p>
            </TooltipContent>
          </Tooltip>

          {/* Target reached celebration badge */}
          {hasReachedTarget && !activeEntry && (
            <div className="absolute -top-1 -right-1 z-20 celebrate-badge">
              <div className="flex size-10 items-center justify-center rounded-full bg-amber-500">
                <CheckCircle2 className="size-5 text-white" />
              </div>
            </div>
          )}
        </div>

        {/* Break running indicator */}
        {activeBreak && (
          <div
            className="flex w-full items-center justify-center gap-3 border-t border-slate-900/10 pt-4"
            data-testid="active-break-duration"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <Coffee className="size-4" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Aktuelle Pause
              </p>
              <time
                className="mt-0.5 block font-mono text-xl font-semibold tabular-nums text-slate-950"
                dateTime={`PT${activeBreakSeconds}S`}
                aria-label={`Aktuelle Pause: ${formatStopwatch(activeBreakSeconds)}`}
              >
                {formatStopwatch(activeBreakSeconds)}
              </time>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {breakRemainingSeconds > 0
                  ? `Noch ${formatStopwatch(breakRemainingSeconds)} Mindestpause`
                  : "Mindestdauer erreicht"}
              </p>
            </div>
          </div>
        )}

        {/* Project info while running */}
        {activeEntry?.project_id && projectName && !activeBreak && (
          <Badge variant="outline" className="gap-1 text-xs rounded-full">
            <Briefcase className="size-3" />
            {projectName}
          </Badge>
        )}

        {/* Target reached celebration message */}
        {hasReachedTarget && !activeEntry && (
          <div className="celebrate-text text-center">
            <p className="text-sm font-semibold text-emerald-600">
              🎉 Tagesziel erreicht!
            </p>
          </div>
        )}

      </CardContent>
    </Card>
  );
}
