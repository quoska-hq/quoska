/**
 * ClockMainCard — the primary clock card: circular progress ring, the main
 * stamp button, live status badge, animated balance display, and the
 * carry-over / daily-progress indicators.
 *
 * Presentational: all values arrive as already-computed props.
 */

"use client";

import type { TimeEntry, BreakSession } from "@/types/database";
import type { TodaySummary } from "@/types/compliance";
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
  TrendingUp,
} from "lucide-react";
import { formatTimeLocal } from "@/config/client/date-utils";
import { ProgressRing } from "@/components/progress-ring";
import { formatBalance, formatDuration, formatDurationCompact } from "@/components/clock-format";
import type { ClockButtonConfig, OptimisticAction } from "@/components/clock-button-config";

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
  animatedBalance: number;
  liveBalance: number;
  todaySummary: TodaySummary | null;
  projectName?: string;
  monthCarryOverMinutes: number;
  todayWorkedMinutes: number;
  dailyTargetMinutes: number;
  progressFraction: number;
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
  animatedBalance,
  liveBalance,
  todaySummary,
  projectName,
  monthCarryOverMinutes,
  todayWorkedMinutes,
  dailyTargetMinutes,
  progressFraction,
}: ClockMainCardProps) {
  const buttonHint = btn.label === "Ausstempeln"
    ? "Arbeitszeit beenden"
    : btn.label === "Pause beenden"
      ? "Zurück an die Arbeit"
      : "Arbeitszeit starten";

  return (
    <Card className="overflow-visible border-slate-900/15 bg-[linear-gradient(180deg,#ffffff_0%,#fbfaf7_100%)] !shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <CardContent className="flex flex-col items-center gap-5 px-6 py-6 sm:px-7 sm:py-7">

        <div className="flex w-full items-center justify-between border-b border-slate-900/10 pb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#5145ad]">
              Heute
            </p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">
              Dein Arbeitstag
            </p>
          </div>

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
              Startklar
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
                  disabled={isProcessing && !optimisticAction}
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
              <p>{btn.label}</p>
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

        {/* ---- Animated balance display ---- */}
        {(activeEntry || (todaySummary && todaySummary.netMinutes > 0)) && !activeBreak ? (
          <div className="text-center">
            <p className={`text-[2.15rem] font-mono font-bold tracking-[-0.04em] tabular-nums ${
              animatedBalance < 0
                ? "text-foreground"
                : animatedBalance === 0
                  ? "text-foreground"
                  : "text-emerald-600"
            }`}>
              {animatedBalance < 0
                ? formatDuration(Math.abs(animatedBalance))
                : formatBalance(animatedBalance)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {animatedBalance < 0
                ? "noch bis zum Tagesziel"
                : animatedBalance === 0
                  ? "Tagesziel erreicht"
                  : "Überstunden heute"
              }
            </p>
          </div>
        ) : null}

        {/* Break running indicator */}
        {activeBreak && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Coffee className="size-4 text-amber-500" />
            <span>Pause läuft…</span>
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
        {hasReachedTarget && !activeEntry && liveBalance > 0 && (
          <div className="celebrate-text text-center">
            <p className="text-sm font-semibold text-emerald-600">
              🎉 Tagesziel erreicht!
            </p>
          </div>
        )}

        {/* Carry-over info */}
        {monthCarryOverMinutes !== 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className={`size-3 ${monthCarryOverMinutes > 0 ? "text-emerald-500" : "text-amber-500"}`} />
            <span>
              {monthCarryOverMinutes > 0
                ? `Übertrag aus vorherigen Tagen: +${formatDurationCompact(monthCarryOverMinutes)}`
                : `Übertrag aus vorherigen Tagen: -${formatDurationCompact(Math.abs(monthCarryOverMinutes))}`
              }
            </span>
          </div>
        )}

        {/* Daily progress indicator */}
        {(todayWorkedMinutes > 0 || hasReachedTarget) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDurationCompact(todayWorkedMinutes)}</span>
            <span className="text-muted-foreground/40">/</span>
            <span>{formatDurationCompact(dailyTargetMinutes)} Soll</span>
            <Badge
              variant={hasReachedTarget ? "default" : "secondary"}
              className={`text-[10px] px-1.5 py-0 rounded-full ${
                hasReachedTarget
                  ? "bg-emerald-600 text-white border-0"
                  : ""
              }`}
            >
              {Math.min(Math.round(progressFraction * 100), 100)}%
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
