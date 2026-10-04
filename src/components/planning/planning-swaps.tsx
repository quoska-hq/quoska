"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  PlanningSwapData,
  PlanningSwapOption,
} from "@/types/planning-client";
import { planningFetch } from "@/services/planningClientService";
import { formatDateFullDE, formatTimeLocal } from "@/config/client/date-utils";
import { Button } from "@/components/ui/button";
import { useSupabase } from "@/providers/supabase-provider";
const STATUS = {
  requested: "Wartet auf Zustimmung",
  accepted: "Wartet auf Freigabe",
  approved: "Freigegeben",
  rejected: "Abgelehnt",
  cancelled: "Zurückgezogen",
};
export function PlanningSwaps({ manager = false }: { manager?: boolean }) {
  const { user } = useSupabase(),
    cache = useQueryClient();
  const query = useQuery({
    queryKey: ["planning-swaps", user?.id],
    queryFn: () => planningFetch<PlanningSwapData>("/swaps"),
    enabled: Boolean(user),
    refetchInterval: 15000,
  });
  const [source, setSource] = useState(""),
    [target, setTarget] = useState(""),
    [message, setMessage] = useState("");
  const mutation = useMutation({
    mutationFn: (body: unknown) => planningFetch("/swaps", body),
    onSuccess: () => {
      setMessage("Tauschanfrage aktualisiert.");
      void cache.invalidateQueries({ queryKey: ["planning-swaps"] });
      void cache.invalidateQueries({ queryKey: ["planning"] });
      void cache.invalidateQueries({ queryKey: ["planning-mine"] });
    },
    onError: (e) => setMessage(e.message),
  });
  const label = (s: PlanningSwapOption) =>
    `${formatDateFullDE(s.date)} ${formatTimeLocal(s.start)}–${formatTimeLocal(s.end)} · ${s.name}`;
  return (
    <section className="space-y-4 rounded-xl border bg-white p-4 print:hidden">
      <h2 className="font-semibold">Schichttausch</h2>
      <p className="text-sm text-muted-foreground">
        Beide Personen stimmen zu. Danach prüft die Planungsverantwortliche die
        aktuellen Regeln und gibt den Tausch frei.
      </p>
      {query.error && <p role="alert">{query.error.message}</p>}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      {query.data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Mein Dienst
              <select
                className="block w-full rounded-md border p-2"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="">Bitte wählen</option>
                {query.data.options
                  .filter((s) => s.employeeId === query.data.employeeId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {label(s)}
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-sm">
              Gewünschter Dienst
              <select
                className="block w-full rounded-md border p-2"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="">Bitte wählen</option>
                {query.data.options
                  .filter((s) => s.employeeId !== query.data.employeeId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {label(s)}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <Button
            variant="outline"
            disabled={mutation.isPending || !source || !target}
            onClick={() =>
              mutation.mutate({ action: "request", source, target })
            }
          >
            Tausch anfragen
          </Button>
          <div className="space-y-3">
            {query.data.swaps.map((s) => (
              <div key={s.id} className="rounded-lg border p-3">
                <p className="text-sm font-medium">{STATUS[s.status]}</p>
                <p className="my-2 text-xs text-muted-foreground">
                  {query.data.options.find((o) => o.id === s.source_shift_id)
                    ? label(
                        query.data.options.find(
                          (o) => o.id === s.source_shift_id,
                        )!,
                      )
                    : "Ursprünglicher Dienst"}{" "}
                  ↔{" "}
                  {query.data.options.find((o) => o.id === s.target_shift_id)
                    ? label(
                        query.data.options.find(
                          (o) => o.id === s.target_shift_id,
                        )!,
                      )
                    : "Tauschdienst"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {s.status === "requested" &&
                    s.recipient_id === query.data.employeeId && (
                      <Button
                        disabled={mutation.isPending}
                        onClick={() =>
                          mutation.mutate({ action: "accept", id: s.id })
                        }
                      >
                        Zustimmen
                      </Button>
                    )}
                  {s.status === "accepted" && manager && (
                    <Button
                      disabled={mutation.isPending}
                      onClick={() =>
                        mutation.mutate({ action: "approve", id: s.id })
                      }
                    >
                      Prüfen & freigeben
                    </Button>
                  )}
                  {["requested", "accepted"].includes(s.status) &&
                    (manager || s.recipient_id === query.data.employeeId) && (
                      <Button
                        variant="outline"
                        disabled={mutation.isPending}
                        onClick={() =>
                          mutation.mutate({ action: "reject", id: s.id })
                        }
                      >
                        Ablehnen
                      </Button>
                    )}
                  {["requested", "accepted"].includes(s.status) &&
                    s.requester_id === query.data.employeeId && (
                      <Button
                        variant="ghost"
                        disabled={mutation.isPending}
                        onClick={() =>
                          mutation.mutate({ action: "cancel", id: s.id })
                        }
                      >
                        Zurückziehen
                      </Button>
                    )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
