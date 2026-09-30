import type { PlanningBoardData } from "@/types/planning-client";
import { planningBalanceForecast } from "@/services/planningBalanceService";
import { formatDuration, formatOvertime } from "@/services/overtimeService";
export function PlanningBalances({
  data,
  month,
}: {
  data: PlanningBoardData;
  month: string;
}) {
  return (
    <section className="overflow-x-auto rounded-xl border bg-white p-4">
      <h2 className="mb-3 font-semibold">Soll, Plan & Zeitkonto</h2>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="p-2">Person</th>
            <th className="p-2">Soll</th>
            <th className="p-2">Geplant</th>
            <th className="p-2">Erfasst</th>
            <th className="p-2">Zeitkonto aktuell</th>
            <th className="p-2">Prognose Monatsende</th>
          </tr>
        </thead>
        <tbody>
          {data.context.employees
            .filter((e) =>
              data.state.config.profiles.some((p) => p.employeeId === e.id),
            )
            .map((e) => {
              const b = planningBalanceForecast(
                data.state,
                data.context,
                e,
                month,
              );
              return (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="p-2 font-medium">{e.name}</td>
                  <td className="p-2">{formatDuration(b.targetMinutes)}</td>
                  <td className="p-2">{formatDuration(b.plannedMinutes)}</td>
                  <td className="p-2">{formatDuration(b.actualMinutes)}</td>
                  <td className="p-2">
                    {e.balanceComplete
                      ? formatOvertime(e.balanceMinutes)
                      : "Historische Feiertagsdaten fehlen"}
                  </td>
                  <td className="p-2">
                    {e.balanceComplete
                      ? formatOvertime(b.forecastMinutes)
                      : "Nicht berechenbar"}
                    {b.provisional && (
                      <span className="block text-xs text-amber-900">
                        Vorläufig
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-muted-foreground">
        Die Prognose verwendet geplante künftige Dienste und das vorhandene
        Sollmodell. Laufende Buchungen und offene Krankmeldungen machen sie
        vorläufig. Dienste ändern keine erfassten Zeiten oder bestehenden
        Zeitkonten.
      </p>
    </section>
  );
}
