import type { PlanningConfig } from "@/types/planning";
import { formatDateFullDE } from "@/config/client/date-utils";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PlanningFirstPlan({
  config,
  busy,
  onStart,
}: {
  config: PlanningConfig;
  busy: boolean;
  onStart: () => void;
}) {
  return (
    <section className="rounded-2xl border border-[#dcd7cb] bg-white p-6">
      <p className="text-sm font-medium text-[#6658d3]">
        Einrichtung abgeschlossen
      </p>
      <h2 className="mt-2 text-xl font-semibold">
        Jetzt euren ersten Plan anlegen
      </h2>
      <p className="mt-3 text-sm text-muted-foreground">
        Wir legen drei Monate ab{" "}
        {config.firstMonth ? formatDateFullDE(config.firstMonth) : "—"} mit
        euren Schichten an. Die Dienste sind zunächst Entwürfe und für
        Mitarbeitende noch nicht sichtbar.
      </p>
      <Button className="mt-5" disabled={busy} onClick={onStart}>
        <CalendarDays className="size-4" />
        Drei Monate anlegen
      </Button>
      <p className="mt-4 text-sm text-muted-foreground">
        Danach: „Optimieren“ wählen, den Vorschlag prüfen und übernehmen. Erst
        mit „Ankündigen“ oder „Verbindlich machen“ sieht euer Team den Plan.
      </p>
    </section>
  );
}
