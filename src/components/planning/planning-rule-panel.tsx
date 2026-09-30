import type { PlanningBoardData } from "@/types/planning-client";
import type { PlanningIssue } from "@/types/planning";
import { formatDateFullDE } from "@/config/client/date-utils";
export function PlanningRulePanel({
  data,
  issues,
}: {
  data: PlanningBoardData;
  issues: PlanningIssue[];
}) {
  return (
    <section className="rounded-xl border bg-white p-4">
      <h2 className="font-semibold">Regelprüfung · Deutschland</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Standardprofil für Volljährige: acht Stunden täglich, elf Stunden
        Ruhezeit. Sonderprofile, Tarifabweichungen und Verlängerungen benötigen
        eine gesonderte Prüfung.
      </p>
      {issues.length ? (
        <ul className="mt-3 space-y-2 text-sm">
          {issues.slice(0, 20).map((i, n) => (
            <li key={n} className="text-amber-900">
              {i.date ? formatDateFullDE(i.date) + ": " : ""}
              {i.employeeId
                ? (data.context.employees.find((e) => e.id === i.employeeId)
                    ?.name ?? "Person") + " · "
                : ""}
              {i.message}
            </li>
          ))}
          {issues.length > 20 && (
            <li>Weitere {issues.length - 20} Prüfhinweise</li>
          )}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-emerald-800">
          Die unterstützten Regeln melden keine Konflikte.
        </p>
      )}
    </section>
  );
}
