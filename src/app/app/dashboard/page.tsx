/**
 * Dashboard Page — /app/dashboard
 *
 * Manager view: live team status, compliance alerts, missing entries.
 * Employee view: personal summary with links to Stempeln.
 */

import { createClient } from "@/config/supabase/server";
import { AdminCockpit } from "@/components/admin-cockpit";
import { ManagerDashboard } from "@/components/manager-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { Clock, ClipboardList, Bell, AlertTriangle } from "lucide-react";

export default async function DashboardPage() {
  let firstName = "";
  let setupComplete = false;
  let role = "employee";

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: employee } = await supabase
        .from("employees")
        .select("first_name, tenant_id, role")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .single();

      if (employee) {
        firstName = employee.first_name;
        role = employee.role;

        const { data: tenant } = await supabase
          .from("tenants")
          .select("setup_complete")
          .eq("id", employee.tenant_id)
          .single();

        setupComplete = tenant?.setup_complete ?? false;
      }
    }
  } catch {
    // Gracefully degrade if Supabase client fails
  }

  const isManager = role === "admin" || role === "manager";
  const isAdmin = role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-slate-950">
          {isAdmin
            ? "Cockpit"
            : `Willkommen bei Quoska${firstName ? `, ${firstName}` : ""}`}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {isAdmin ? "Arbeitszeit und Aktivitäten im Überblick" : "Zeiterfassung für dein Team"}
        </p>
      </div>

      {!setupComplete && (
        <Alert className="border-amber-200 bg-amber-50/50">
          <AlertDescription>
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center border border-amber-300 text-amber-700">
                <AlertTriangle className="size-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">
                  Einrichtung unvollständig
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Schließe die Einrichtung ab, um Quoska vollständig zu nutzen.
                </p>
                <Link href="/setup">
                  <Button className="mt-3" size="sm">
                    Einrichtung starten
                  </Button>
                </Link>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {isAdmin ? (
        <AdminCockpit />
      ) : isManager ? (
        <ManagerDashboard />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/app/clock">
            <Card className="group cursor-pointer border-slate-900/15 bg-white transition-colors hover:border-[#6658d3]">
              <CardContent className="p-6">
                <div className="mb-5 flex items-center justify-between border-b border-slate-900/10 pb-4">
                  <span className="font-mono text-xs text-[#6658d3]">01</span>
                  <Clock className="size-5 text-slate-400 group-hover:text-[#6658d3]" />
                </div>
                <h3 className="mb-1 font-semibold text-slate-950">Stempeln</h3>
                <p className="text-sm text-slate-500">
                  Clock in und out mit einem Klick
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/app/my-times">
            <Card className="group cursor-pointer border-slate-900/15 bg-white transition-colors hover:border-[#6658d3]">
              <CardContent className="p-6">
                <div className="mb-5 flex items-center justify-between border-b border-slate-900/10 pb-4">
                  <span className="font-mono text-xs text-[#6658d3]">02</span>
                  <ClipboardList className="size-5 text-slate-400 group-hover:text-[#6658d3]" />
                </div>
                <h3 className="mb-1 font-semibold text-slate-950">Meine Zeiten</h3>
                <p className="text-sm text-slate-500">
                  Übersicht aller erfassten Zeiten
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/app/notifications">
            <Card className="group cursor-pointer border-slate-900/15 bg-white transition-colors hover:border-[#6658d3]">
              <CardContent className="p-6">
                <div className="mb-5 flex items-center justify-between border-b border-slate-900/10 pb-4">
                  <span className="font-mono text-xs text-[#6658d3]">03</span>
                  <Bell className="size-5 text-slate-400 group-hover:text-[#6658d3]" />
                </div>
                <h3 className="mb-1 font-semibold text-slate-950">Benachrichtigungen</h3>
                <p className="text-sm text-slate-500">
                  Warnungen und Hinweise
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}
    </div>
  );
}
