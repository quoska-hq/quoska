import type { Metadata } from "next";
import Link from "next/link";
import { WorkTimeGuide, GuideTable } from "@/components/marketing/work-time-guide";

const TITLE = "Arbeitszeitkonto: Plus- und Minusstunden richtig einordnen";
const DESCRIPTION = "Arbeitszeitkonto im kleinen Betrieb: Soll- und Istzeit, Übertrag und Saldo mit Rechenbeispiel. Dazu Minusstunden, Abwesenheiten und Besonderheiten bei Minijobs.";
const SOURCES = [
  {
    "id": "bmas",
    "title": "BMAS: Fragen und Antworten zur Arbeitszeiterfassung",
    "url": "https://www.bmas.de/DE/Arbeit/Arbeitsrecht/Arbeitnehmerrechte/Regelungen-zur-Arbeitszeit/Fragen-und-Antworten/faq-arbeitszeiterfassung.html"
  },
  {
    "id": "bgb615",
    "title": "§ 615 BGB: Annahmeverzug und Betriebsrisiko",
    "url": "https://www.gesetze-im-internet.de/bgb/__615.html"
  },
  {
    "id": "burlg1",
    "title": "§ 1 BUrlG: Bezahlter Erholungsurlaub",
    "url": "https://www.gesetze-im-internet.de/burlg/__1.html"
  },
  {
    "id": "entgfg3",
    "title": "§ 3 EntgFG: Entgeltfortzahlung bei Krankheit",
    "url": "https://www.gesetze-im-internet.de/entgfg/__3.html"
  },
  {
    "id": "entgfg2",
    "title": "§ 2 EntgFG: Entgeltzahlung an Feiertagen",
    "url": "https://www.gesetze-im-internet.de/entgfg/__2.html"
  },
  {
    "id": "milog2",
    "title": "§ 2 MiLoG: Fälligkeit und Arbeitszeitkonten",
    "url": "https://www.gesetze-im-internet.de/milog/__2.html"
  },
  {
    "id": "minijob",
    "title": "Minijob-Zentrale: Arbeitszeitkonten für Minijobs (PDF)",
    "url": "https://www.minijob-zentrale.de/SharedDocs/Downloads/DE/Broschueren_Merkblaetter/gewerblich/19911_arbeitszeitkonten-fuer-minijobs.pdf?__blob=publicationFile"
  }
] as const;
const CONTENTS = [
  {
    "id": "abschnitt-1",
    "title": "Was zeigt ein Arbeitszeitkonto?"
  },
  {
    "id": "abschnitt-2",
    "title": "Rechenbeispiel: vier Arbeitstage, ein Stundenkonto"
  },
  {
    "id": "abschnitt-3",
    "title": "Welche Regeln solltet ihr vorab festlegen?"
  },
  {
    "id": "abschnitt-4",
    "title": "Wann sind Minusstunden nicht einfach eine Schuld?"
  },
  {
    "id": "abschnitt-5",
    "title": "Was gilt bei Mindestlohn und Minijobs?"
  },
  {
    "id": "abschnitt-6",
    "title": "Tabelle oder Software: Was passt zu euch?"
  }
] as const;

