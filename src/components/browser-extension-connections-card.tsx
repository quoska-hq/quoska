"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MonitorSmartphone, ShieldCheck } from "lucide-react";
import { formatDateTimeDE } from "@/config/client/date-utils";
import type { ApiResponse } from "@/types/api";
import type { BrowserExtensionConnection } from "@/types/browser-extension";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const QUERY_KEY = ["browserExtensionConnections"] as const;

export function BrowserExtensionConnectionsCard() {
  const queryClient = useQueryClient();
  const connections = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const response = await fetch("/api/v1/browser-extension/connections");
      const json: ApiResponse<BrowserExtensionConnection[]> = await response.json();
      if (!response.ok || !json.data) {
        throw new Error(json.error ?? "Browser-Verbindungen konnten nicht geladen werden.");
      }
      return json.data;
    },
  });
  const revoke = useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await fetch(
        `/api/v1/browser-extension/connections/${connectionId}`,
        { method: "DELETE" },
      );
      const json: ApiResponse<boolean> = await response.json();
      if (!response.ok || !json.data) {
        throw new Error(json.error ?? "Browser-Verbindung konnte nicht getrennt werden.");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MonitorSmartphone className="size-4 text-[#6658d3]" />
          Browser-Erweiterungen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 text-sm leading-6 text-muted-foreground">
          <ShieldCheck className="mt-1 size-4 shrink-0 text-emerald-600" />
          <p>
            Hier kannst du aktive Erweiterungen prüfen und verlorene oder nicht
            mehr verwendete Browser-Verbindungen sofort widerrufen.
          </p>
        </div>

        {connections.isLoading && (
          <p className="text-sm text-muted-foreground">Verbindungen werden geladen…</p>
        )}
        {connections.error && (
          <Alert variant="destructive">
            <AlertDescription>{connections.error.message}</AlertDescription>
          </Alert>
        )}
        {connections.data?.length === 0 && (
          <div className="border border-dashed border-slate-300 px-4 py-5 text-sm text-muted-foreground">
            Noch keine Browser-Erweiterung verbunden.
          </div>
        )}

        <div className="divide-y divide-slate-900/10 border-y border-slate-900/10">
          {connections.data?.map((connection) => (
            <div
              key={connection.id}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  {connection.lastUsedAt
                    ? "Quoska Browser-Erweiterung"
                    : "Freigabe noch nicht abgeschlossen"}
                  {" · "}{connection.employeeName}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {connection.lastUsedAt
                    ? `Verbunden ${formatDateTimeDE(connection.createdAt)} Uhr · Zuletzt aktiv ${formatDateTimeDE(connection.lastUsedAt)} Uhr`
                    : `Freigegeben ${formatDateTimeDE(connection.createdAt)} Uhr · Von der Erweiterung noch nicht bestätigt`}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                  ID {connection.extensionId.slice(0, 8)}…{connection.extensionId.slice(-6)}
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={revoke.isPending}
                onClick={() => revoke.mutate(connection.id)}
              >
                Verbindung widerrufen
              </Button>
            </div>
          ))}
        </div>

        {revoke.error && (
          <Alert variant="destructive">
            <AlertDescription>{revoke.error.message}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
