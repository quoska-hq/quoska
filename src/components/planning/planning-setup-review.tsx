import type { PlanningConfig } from "@/types/planning";
import { formatDateFullDE } from "@/config/client/date-utils";
import { planningProfileMissing } from "@/config/client/planning-setup";

export function PlanningSetupReview({ config }: { config: PlanningConfig }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [config.locations.length, "Filialen"],
          [
            config.profiles.filter(
              (profile) => planningProfileMissing(profile).length === 0,
            ).length,
            "Personen eingerichtet",
          ],
          [
            config.templates.filter((template) => template.active).length,
            "Aktive Schichten",
          ],
          [config.skills.length, "Aufgaben"],
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
          <li>
            „Einrichtung speichern“ wählen. Danach führt dich „Drei Monate
            anlegen“ zum ersten Entwurf.
          </li>
          <li>
            Mit „Optimieren“ einen Vorschlag berechnen, prüfen und übernehmen.
          </li>
          <li>
            Den aktuellen Monat verbindlich freigeben und die folgenden Monate
            ankündigen.
          </li>
        </ol>
      </div>
      <details className="rounded-xl border p-4 text-sm">
        <summary className="cursor-pointer font-medium">
          Was übernimmt Quoska, was bleibt zu prüfen?
        </summary>
        <p className="mt-3 text-muted-foreground">
          Eure erfassten Zeiten und Urlaubskonten werden durch die Planung nicht
          verändert. Vorgemerkte vertragliche Solländerungen gelten ab ihrem
          Stichtag auch für Zeiterfassung und neue Urlaubsanträge.
        </p>
        <p className="text-sm text-muted-foreground">
          Die Einrichtung bestätigt keine Tarifausnahmen oder besonderen
          Schutzvorschriften. Für Minderjährige, Mutterschutz und sonstige
          Sonderprofile bleibt die Freigabe gesperrt.
        </p>
      </details>
    </div>
  );
}
