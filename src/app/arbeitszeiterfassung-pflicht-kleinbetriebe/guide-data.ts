import { site } from "@/lib/site";

export const PAGE_PATH = "/arbeitszeiterfassung-pflicht-kleinbetriebe";
export const PUBLISHED_DATE = "2026-08-14";

export const SOURCES = {
  bmasFaq:
    "https://www.bmas.de/DE/Arbeit/Arbeitsrecht/Arbeitnehmerrechte/Regelungen-zur-Arbeitszeit/Fragen-und-Antworten/faq-arbeitszeiterfassung.html",
  bag: "https://www.bundesarbeitsgericht.de/entscheidung/1-abr-22-21/",
  eugh: "https://curia.europa.eu/juris/liste.jsf?num=C-55/18&language=de",
  arbeitsschutzgesetz:
    "https://www.gesetze-im-internet.de/arbschg/__3.html",
  arbeitszeitgesetz:
    "https://www.gesetze-im-internet.de/arbzg/BJNR117100994.html",
  arbzg16: "https://www.gesetze-im-internet.de/arbzg/__16.html",
  arbzg18: "https://www.gesetze-im-internet.de/arbzg/__18.html",
  arbzg22: "https://www.gesetze-im-internet.de/arbzg/__22.html",
  milog17: "https://www.gesetze-im-internet.de/milog/__17.html",
  schwarzarbg2a:
    "https://www.gesetze-im-internet.de/schwarzarbg_2004/__2a.html",
  bmasMinimumWage:
    "https://www.bmas.de/DE/Arbeit/Arbeitsrecht/Mindestlohn/Dokumentationspflicht/dokumentationspflicht-art.html",
} as const;

export const FAQ = [
  {
    q: "Gilt die Pflicht zur Arbeitszeiterfassung auch unter zehn Beschäftigten?",
    a: "Grundsätzlich ja. Für Kleinbetriebe gibt es keine pauschale Ausnahme allein wegen ihrer Größe. Entscheidend ist, ob Arbeitnehmerinnen oder Arbeitnehmer beschäftigt werden und ob im Einzelfall eine gesetzliche Ausnahme oder Sonderregelung greift.",
  },
  {
    q: "Muss die Arbeitszeit 2026 elektronisch erfasst werden?",
    a: "Derzeit besteht für die allgemeine Pflicht noch keine Formvorschrift. Nach Angaben des BMAS kann die Aufzeichnung auch handschriftlich erfolgen. Eine elektronische Aufzeichnungspflicht ist politisch angekündigt, aber nach dem aktuell veröffentlichten Arbeitszeitgesetz noch nicht allgemein in Kraft.",
  },
  {
    q: "Welche Angaben müssen erfasst werden?",
    a: "Nach der aktuellen Einordnung des BMAS sind Beginn, Ende und Dauer der täglichen Arbeitszeit aufzuzeichnen. Damit die Nettoarbeitszeit nachvollziehbar ist, muss der gewählte Ablauf auch Pausen zuverlässig berücksichtigen.",
  },
  {
    q: "Dürfen Beschäftigte ihre Arbeitszeit selbst eintragen?",
    a: "Ja. Nach Auffassung des BMAS kann der Arbeitgeber die Aufzeichnung an Beschäftigte delegieren. Die Verantwortung für die Organisation und Einhaltung der öffentlich-rechtlichen Vorgaben bleibt beim Arbeitgeber.",
  },
  {
    q: "Ist Vertrauensarbeitszeit weiterhin möglich?",
    a: "Ja. Beschäftigte können Beginn und Ende weiterhin flexibel festlegen, sofern das Arbeitsmodell dies erlaubt. Die tatsächlich geleistete Arbeitszeit muss trotzdem erfasst und der Arbeitszeitschutz eingehalten werden.",
  },
  {
    q: "Wie lange müssen Arbeitszeitnachweise aufbewahrt werden?",
    a: "Es gibt derzeit keine einheitliche pauschale Aufbewahrungsfrist für jede Aufzeichnung aus der allgemeinen Pflicht. Für die Nachweise über Arbeitszeit oberhalb von acht Stunden werktäglich nach § 16 Absatz 2 ArbZG und für besondere Aufzeichnungen nach § 17 MiLoG gelten mindestens zwei Jahre. Weitere Regeln können hinzukommen.",
  },
] as const;

export const CHECKLIST = [
  "Festlegen, für welche Beschäftigten und Tätigkeiten welche Regeln gelten",
  "Beginn, Ende und Dauer der täglichen Arbeitszeit nachvollziehbar erfassen",
  "Pausen so berücksichtigen, dass die Nettoarbeitszeit überprüfbar bleibt",
  "Zuständigkeit für Einträge, Korrekturen und regelmäßige Kontrollen benennen",
  "Beschäftigte über Ablauf, Zugriffe und den Umgang mit Fehlern informieren",
  "Anwendbare Aufbewahrungsfristen dokumentieren und technisch abbilden",
] as const;

export const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${site.url}${PAGE_PATH}#artikel`,
      headline: "Arbeitszeiterfassung für Kleinbetriebe: Was 2026 wirklich gilt",
      description:
        "Ein quellenbasierter Leitfaden zur Pflicht, Form, Aufbewahrung und praktischen Einführung der Arbeitszeiterfassung in kleinen Betrieben.",
      datePublished: PUBLISHED_DATE,
      dateModified: PUBLISHED_DATE,
      inLanguage: "de-DE",
      mainEntityOfPage: `${site.url}${PAGE_PATH}`,
      author: { "@id": `${site.url}/#organization` },
      publisher: { "@id": `${site.url}/#organization` },
      citation: Object.values(SOURCES),
    },
    {
      "@type": "FAQPage",
      "@id": `${site.url}${PAGE_PATH}#fragen`,
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ],
};
