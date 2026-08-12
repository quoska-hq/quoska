"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Coffee, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TimeTrackingSettings {
  automaticBreaksEnabled: boolean;
}
export function TimeTrackingSettingsCard() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<TimeTrackingSettings>({
    queryKey: ["timeTrackingSettings"],
    queryFn: async () => {
      const response = await fetch("/api/v1/settings/time-tracking");
      const json = await response.json();
      if (!response.ok || !json.data) throw new Error(json.error ?? "Einstellung konnte nicht geladen werden");
      return json.data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (automaticBreaksEnabled: boolean) => {
      const response = await fetch("/api/v1/settings/time-tracking", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automaticBreaksEnabled }),
      });
      const json = await response.json();
      if (!response.ok || !json.data) throw new Error(json.error ?? "Einstellung konnte nicht gespeichert werden");
      return json.data as TimeTrackingSettings;
    },
    onSuccess: (updated) => queryClient.setQueryData(["timeTrackingSettings"], updated),
  });

  const enabled = data?.automaticBreaksEnabled ?? true;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coffee className="size-4 text-[#6658d3]" />
          Pausen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-medium">Gesetzliche Mindestpause automatisch ergänzen</p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Beim Ausstempeln ergänzt Quoska fehlende Pausenminuten auf 30 Minuten
              bei mehr als 6 Stunden und 45 Minuten bei mehr als 9 Stunden.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Automatische Pausen"
            disabled={isLoading || mutation.isPending}
            onClick={() => mutation.mutate(!enabled)}
            className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${enabled ? "bg-[#6658d3]" : "bg-slate-300"}`}
          >
            <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>

        <div className="flex gap-2 border-t border-slate-900/10 pt-4 text-xs leading-5 text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          Automatisch ergänzte Minuten werden am Eintrag gekennzeichnet, im Verlauf
          protokolliert und der betroffenen Person per Benachrichtigung erklärt.
          Die tatsächliche Pause muss trotzdem genommen werden.
        </div>
        {mutation.error && <p className="text-sm text-destructive">{mutation.error.message}</p>}
      </CardContent>
    </Card>
  );
}
