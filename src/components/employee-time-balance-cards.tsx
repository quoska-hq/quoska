import type { WeekOvertimeSummary } from "@/components/employee-self-service-helpers";
import {
  formatBalance,
  formatDurationCompact,
} from "@/components/employee-self-service-helpers";
import { Card, CardContent } from "@/components/ui/card";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

export function EmployeeTimeBalanceCards({
  currentWeek,
  cumulativeMinutes,
  initialMinutes,
  isCurrentWeek,
}: {
  currentWeek: WeekOvertimeSummary | null;
  cumulativeMinutes: number;
  initialMinutes: number;
  isCurrentWeek: boolean;
}) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3">
      <Card className="shadow-sm">
        <CardContent className="py-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isCurrentWeek ? "Wochenbilanz bis heute" : "Wochenbilanz"}
          </p>
          <p className={`font-mono text-xl font-bold tabular-nums ${
            currentWeek && currentWeek.overtimeMinutes > 0 ? "text-emerald-600" : "text-foreground"
          }`}>
            {currentWeek ? formatBalance(currentWeek.overtimeMinutes) : "—"}
          </p>
          {currentWeek && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {formatDurationCompact(currentWeek.workedMinutes)} von{" "}
              {formatDurationCompact(currentWeek.targetMinutes)}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="py-3">
          <div className="mb-1 flex items-center gap-1">
            {cumulativeMinutes > 0 ? (
              <TrendingUp className="size-3 text-emerald-500" />
            ) : cumulativeMinutes < 0 ? (
              <TrendingDown className="size-3 text-amber-500" />
            ) : (
              <Minus className="size-3 text-muted-foreground" />
            )}
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Gesamtüberstunden
            </p>
          </div>
          <p className={`font-mono text-xl font-bold tabular-nums ${
            cumulativeMinutes > 0
              ? "text-emerald-600"
              : cumulativeMinutes < 0 ? "text-amber-600" : "text-foreground"
          }`}>
            {formatBalance(cumulativeMinutes)}
          </p>
          {initialMinutes !== 0 && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              inkl. Startsaldo {formatBalance(initialMinutes)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
