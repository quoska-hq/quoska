import Link from "next/link";
import { CalendarDays, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PlanningModuleIntro() {
  return (
    <section className="rounded-2xl border border-[#dcd7cb] bg-white p-6 sm:p-8">
      <CalendarDays className="mb-5 size-8 text-[#6658d3]" />
      <h2 className="text-xl font-semibold">
        Dienstplanung als Modul aktivieren
      </h2>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        Verteile Dienste auf dein Team, berücksichtige Abwesenheiten und
        veröffentliche geprüfte Pläne. Aktiviere das Modul in den Einstellungen
        und richte es anschließend Schritt für Schritt ein.
      </p>
      <Button className="mt-6" render={<Link href="/app/settings#module" />}>
        Zu den Modulen <ArrowRight className="size-4" />
      </Button>
    </section>
  );
}
