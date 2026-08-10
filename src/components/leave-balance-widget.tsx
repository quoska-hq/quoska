/**
 * Leave Balance Widget — Shows entitlement, used, pending, available days.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Palmtree } from "lucide-react";

interface LeaveBalanceData {
  total: number;
  used: number;
  pending: number;
  available: number;
  carried_over: number;
}

export function LeaveBalanceWidget({ employeeId }: { employeeId?: string }) {
  const url = employeeId
    ? `/api/v1/leave-entitlements/${employeeId}`
    : "/api/v1/leave-entitlements/me";

  const { data, isLoading } = useQuery<LeaveBalanceData>({
    queryKey: ["leaveBalance", employeeId],
    queryFn: async () => {
      const res = await fetch(url);
      const json: ApiResponse<LeaveBalanceData> = await res.json();
      return json.data!;
    },
  });

  if (isLoading) {
    return <Skeleton className="h-24 rounded-sm" />;
  }

  if (!data) return null;

  return (
    <Card className="border-slate-900/15 bg-white">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-sm border border-[#6658d3]/20 bg-[#f5f3ff] text-[#5548ba]">
            <Palmtree className="size-4" />
          </div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Urlaubskontingent
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <BalanceItem label="Anspruch" value={data.total} />
          <BalanceItem label="Genehmigt" value={data.used} variant="used" />
          <BalanceItem label="Ausstehend" value={data.pending} variant="pending" />
          <BalanceItem label="Verfügbar" value={data.available} variant={data.available <= 3 ? "low" : "available"} />
        </div>
      </CardContent>
    </Card>
  );
}

function BalanceItem({ label, value, variant }: { label: string; value: number; variant?: string }) {
  const colorMap: Record<string, string> = {
    used: "border-[#6658d3]/15 bg-[#f5f3ff] text-[#5548ba]",
    pending: "border-amber-700/15 bg-amber-50/55 text-amber-700",
    low: "border-red-700/15 bg-red-50/55 text-red-700",
    available: "border-emerald-700/15 bg-emerald-50/55 text-emerald-700",
  };
  const color =
    colorMap[variant ?? ""] ??
    "border-slate-900/10 bg-[#faf9f6] text-slate-700";

  return (
    <div className={cn("rounded-sm border px-3 py-3", color)}>
      <p className="text-xl font-semibold leading-none tabular-nums">{value}</p>
      <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
    </div>
  );
}
