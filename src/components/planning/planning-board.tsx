"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings2, Printer, ChevronLeft, ChevronRight } from "lucide-react";
import type { PlanningBoardData } from "@/types/planning-client";
import type { PlanningShift } from "@/types/planning";
import type { PlanningCommand } from "@/types/planning-schemas";
import { planningFetch } from "@/services/planningClientService";
import {
  planningFirstMonth,
  planningDay,
  planningAddDays,
  planningAddMonths,
} from "@/config/client/planning-calendar";
import { formatDateFullDE } from "@/config/client/date-utils";
import { PLANNING_STATUS_LABELS } from "@/config/planning";
import { Button } from "@/components/ui/button";
import { PlanningWeek } from "@/components/planning/planning-week";
import { PlanningJobs } from "@/components/planning/planning-jobs";
import { PlanningRulePanel } from "@/components/planning/planning-rule-panel";
import { PlanningBoardToolbar } from "@/components/planning/planning-board-toolbar";
import { PlanningSetup } from "@/components/planning/planning-setup";
import { PlanningEditShift } from "@/components/planning/planning-edit-shift";
import { PlanningSwaps } from "@/components/planning/planning-swaps";
import { PlanningBalances } from "@/components/planning/planning-balances";
import { useSupabase } from "@/providers/supabase-provider";

export function PlanningBoard() {
  const { user } = useSupabase(),
    cache = useQueryClient();
  const query = useQuery({
    queryKey: ["planning", user?.id],
    queryFn: () => planningFetch<PlanningBoardData>(),
    enabled: Boolean(user),
    refetchInterval: 15000,
  });
  const [settings, setSettings] = useState(false),
    [month, setMonth] = useState(""),
    [week, setWeek] = useState(0),
    [locationId, setLocation] = useState("");
  const [editing, setEditing] = useState<PlanningShift | null>(null),
    [feedback, setFeedback] = useState("");
  const mutation = useMutation({
    mutationFn: (command: PlanningCommand) => planningFetch("", command),
    onSuccess: (_result, command) => {
      if (command.action === "configure") setSettings(false);
      setFeedback("Gespeichert.");
      setEditing(null);
      void cache.invalidateQueries({ queryKey: ["planning"] });
    },
    onError: (error) => setFeedback(error.message),
  });
  if (query.isPending) return <p role="status">Dienstplanung wird geladen …</p>;
  if (query.error)
    return (
      <div role="alert">
        <p>{query.error.message}</p>
        <Button onClick={() => void query.refetch()}>Erneut laden</Button>
      </div>
    );
  const data = query.data;
  if (!data) return null;
  const activeMonth =
    month ||
    planningFirstMonth(data.context.today, data.state.config.firstMonth);
  const period = data.state.periods.find((p) => p.month === activeMonth);
  const from = planningAddDays(
    activeMonth,
    -((planningDay(activeMonth) + 6) % 7) + week * 7,
  );
  const dates = Array.from({ length: 7 }, (_, i) => planningAddDays(from, i));
  const periods = Array.from({ length: 3 }, (_, i) =>
    planningAddMonths(
      planningFirstMonth(data.context.today, data.state.config.firstMonth),
      i,
    ),
  );
  const issues = data.issues.filter(
    (i) => !i.date || i.date.slice(0, 7) === activeMonth.slice(0, 7),
  );
  const send = (command: Omit<PlanningCommand, "version">) =>
    mutation.mutate({ ...command, version: data.version } as PlanningCommand);
  return (
    <div className="space-y-6 print:space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[#6658d3]">Personal & Filialen</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Dienstplanung
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ein verbindlicher Monat. Zwei Monate Ausblick. Ein gemeinsamer Plan.
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" onClick={() => setSettings(!settings)}>
            <Settings2 className="size-4" />
            Einrichtung
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" />
            Drucken
          </Button>
        </div>
      </header>
      {feedback && (
        <p role="status" className="rounded-xl border bg-white p-3 text-sm">
          {feedback}
        </p>
      )}
      {settings || !data.state.config.enabled ? (
        <PlanningSetup
          data={data}
          busy={mutation.isPending}
          onSave={(config, version) =>
            mutation.mutate({ action: "configure", config, version })
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-3 print:hidden">
            {periods.map((m) => (
              <Button
                key={m}
                variant={m === activeMonth ? "default" : "outline"}
                onClick={() => {
                  setMonth(m);
                  setWeek(0);
                }}
              >
                {formatDateFullDE(m)}
              </Button>
            ))}
            <select
              aria-label="Filiale filtern"
              className="rounded-md border bg-white p-2 text-sm"
              value={locationId}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="">Alle Filialen</option>
              {data.state.config.locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <section className="rounded-2xl border border-[#dcd7cb] bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {formatDateFullDE(activeMonth)} ·{" "}
                  {period
                    ? PLANNING_STATUS_LABELS[period.status]
                    : "Noch nicht angelegt"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {period
                    ? `Fassung ${period.revision} · ${period.shifts.length} Schichten`
                    : "Aus euren Schichtvorlagen anlegen"}
                </p>
              </div>
              <PlanningBoardToolbar
                data={data}
                period={period}
                month={activeMonth}
                busy={mutation.isPending}
                onAction={(command) => mutation.mutate(command)}
              />
            </div>
            {!data.workerConfigured && (
              <p className="mb-4 text-sm text-amber-800 print:hidden">
                Die automatische Berechnung wird verfügbar, sobald der
                Rechenworker eingerichtet ist.
              </p>
            )}
            <div className="mb-4 flex items-center gap-3 print:hidden">
              <Button
                size="icon"
                variant="outline"
                aria-label="Vorige Woche"
                disabled={week === 0}
                onClick={() => setWeek(week - 1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-sm">Woche ab {formatDateFullDE(from)}</span>
              <Button
                size="icon"
                variant="outline"
                aria-label="Nächste Woche"
                disabled={
                  planningAddDays(from, 7) >= planningAddMonths(activeMonth, 1)
                }
                onClick={() => setWeek(week + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <PlanningWeek
              data={data}
              period={period}
              dates={dates}
              locationId={locationId}
              onShift={setEditing}
            />
          </section>
          <PlanningJobs
            data={data}
            month={activeMonth}
            busy={mutation.isPending}
            onApply={(jobId) =>
              mutation.mutate({ action: "apply", version: data.version, jobId })
            }
          />
          <PlanningBalances data={data} month={activeMonth} />
          <PlanningRulePanel data={data} issues={issues} />
          <PlanningSwaps manager />
        </>
      )}
      {editing && (
        <PlanningEditShift
          shift={editing}
          data={data}
          busy={mutation.isPending}
          onClose={() => setEditing(null)}
          onSave={(shift, reason) =>
            send({ action: "assign", shift, reason } as Omit<
              PlanningCommand,
              "version"
            >)
          }
        />
      )}
    </div>
  );
}
