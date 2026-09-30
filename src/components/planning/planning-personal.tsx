"use client";
import { useQuery } from "@tanstack/react-query";
import type { PlanningPersonalData } from "@/types/planning-client";
import { planningFetch } from "@/services/planningClientService";
import { useSupabase } from "@/providers/supabase-provider";
import { formatDateFullDE, formatTimeLocal } from "@/config/client/date-utils";
import { PlanningPreferences } from "@/components/planning/planning-preferences";
import { PlanningSwaps } from "@/components/planning/planning-swaps";
import { Button } from "@/components/ui/button";
export function PlanningPersonal() {
  const { user } = useSupabase();
  const query = useQuery({
    queryKey: ["planning-mine", user?.id],
    queryFn: () => planningFetch<PlanningPersonalData | null>("/mine"),
    enabled: Boolean(user),
    refetchInterval: 30000,
  });
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#6658d3]">Dein Arbeitsalltag</p>
          <h1 className="text-3xl font-semibold">Meine Dienste</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Verbindliche Dienste und der angekündigte Ausblick.
          </p>
        </div>
        <Button
          className="print:hidden"
          variant="outline"
          onClick={() => window.print()}
        >
          Drucken
        </Button>
      </header>
      {query.isPending && <p role="status">Deine Dienste werden geladen …</p>}
      {query.error && <p role="alert">{query.error.message}</p>}
      {query.isSuccess &&
        (!query.data?.enabled || !query.data.periods.length) && (
          <p className="rounded-xl border bg-white p-5">
            Für dich ist noch kein Dienstplan veröffentlicht.
          </p>
        )}
      {query.data?.enabled &&
        query.data.periods.map((p) => (
          <section key={p.month} className="rounded-xl border bg-white p-5">
            <h2 className="mb-4 text-lg font-semibold">
              {formatDateFullDE(p.month)} ·{" "}
              {p.status === "fixed" ? "Verbindlich" : "Angekündigt"}
            </h2>
            {p.shifts.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[...p.shifts]
                  .sort((a, b) => a.start.localeCompare(b.start))
                  .map((s) => (
                    <div key={s.id} className="rounded-xl bg-[#f8f6ef] p-4">
                      <p className="font-semibold">
                        {formatDateFullDE(s.date)}
                      </p>
                      <p className="mt-2 text-xl">
                        {formatTimeLocal(s.start)}–{formatTimeLocal(s.end)}
                      </p>
                      <p className="mt-2 text-sm">
                        {
                          query.data?.locations.find(
                            (l) => l.id === s.locationId,
                          )?.name
                        }{" "}
                        ·{" "}
                        {
                          query.data?.skills.find((k) => k.id === s.skillId)
                            ?.name
                        }
                      </p>
                      {s.breaks.map((b, i) => (
                        <p
                          key={i}
                          className="mt-2 text-xs text-muted-foreground"
                        >
                          Pause {formatTimeLocal(b.start)}–
                          {formatTimeLocal(b.end)}
                        </p>
                      ))}
                      {s.substituteDate && (
                        <p className="mt-2 text-xs">
                          Ersatzruhetag: {formatDateFullDE(s.substituteDate)}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                In diesem Monat sind keine Dienste für dich eingetragen.
              </p>
            )}
          </section>
        ))}
      {query.data?.enabled && (
        <>
          <PlanningPreferences initial={query.data.preferredDays} />
          <PlanningSwaps />
        </>
      )}
    </div>
  );
}
