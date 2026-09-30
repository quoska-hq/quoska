import type { PlanningBoardData } from "@/types/planning-client";
import type { PlanningPeriod } from "@/types/planning";
import type { PlanningCommand } from "@/types/planning-schemas";
import { CalendarDays, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
export function PlanningBoardToolbar({
  data,
  period,
  month,
  busy,
  onAction,
}: {
  data: PlanningBoardData;
  period?: PlanningPeriod;
  month: string;
  busy: boolean;
  onAction: (command: PlanningCommand) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      {!period ? (
        <Button
          disabled={busy}
          onClick={() =>
            onAction({ action: "generate", version: data.version, month })
          }
        >
          <CalendarDays className="size-4" />
          Monat anlegen
        </Button>
      ) : (
        <>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              onAction({ action: "refresh", version: data.version, month })
            }
          >
            Schichten aktualisieren
          </Button>
          <Button
            variant="outline"
            disabled={busy || !data.workerConfigured}
            onClick={() =>
              onAction({ action: "optimize", version: data.version, month })
            }
          >
            <Sparkles className="size-4" />
            Optimieren
          </Button>
          <Button
            disabled={busy}
            onClick={() =>
              onAction({
                action: "publish",
                version: data.version,
                month,
                status: period.status === "fixed" ? "fixed" : "announced",
              })
            }
          >
            {period.status === "fixed" ? "Änderungen freigeben" : "Ankündigen"}
          </Button>
          {period.status !== "fixed" && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                onAction({
                  action: "publish",
                  version: data.version,
                  month,
                  status: "fixed",
                })
              }
            >
              Verbindlich machen
            </Button>
          )}
        </>
      )}
      <Button
        variant="outline"
        disabled={busy}
        onClick={() =>
          onAction({ action: "initialize", version: data.version })
        }
      >
        Drei Monate anlegen
      </Button>
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => onAction({ action: "roll", version: data.version })}
      >
        Monatswechsel
      </Button>
    </div>
  );
}
