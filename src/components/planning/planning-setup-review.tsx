import type { PlanningConfig } from "@/types/planning";
import { formatDateFullDE } from "@/config/client/date-utils";

export function PlanningSetupReview({ config }: { config: PlanningConfig }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [config.locations.length, "Filialen"],
          [config.profiles.length, "Mitarbeitendenprofile"],
          [config.templates.length, "Schichtvorlagen"],
          [config.demands.length, "Besetzungsregeln"],
        ].map(([count, label]) => (
          <div key={label} className="rounded-xl bg-[#f8f6ef] p-4">
            <p className="text-2xl font-semibold">{count}</p>
            <p className="mt-1 text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border p-5">
        <h3 className="font-semibold">Dein erster Plan</h3>
        <p className="mt-2 text-sm">
          Start ab{" "}
          {config.firstMonth ? formatDateFullDE(config.firstMonth) : "—"}. Ein
          verbindlicher Monat und zwei Monate angekündigter Ausblick.
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Einrichtung speichern und drei Monate anlegen.</li>
          <li>Einen Vorschlag berechnen lassen und die Besetzung prüfen.</li>
          <li>
            Den aktuellen Monat verbindlich freigeben und die folgenden Monate
            ankündigen.
          </li>
        </ol>
      </div>
      <p className="text-sm text-muted-foreground">
        Eure erfassten Zeiten und Urlaubskonten werden durch die Planung nicht
        verändert. Vorgemerkte vertragliche Solländerungen gelten ab ihrem
        Stichtag auch für Zeiterfassung und neue Urlaubsanträge.
      </p>
      <p className="text-sm text-muted-foreground">
        Die Einrichtung bestätigt keine Tarifausnahmen oder besonderen
        Schutzvorschriften. Für Minderjährige, Mutterschutz und sonstige
        Sonderprofile bleibt die Freigabe gesperrt.
      </p>
    </div>
  );
}
