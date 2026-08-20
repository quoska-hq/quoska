export const FAQ = [
  {
    q: "Was brauche ich für den Start?",
    a: "Einen Account und einen Browser. Du legst den Betrieb an, lädst das Team ein und kannst direkt mit der Erfassung beginnen. Eine Kreditkarte ist für den kostenlosen Tarif nicht nötig.",
  },
  {
    q: "Was kostet Quoska?",
    a: "Bis zu 3 Mitarbeitende sind kostenlos. Für die ersten 100 Buchungen kosten Team 9 €, Business 59 € und Pro 99 € im Monat. Danach gelten 19 €, 69 € und 129 €. Gemäß § 19 UStG wird derzeit keine Umsatzsteuer ausgewiesen.",
  },
  {
    q: "Können Mitarbeitende ihre eigenen Zeiten sehen?",
    a: "Ja. Mitarbeitende sehen ihre persönlichen Arbeitszeiten, Pausen und Abwesenheiten in einer eigenen Ansicht. Andere Teamdaten bleiben entsprechend der Rolle geschützt.",
  },
  {
    q: "Wie funktionieren Korrekturen?",
    a: "Mitarbeitende stellen einen Korrekturantrag mit Begründung. Verantwortliche können ihn prüfen und freigeben oder ablehnen. Der Änderungsverlauf bleibt nachvollziehbar.",
  },
  {
    q: "Unterstützt Quoska die Vorgaben zur Arbeitszeit?",
    a: "Quoska dokumentiert Arbeitszeiten, verwendet serverseitige Zeitstempel und macht auf fehlende Pausen oder auffällige Arbeitszeiten aufmerksam. Die konkrete betriebliche und rechtliche Umsetzung bleibt in der Verantwortung des Arbeitgebers.",
  },
  {
    q: "Funktioniert Quoska auf dem Handy?",
    a: "Ja. Die Oberfläche ist für mobile Browser ausgelegt. Mitarbeitende können dort stempeln, Pausen erfassen und ihre Zeiten einsehen — ohne separate App aus einem Store.",
  },
] as const;

export function FaqSection() {
  return (
    <section id="faq" className="border-t border-slate-900/10 bg-[#f5f3ee]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20 lg:py-28">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5145ad]">
            Fragen und Antworten
          </p>
          <h2 className="mt-4 font-serif text-4xl leading-tight tracking-[-0.035em] text-slate-950 sm:text-5xl">
            Was vor dem Start wichtig ist.
          </h2>
          <p className="mt-5 max-w-sm leading-7 text-slate-600">
            Konkrete Antworten zu Einrichtung, Preisen und täglicher Nutzung.
          </p>
        </div>

        <div className="border-t border-slate-900/20">
          {FAQ.map((item) => (
            <details key={item.q} className="group border-b border-slate-900/20">
              <summary className="flex list-none items-center justify-between gap-6 py-5 text-left sm:py-6">
                <span className="font-semibold text-slate-950">{item.q}</span>
                <span
                  aria-hidden
                  className="text-xl font-light text-[#5145ad] transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="max-w-2xl pb-6 pr-10 text-sm leading-7 text-slate-600">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
