export interface ComparisonCell {
  value: string;
  detail?: string;
}

export interface ComparisonRow {
  topic: string;
  quoska: ComparisonCell;
  competitor: ComparisonCell;
}

export interface ComparisonSource {
  label: string;
  url: string;
}

export interface AlternativeComparison {
  slug: string;
  competitor: string;
  title: string;
  description: string;
  intro: string;
  competitorPricing: string;
  quoskaFit: string;
  competitorFit: string;
  rows: ComparisonRow[];
  sources: ComparisonSource[];
}

export const COMPARISON_RESEARCH_DATE = "20. August 2026";
export const COMPARISON_RESEARCH_DATE_ISO = "2026-08-20";

export const ALTERNATIVE_COMPARISONS: readonly AlternativeComparison[] = [
  {
    slug: "clockodo",
    competitor: "Clockodo",
    title: "Clockodo-Alternative für kleine Teams: Quoska im Vergleich",
    description:
      "Clockodo und Quoska im Vergleich: Preise, Zeiterfassung, Projekte, Urlaub, mobile Nutzung und Open Source – transparent geprüft.",
    intro:
      "Clockodo ist eine etablierte Arbeits- und Projektzeiterfassung mit detailliertem Projektcontrolling. Quoska konzentriert sich auf eine schlanke Zeiterfassung für deutsche Betriebe, feste Team-Flatrates und eine offene Codebasis.",
    competitorPricing:
      "Clockodo rechnet pro Person ab. Die offizielle Preisseite nennt Basic mit 4 € pro Nutzer und Monat. Projektzeiterfassung liegt im Pro-Tarif; dort wurde beim Abruf ein Aktionspreis von 8 € für zwölf Monate und anschließend 10 € ausgewiesen. Preise sind Nettopreise.",
    quoskaFit:
      "Wenn ein kleines Team Arbeitszeit, Pausen, Abwesenheiten und einfache Projektzuordnung mit einer festen Monatsrate abbilden möchte – oder Open Source und Self-Hosting wichtig sind.",
    competitorFit:
      "Wenn detailliertes Projektcontrolling, Kunden und Leistungen, Stundensätze oder umfangreiche Schnittstellen wichtiger sind als eine möglichst kleine Lösung.",
    rows: [
      {
        topic: "Preismodell",
        quoska: {
          value: "Flatrate nach Teamgröße",
          detail: "0 € bis 3; Founder-Preise für die ersten 100 Buchungen: 9 € bis 10, 59 € bis 50 und 99 € ohne Limit; danach 19 €, 69 € und 129 €.",
        },
        competitor: {
          value: "Preis pro Nutzer",
          detail: "Basic ab 4 €; Projektfunktionen laut Preisseite in höheren Tarifen.",
        },
      },
      {
        topic: "Dauerhaft kostenlos",
        quoska: { value: "Bis 3 aktive Personen" },
        competitor: { value: "Für Solo-Selbstständige mit 1 Nutzer" },
      },
      {
        topic: "Arbeitszeit und Pausen",
        quoska: { value: "Enthalten", detail: "Stempeln, manuelle Einträge und nachvollziehbare Korrekturen." },
        competitor: { value: "Enthalten", detail: "Stoppuhr, manuelle Buchung, Pausen und Arbeitszeitregeln." },
      },
      {
        topic: "Urlaub und Abwesenheiten",
        quoska: { value: "Enthalten", detail: "Anträge, Freigaben, Krankheit und Kalender." },
        competitor: { value: "Enthalten", detail: "Urlaubskontingente, Genehmigung und Kalender." },
      },
      {
        topic: "Projektzeiterfassung",
        quoska: { value: "Schlank", detail: "Projektzuordnung, Projektanteile im Cockpit und CSV." },
        competitor: { value: "Ausgebaut", detail: "Kunden, Projekte, Leistungen, Budgets und Controlling je nach Tarif." },
      },
      {
        topic: "Mobile Nutzung",
        quoska: { value: "Mobiler Browser", detail: "Responsive Web-App und Browser-Erweiterung." },
        competitor: { value: "Apps, Browser und Terminal", detail: "Mehrere Erfassungswege werden offiziell angeboten." },
      },
      {
        topic: "Open Source / Self-Hosting",
        quoska: { value: "Ja", detail: "AGPL-3.0-Codebasis und dokumentierter Eigenbetrieb." },
        competitor: { value: "Nicht beworben", detail: "Auf den geprüften Produktseiten wird eine Cloud-Lösung angeboten." },
      },
    ],
    sources: [
      { label: "Clockodo: Preise und Tarifvergleich", url: "https://www.clockodo.com/de/preise/" },
      { label: "Clockodo: Funktionen der Zeiterfassung", url: "https://www.clockodo.com/de/funktionen/zeiterfassung/" },
    ],
  },
  {
    slug: "clockin",
    competitor: "clockin",
    title: "clockin-Alternative: Quoska für klare Zeiterfassung im Vergleich",
    description:
      "clockin und Quoska im Vergleich: Preise, Apps, Terminal, Projekte, Dokumentation, Abwesenheiten und Open Source.",
    intro:
      "clockin richtet sich besonders an mobile und operative Teams und verbindet Zeiterfassung mit Projekt- und Einsatzdokumentation. Quoska ist die kompaktere Alternative für Betriebe, die Kernprozesse, feste Flatrates und Transparenz im Code priorisieren.",
    competitorPricing:
      "clockin nennt bei monatlicher Laufzeit 3,99 € pro Nutzer für die Digitale Stechuhr, 6,99 € für Projektzeiterfassung und 9,99 € für Zeiterfassung & Dokumentation. Bei längeren Laufzeiten sinken die Nutzerpreise; laut Support kommt eine Plattformpauschale hinzu. Alle Preise zuzüglich Umsatzsteuer.",
    quoskaFit:
      "Wenn Zeiterfassung, Pausen, Urlaub, Korrekturfreigaben, einfache Projekte und Berichte ohne Dokumentationssuite genügen und die Kosten als Team-Flatrate planbar sein sollen.",
    competitorFit:
      "Wenn native Smartphone-Apps, ein Tablet-Terminal, Projektakten, Fotos, Formulare, Unterschriften oder Integrationen für Außendienst und Handwerk entscheidend sind.",
    rows: [
      {
        topic: "Preismodell",
        quoska: {
          value: "Flatrate nach Teamgröße",
          detail: "Alle Kernfunktionen in jeder Stufe; ab 0 € bis 3 Personen.",
        },
        competitor: {
          value: "Pro Nutzer plus Plattform",
          detail: "Nutzerpreis hängt von Paket und Laufzeit ab; Plattformpauschale separat beachten.",
        },
      },
      {
        topic: "Kostenloser Einstieg",
        quoska: { value: "Dauerhaft bis 3 Personen", detail: "Keine Kreditkarte erforderlich." },
        competitor: { value: "14 Tage Testphase", detail: "Laut Preisseite ohne automatisches Abo." },
      },
      {
        topic: "Arbeitszeit und Abwesenheiten",
        quoska: { value: "Enthalten", detail: "Pausen, Korrekturen, Urlaub, Krankheit und Arbeitszeitkonten." },
        competitor: { value: "Enthalten", detail: "Stechuhr-Paket mit Kalender und Abwesenheitsverwaltung." },
      },
      {
        topic: "Mobile und stationäre Erfassung",
        quoska: { value: "Web-App", detail: "Browser auf Smartphone und PC plus Browser-Erweiterung." },
        competitor: { value: "Native App, Browser und Terminal", detail: "Für Smartphone, Homeoffice und gemeinsames Tablet." },
      },
      {
        topic: "Projekte",
        quoska: { value: "Projektzuordnung", detail: "Zeiten Projekten zuordnen und im Cockpit auswerten." },
        competitor: { value: "Projekte und Unterprojekte", detail: "Mit Kundenverwaltung und Lexware-Office-Schnittstelle im Projektpaket." },
      },
      {
        topic: "Einsatzdokumentation",
        quoska: { value: "Nicht der Schwerpunkt", detail: "Keine Foto-, Formular- oder Unterschriften-Workflows beworben." },
        competitor: { value: "Eigenes Paket", detail: "Projektakten, Fotos, Checklisten, Formulare und digitale Unterschriften." },
      },
      {
        topic: "Open Source / Self-Hosting",
        quoska: { value: "Ja", detail: "Öffentliches AGPL-3.0-Repository und Self-Hosting." },
        competitor: { value: "Nicht beworben", detail: "Die geprüften Seiten beschreiben die gehostete clockin-Plattform." },
      },
    ],
    sources: [
      { label: "clockin: Preise und Pakete", url: "https://www.clockin.de/preise" },
      { label: "clockin: Funktionen der Zeiterfassung", url: "https://www.clockin.de/funktionen-von-clockin/funktion-zeiterfassung" },
      { label: "clockin Support: Plattformpauschale", url: "https://support.clockin.de/die-plattformpauschale-bei-clockin" },
    ],
  },
  {
    slug: "crewmeister",
    competitor: "Crewmeister",
    title: "Crewmeister-Alternative: Quoska im ehrlichen Vergleich",
    description:
      "Crewmeister und Quoska vergleichen: Zeiterfassung, Preise, Schichtplanung, GPS, Apps, Urlaub, Projekte und Open Source.",
    intro:
      "Crewmeister kombiniert Zeiterfassung mit Schichtplanung, Abwesenheiten und Funktionen für operative Teams. Quoska ist bewusst schmaler und eignet sich für Betriebe, die keine Personaleinsatzplanung benötigen und eine einfache Flatrate bevorzugen.",
    competitorPricing:
      "Crewmeister beschreibt seine Preise als abhängig von Mitarbeiterzahl und gebuchten Funktionen. Ein fester Betrag wird auf der allgemeinen Preisseite nicht für jedes Szenario ausgewiesen; angeboten wird eine 14-tägige Testphase. Für einen belastbaren Vergleich ist deshalb ein Angebot oder der Preisrechner erforderlich.",
    quoskaFit:
      "Wenn ein Betrieb verlässliche Arbeitszeit, Pausen, Korrekturen, Abwesenheiten und einfache Projekte braucht, aber keine Schicht- oder GPS-Funktionen einkaufen möchte.",
    competitorFit:
      "Wenn Schichtplanung, Offline-Erfassung, GPS, PIN-Terminal, DATEV oder eine native Mitarbeiter-App zu den Pflichtanforderungen gehören.",
    rows: [
      {
        topic: "Preismodell",
        quoska: { value: "Öffentliche Team-Flatrates", detail: "0 €; Founder-Preise 9 €, 59 € und 99 € für die ersten 100 Buchungen; danach 19 €, 69 € und 129 €." },
        competitor: { value: "Abhängig von Team und Modulen", detail: "Exakter Preis wird für die konkrete Zusammenstellung ermittelt." },
      },
      {
        topic: "Kostenloser Einstieg",
        quoska: { value: "Dauerhaft bis 3 Personen" },
        competitor: { value: "14 Tage Testphase", detail: "Ohne automatische Verlängerung laut Anbieter-FAQ." },
      },
      {
        topic: "Arbeitszeit und Zeitkonto",
        quoska: { value: "Enthalten", detail: "Stempeln, Pausen, Korrekturverlauf und Überstundenübersicht." },
        competitor: { value: "Enthalten", detail: "Flexible Erfassung, Überstunden, Pausenabzug und manuelle Korrektur je nach Paket." },
      },
      {
        topic: "Urlaub und Krankheit",
        quoska: { value: "Enthalten", detail: "Anträge, Genehmigungen und Abwesenheitskalender." },
        competitor: { value: "Enthalten / modular", detail: "Urlaub, Krankheit und Freizeitausgleich werden angeboten." },
      },
      {
        topic: "Schichtplanung",
        quoska: { value: "Nein", detail: "Arbeitsmodelle bilden Sollzeiten ab, aber keine Einsatzpläne." },
        competitor: { value: "Ja", detail: "Schichtvorlagen, Einsatzplanung und Benachrichtigungen." },
      },
      {
        topic: "Erfassung unterwegs",
        quoska: { value: "Mobiler Browser", detail: "Responsive Web-App ohne GPS-Ortung." },
        competitor: { value: "App, Offline, Terminal und GPS", detail: "Die Optionen sind je nach Paket verfügbar." },
      },
      {
        topic: "Open Source / Self-Hosting",
        quoska: { value: "Ja", detail: "AGPL-3.0 und dokumentierte eigene Bereitstellung." },
        competitor: { value: "Nicht beworben", detail: "Die geprüften Seiten stellen Crewmeister als Cloud-Produkt dar." },
      },
    ],
    sources: [
      { label: "Crewmeister: Preise", url: "https://crewmeister.com/de/preise" },
      { label: "Crewmeister: Funktionsübersicht", url: "https://crewmeister.com/de/funktionsuebersicht" },
      { label: "Crewmeister: Schichtplaner", url: "https://crewmeister.com/de/schichtplaner" },
    ],
  },
] as const;

export function getAlternativeComparison(slug: string) {
  return ALTERNATIVE_COMPARISONS.find((comparison) => comparison.slug === slug);
}
