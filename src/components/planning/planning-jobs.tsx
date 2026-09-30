"use client";
import type { PlanningBoardData } from "@/types/planning-client";
import { Button } from "@/components/ui/button";
import { formatDateFullDE, formatTimeLocal } from "@/config/client/date-utils";
export function PlanningJobs({
  data,
  month,
  busy,
  onApply,
}: {
  data: PlanningBoardData;
  month: string;
  busy: boolean;
  onApply: (jobId: string) => void;
}) {
  const shifts = data.state.periods.flatMap((p) => p.shifts);
  return (
    <div className="space-y-3 print:hidden">
      {data.jobs
        .filter((j) => j.month === month)
        .map((j) => (
          <div key={j.id} className="rounded-xl border bg-white p-4">
            <p className="text-sm font-medium">
              Rechenlauf:{" "}
              {j.status === "queued"
                ? "In der Warteschlange"
                : j.status === "running"
                  ? "Wird berechnet …"
                  : j.result?.status === "optimal"
                    ? "Optimaler Vorschlag gefunden"
                    : j.result?.status === "feasible"
                      ? "Vorschlag gefunden"
                      : j.result?.status === "infeasible"
                        ? "Keine vollständige Besetzung möglich"
                        : j.result?.status === "timeout"
                          ? "Zeitlimit erreicht; keine Lösung gefunden"
                          : j.status === "applied"
                            ? "Übernommen"
                            : "Abgeschlossen"}
            </p>
            {j.result?.message && (
              <p className="mt-2 text-sm">{j.result.message}</p>
            )}
            {j.status === "completed" &&
              ["optimal", "feasible"].includes(j.result?.status ?? "") && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-[#6658d3]">
                    Vorschlag ansehen · {j.result?.assignments.length}{" "}
                    Besetzungen
                  </summary>
                  <p className="my-2 text-xs text-muted-foreground">
                    Die Übernahme prüft den Vorschlag erneut mit den aktuellen
                    Daten. Die Veröffentlichung erfolgt anschließend separat.
                  </p>
                  <div className="max-h-80 space-y-2 overflow-auto">
                    {j.result?.assignments.map((a) => {
                      const s = shifts.find((s) => s.id === a.shiftId);
                      if (!s || s.employeeId === a.employeeId) return null;
                      return (
                        <p key={a.shiftId} className="border-b py-2 text-xs">
                          {formatDateFullDE(s.date)} {formatTimeLocal(s.start)}–
                          {formatTimeLocal(s.end)} ·{" "}
                          {
                            data.state.config.locations.find(
                              (l) => l.id === s.locationId,
                            )?.name
                          }
                          <br />
                          {data.context.employees.find(
                            (e) => e.id === s.employeeId,
                          )?.name ?? "Offen"}{" "}
                          →{" "}
                          <strong>
                            {
                              data.context.employees.find(
                                (e) => e.id === a.employeeId,
                              )?.name
                            }
                          </strong>
                        </p>
                      );
                    })}
                  </div>
                  {Number(j.input_version) !== data.version && (
                    <p className="my-2 text-sm text-amber-900">
                      Die Eingangsdaten haben sich geändert. Bitte neu
                      berechnen.
                    </p>
                  )}
                  <Button
                    className="mt-3"
                    disabled={busy || Number(j.input_version) !== data.version}
                    onClick={() => onApply(j.id)}
                  >
                    Vorschlag prüfen & übernehmen
                  </Button>
                </details>
              )}
          </div>
        ))}
    </div>
  );
}
