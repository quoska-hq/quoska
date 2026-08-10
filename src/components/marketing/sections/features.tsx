const FEATURES = [
  {
    number: "01",
    title: "Stempeln, Pause, Feierabend",
    body: "Die tägliche Erfassung bleibt auf das Wesentliche reduziert. Zeitstempel kommen vom Server, nicht von der Uhr des Endgeräts.",
  },
  {
    number: "02",
    title: "Pausen im Blick",
    body: "Quoska zeigt fehlende Pausen und auffällige Arbeitszeiten dort, wo sie entstehen — nicht erst am Monatsende.",
  },
  {
    number: "03",
    title: "Korrekturen mit Verlauf",
    body: "Mitarbeitende stellen einen Antrag, Verantwortliche prüfen ihn. Änderungen bleiben mit Begründung nachvollziehbar.",
  },
  {
    number: "04",
    title: "Ein Team, klare Rollen",
    body: "Mitarbeitende sehen ihre eigenen Zeiten. Verantwortliche verwalten Team, Arbeitsmodelle und Freigaben.",
  },
  {
    number: "05",
    title: "Monate statt Zettelstapel",
    body: "Arbeitszeiten, Pausen und Abweichungen lassen sich pro Person und Zeitraum prüfen und als CSV weitergeben.",
  },
  {
    number: "06",
    title: "Urlaub und Krankheit",
    body: "Abwesenheiten laufen im selben System wie die Zeiterfassung. So bleibt der Monatsüberblick vollständig.",
  },
] as const;

export function FeaturesSection() {
  return (
    <section id="features" className="bg-white">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6658d3]">
              Das Produkt
            </p>
            <h2 className="mt-4 max-w-md font-serif text-4xl leading-tight tracking-[-0.035em] text-slate-950 sm:text-5xl">
              Weniger Verwaltung. Mehr Klarheit im Alltag.
            </h2>
            <p className="mt-5 max-w-md leading-7 text-slate-600">
              Quoska bildet den normalen Arbeitstag ab — ohne Schulungsprojekt
              und ohne Funktionen, die niemand findet.
            </p>
          </div>

          <div className="border-t border-slate-900/15">
            {FEATURES.map((feature) => (
              <article
                key={feature.number}
                className="grid gap-3 border-b border-slate-900/15 py-6 sm:grid-cols-[3rem_0.7fr_1.3fr] sm:gap-6 sm:py-8"
              >
                <span className="font-mono text-xs text-[#6658d3]">
                  {feature.number}
                </span>
                <h3 className="text-base font-semibold text-slate-950">
                  {feature.title}
                </h3>
                <p className="text-sm leading-6 text-slate-600">{feature.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
