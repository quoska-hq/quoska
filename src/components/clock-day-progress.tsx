import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock3, TrendingUp } from "lucide-react";
import {
  formatDuration,
  formatDurationCompact,
} from "@/components/clock-format";

interface ClockDayProgressProps {
  workedMinutes: number;
  targetMinutes: number;
  balanceMinutes: number;
  carryOverMinutes: number;
}

export function ClockDayProgress({
  workedMinutes,
  targetMinutes,
  balanceMinutes,
  carryOverMinutes,
}: ClockDayProgressProps) {
  const progress = targetMinutes > 0
    ? Math.min(Math.round((workedMinutes / targetMinutes) * 100), 100)
    : workedMinutes > 0 ? 100 : 0;
  const targetReached = balanceMinutes >= 0 && workedMinutes > 0;

  return (
    <Card size="sm" className="bg-white" data-testid="clock-day-progress">
      <CardContent>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock3 className="size-3.5 text-[#6658d3]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Tagesfortschritt
            </span>
          </div>
          <Badge variant="outline" className="rounded-full px-2 text-[10px]">
            Soll: {formatDurationCompact(targetMinutes)}
          </Badge>
        </div>

        <p className="mt-5 font-mono text-3xl font-bold tracking-[-0.04em] tabular-nums">
          {formatDuration(workedMinutes)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Heute erfasst</p>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              targetReached ? "bg-emerald-600" : "bg-[#6658d3]"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 text-xs">
          <span className={targetReached ? "font-medium text-emerald-700" : "text-muted-foreground"}>
            {balanceLabel(balanceMinutes, workedMinutes, targetMinutes)}
          </span>
          <span className="font-medium tabular-nums text-slate-700">{progress}%</span>
        </div>

        {carryOverMinutes !== 0 && (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-900/10 pt-3 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="size-3" />
              Monatssaldo vor heute
            </span>
            <span className={`font-medium tabular-nums ${
              carryOverMinutes > 0 ? "text-emerald-700" : "text-amber-700"
            }`}>
              {carryOverMinutes > 0 ? "+" : "−"}
              {formatDurationCompact(Math.abs(carryOverMinutes))}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function balanceLabel(
  balanceMinutes: number,
  workedMinutes: number,
  targetMinutes: number,
): string {
  if (targetMinutes === 0) {
    return workedMinutes > 0 ? "Keine Sollzeit für heute" : "Heute ist kein Soll hinterlegt";
  }
  if (balanceMinutes < 0) {
    return `${formatDurationCompact(Math.abs(balanceMinutes))} bis zum Tagesziel`;
  }
  if (balanceMinutes === 0) return "Tagesziel erreicht";
  return `+${formatDurationCompact(balanceMinutes)} über dem Tagesziel`;
}
