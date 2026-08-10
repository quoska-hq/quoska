/**
 * Vacation Page — /app/vacation
 *
 * Employee: balance widget, submit form, own requests list.
 * Manager/Admin: same + pending review section + absence calendar.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";
import { LeaveBalanceWidget } from "@/components/leave-balance-widget";
import { LeaveRequestForm } from "@/components/leave-request-form";
import { LeaveRequestList } from "@/components/leave-request-list";
import { LeaveReviewList } from "@/components/leave-review-list";
import { AbsenceCalendar } from "@/components/absence-calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function VacationPage() {
  const { data: authInfo } = useQuery<{ role: string; employeeId: string }>({
    queryKey: ["auth-info"],
    queryFn: async () => {
      const res = await fetch("/api/v1/employees/me");
      if (!res.ok) return { role: "employee", employeeId: "" };
      const json: ApiResponse<{ role: string; id: string }> = await res.json();
      return { role: json.data?.role ?? "employee", employeeId: json.data?.id ?? "" };
    },
  });

  const role = authInfo?.role ?? "employee";
  const isManager = role === "admin" || role === "manager";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Urlaub</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Urlaubsanträge und Übersicht
        </p>
      </div>

      {/* Balance */}
      <div className="mb-6">
        <LeaveBalanceWidget />
      </div>

      <Tabs defaultValue="requests">
        <TabsList className="mb-4">
          <TabsTrigger value="requests">Meine Anträge</TabsTrigger>
          {isManager && <TabsTrigger value="review">Offene Anträge</TabsTrigger>}
          <TabsTrigger value="calendar">Kalender</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <div className="flex justify-end">
            <LeaveRequestForm />
          </div>
          <LeaveRequestList />
        </TabsContent>

        {isManager && (
          <TabsContent value="review">
            <LeaveReviewList />
          </TabsContent>
        )}

        <TabsContent value="calendar">
          <AbsenceCalendar />
        </TabsContent>
      </Tabs>
    </div>
  );
}
