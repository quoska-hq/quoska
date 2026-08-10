const STEPS = [
  {
    number: "01",
    title: "Betrieb anlegen",
    body: "Account erstellen, Firmendaten ergänzen und Arbeitszeitmodell festlegen.",
  },
  {
    number: "02",
    title: "Team einladen",
    body: "Mitarbeitende per E-Mail hinzufügen und die passenden Rollen vergeben.",
  },
  {
    number: "03",
    title: "Einfach anfangen",
    body: "Im Browser einstempeln. Zeiten, Pausen und Korrekturen landen direkt in der Übersicht.",
  },
] as const;

export function HowItWorksSection() {
  return (
    <section id="ablauf" className="border-y border-slate-900/10 bg-[#dcd8cf]">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6658d3]">
              Der Einstieg
            </p>
            <h2 className="mt-4 font-serif text-4xl leading-tight tracking-[-0.035em] text-slate-950 sm:text-5xl">
              Heute eingerichtet. Morgen selbstverständlich.
            </h2>
          </div>

          <ol className="border-t border-slate-900/20">
            {STEPS.map((step) => (
              <li
                key={step.number}
                className="grid gap-2 border-b border-slate-900/20 py-6 sm:grid-cols-[3rem_0.8fr_1.2fr] sm:gap-6 sm:py-8"
              >
                <span className="font-mono text-xs text-[#6658d3]">
                  {step.number}
                </span>
                <h3 className="font-semibold text-slate-950">{step.title}</h3>
                <p className="text-sm leading-6 text-slate-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