export const metadata: Metadata = {
  title: TITLE, description: DESCRIPTION,
  alternates: { canonical: "/arbeitszeitkonto" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/arbeitszeitkonto", type: "article" },
};

export default function GuidePage() {
  return (
    <WorkTimeGuide path="/arbeitszeitkonto" title={TITLE} intro={"Wie entsteht der Kontostand, und was sagt er aus? Ein Beispiel mit vier Arbeitstagen zeigt, wie du Sollzeit, Arbeitszeit und Übertrag sauber auseinanderhältst."} contents={CONTENTS} sources={SOURCES}>
      <section id="abschnitt-1">
        <h2>Was zeigt ein Arbeitszeitkonto?</h2>
        <p>Ein Arbeitszeitkonto stellt anrechenbare Zeiten der vereinbarten Sollzeit gegenüber und führt die Differenz als Saldo weiter. Ein positiver Saldo bedeutet Zeitguthaben, ein negativer Saldo zunächst eine rechnerische Unterschreitung. Ob daraus nachzuarbeitende Minusstunden werden, hängt vom Grund und den geltenden Vereinbarungen ab.</p>
        <p>Der Kontostand ersetzt keinen täglichen Arbeitszeitnachweis. Das BMAS nennt Beginn, Ende und Dauer als erforderliche Angaben der täglichen Erfassung. Eine Monatssumme wie „plus drei Stunden“ zeigt diese Angaben nicht. <a href={"https://www.bmas.de/DE/Arbeit/Arbeitsrecht/Arbeitnehmerrechte/Regelungen-zur-Arbeitszeit/Fragen-und-Antworten/faq-arbeitszeiterfassung.html"}>BMAS zur Arbeitszeiterfassung</a></p>
        <p>Bewahre deshalb die einzelnen Buchungen zusammen mit dem Verlauf des Kontos auf. Wie ein Tagesnachweis aufgebaut sein kann, zeigt der Ratgeber <Link href={"/arbeitszeitnachweis"}>Arbeitszeitnachweis</Link>.</p>
      </section>
      <section id="abschnitt-2">
        <h2>Rechenbeispiel: vier Arbeitstage, ein Stundenkonto</h2>
        <p>Fiktiver Fall ohne Feiertage oder Abwesenheiten: Eine Person arbeitet laut Vereinbarung an vier Tagen jeweils 6 Stunden, also 24 Stunden pro Woche. Aus der Vorwoche stehen 2 Stunden Guthaben auf dem Konto. Alle Werte in der Tabelle sind Stunden:Minuten; die Istzeit ist bereits um tatsächlich genommene Pausen bereinigt.</p>
        <GuideTable caption="Fiktives Rechenbeispiel" headers={["Tag", "Soll", "Ist netto", "Differenz", "Saldo"]} rows={[["Montag", "06:00", "06:30", "+00:30", "+02:30"], ["Dienstag", "06:00", "05:30", "−00:30", "+02:00"], ["Mittwoch", "06:00", "07:00", "+01:00", "+03:00"], ["Donnerstag", "06:00", "06:00", "00:00", "+03:00"], ["Woche", "24:00", "25:00", "+01:00", "+03:00"]]} />
        <p>Die Rechnung lautet: 2 Stunden Übertrag + 25 Stunden Ist − 24 Stunden Soll = 3 Stunden Guthaben. Der Übertrag wird nur einmal addiert. Für eigene Werte kannst du den <Link href={"/ueberstundenrechner"}>Überstundenrechner</Link> verwenden. Die täglichen Buchungen sammelst du im <Link href={"/stundenzettel"}>Stundenzettel</Link>.</p>
        <p>Bei Abwesenheiten muss die Berechnung zur vereinbarten Kontoführung passen: Entweder wird eine Zeit gutgeschrieben oder die Sollzeit entsprechend angepasst. Beides gleichzeitig würde den Ausfall doppelt berücksichtigen. Für die monatliche Sollzeit ist der <Link href={"/monatsarbeitszeit-rechner"}>Monatsarbeitszeit-Rechner</Link> ein Ausgangspunkt.</p>
      </section>
      <section id="abschnitt-3">
        <h2>Welche Regeln solltet ihr vorab festlegen?</h2>
        <p>Ein gemeinsamer Kontostand ist nur dann hilfreich, wenn beide Seiten wissen, wie er entsteht. Prüft die geltenden Arbeits- und Tarifverträge sowie gegebenenfalls eine Betriebsvereinbarung, bevor ihr die Kontoführung einrichtet. Für die praktische Abstimmung sind diese Punkte nützlich:</p>
        <ul><li>Die vereinbarte Arbeitszeit pro Person und ihre Verteilung auf Arbeitstage.</li><li>Welche zusätzlichen Stunden gebucht werden und wie ihre Freigabe erfolgt.</li><li>Grenzen für Guthaben, der Ausgleichszeitraum und der Ablauf für Freizeitausgleich.</li><li>Der Umgang mit Abwesenheiten, Korrekturen, Überträgen und dem Ende des Arbeitsverhältnisses.</li></ul>
        <p>Das ist eine Orientierung für die Einrichtung, keine Mustervereinbarung. Eine Tabelle legt nicht von selbst fest, ob bestimmte Mehrarbeit vergütet oder ein negativer Saldo verrechnet werden darf.</p>
      </section>
      <section id="abschnitt-4">
        <h2>Wann sind Minusstunden nicht einfach eine Schuld?</h2>
        <p>Fehlende Arbeit darf nicht automatisch auf Beschäftigte verlagert werden. Liegt Annahmeverzug vor oder trägt der Arbeitgeber das Risiko des Arbeitsausfalls, kann der Vergütungsanspruch nach § 615 BGB ohne Pflicht zur Nachleistung bestehen. Ob die Voraussetzungen erfüllt sind, muss anhand des konkreten Falls beurteilt werden. <a href={"https://www.gesetze-im-internet.de/bgb/__615.html"}>§ 615 BGB</a></p>
        <p>Auch Urlaub, Krankheit und Feiertage sind keine gewöhnlichen Fehlbuchungen: Bezahlter Urlaub sowie die jeweiligen Entgeltfortzahlungsansprüche müssen bei der Kontoführung berücksichtigt werden. Krankheit und Feiertage haben eigene Anspruchsvoraussetzungen. <a href={"https://www.gesetze-im-internet.de/burlg/__1.html"}>§ 1 BUrlG</a>, <a href={"https://www.gesetze-im-internet.de/entgfg/__3.html"}>§ 3 EntgFG</a>, <a href={"https://www.gesetze-im-internet.de/entgfg/__2.html"}>§ 2 EntgFG</a></p>
        <p>Prüft bei einer unerwarteten Differenz zuerst den Wochenplan, den Abwesenheitsgrund und fehlende Buchungen. Verändert nicht die tatsächlich geleistete Zeit, nur damit die Tabelle auf null kommt.</p>
      </section>
      <section id="abschnitt-5">
        <h2>Was gilt bei Mindestlohn und Minijobs?</h2>
        <p>§ 2 Absatz 2 MiLoG enthält besondere Regeln für zusätzliche Stunden auf einem schriftlich vereinbarten Arbeitszeitkonto, soweit der Mindestlohnanspruch nicht schon durch das gleichbleibende Entgelt erfüllt ist. Dann ist spätestens innerhalb von zwölf Kalendermonaten nach der monatlichen Erfassung auszugleichen; monatlich dürfen höchstens 50 Prozent der vereinbarten Arbeitszeit eingestellt werden. Bei Beendigung ist spätestens im folgenden Kalendermonat auszugleichen. Das ist keine pauschale Regel für jedes Zeitkonto. <a href={"https://www.gesetze-im-internet.de/milog/__2.html"}>§ 2 MiLoG</a></p>
        <p>Bei Minijobs sind daneben die sozialversicherungsrechtlichen Voraussetzungen zu beachten. Die Minijob-Zentrale nennt unter anderem erhebliche Schwankungen und nicht abbaubare Guthaben als Probleme. Ein Zeitkonto erlaubt daher nicht beliebige Vollzeitmonate bei unverändertem Minijobstatus. <a href={"https://www.minijob-zentrale.de/SharedDocs/Downloads/DE/Broschueren_Merkblaetter/gewerblich/19911_arbeitszeitkonten-fuer-minijobs.pdf?__blob=publicationFile"}>Minijob-Zentrale: Arbeitszeitkonten</a></p>
        <p>Die laufenden Aufzeichnungen und ihre Fristen erklären wir im Ratgeber <Link href={"/stundenzettel-minijob"}>Stundenzettel für Minijobs</Link>.</p>
      </section>
      <section id="abschnitt-6">
        <h2>Tabelle oder Software: Was passt zu euch?</h2>
        <p>Eine Tabelle kann für einen überschaubaren, vereinbarten Ablauf genügen. Halte Tagesnachweise, Sollzeiten, Übertrag und Korrekturen getrennt nachvollziehbar. Prüfe nach einer Vertragsänderung auch, ab welchem Datum der neue Wochenplan gilt.</p>
        <p>Wenn mehrere Personen buchen und Korrekturen geprüft werden müssen, hilft eine gemeinsame Zeiterfassung beim Überblick. Der Vergleich von Geräten, Ablauf und Kosten auf <Link href={"/zeiterfassung-kleinbetriebe"}>Zeiterfassung für Kleinbetriebe</Link> unterstützt die Auswahl. Starte mit einer Person und prüfe einen vollständigen Zeitraum, bevor du alte Kontostände übernimmst.</p>
      </section>
    </WorkTimeGuide>
  );
}
