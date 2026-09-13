import type { Metadata } from "next";
import Link from "next/link";
import { WorkTimeGuide, GuideTable } from "@/components/marketing/work-time-guide";
import { TimesheetTemplateLinks } from "@/components/marketing/timesheet-template-links";

const TITLE = "Stundenzettel Minijob: kostenlose Vorlage und Fristen 2026";
const DESCRIPTION = "Stundenzettel für Minijobs: leere PDF-Vorlage, Online-Berechnung, ausgefülltes Beispiel und Erklärung der Aufzeichnungs- und Aufbewahrungsfristen für Betriebe.";
const SOURCES = [
  {
    "id": "milog17",
    "title": "§ 17 MiLoG: Aufzeichnungspflichten",
    "url": "https://www.gesetze-im-internet.de/milog/__17.html"
  },
  {
    "id": "minijob",
    "title": "Minijob-Zentrale: Arbeitszeitkonten für Minijobs (PDF)",
    "url": "https://www.minijob-zentrale.de/SharedDocs/Downloads/DE/Broschueren_Merkblaetter/gewerblich/19911_arbeitszeitkonten-fuer-minijobs.pdf?__blob=publicationFile"
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
  }
] as const;
const CONTENTS = [
  {
    "id": "abschnitt-1",
    "title": "Welche Angaben gehören auf den Stundenzettel?"
  },
  {
    "id": "abschnitt-2",
    "title": "Beispiel: Arbeitszeit und Pause richtig eintragen"
  },
  {
    "id": "abschnitt-3",
    "title": "Bis wann erfassen und wie lange aufbewahren?"
  },
  {
    "id": "abschnitt-4",
    "title": "Wie passen Stunden und Verdienstgrenze zusammen?"
  },
  {
    "id": "abschnitt-5",
    "title": "Häufige Fragen"
  }
] as const;

export const metadata: Metadata = {
  title: TITLE, description: DESCRIPTION,
  alternates: { canonical: "/stundenzettel-minijob" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/stundenzettel-minijob", type: "article" },
};

export default function GuidePage() {
  return (
    <WorkTimeGuide path="/stundenzettel-minijob" title={TITLE} intro={"Für einen gewerblichen Minijob brauchst du nachvollziehbare tägliche Aufzeichnungen. Hier bekommst du eine leere Monatsvorlage und ein Beispiel für Arbeitszeit, Pause und Frist."} contents={CONTENTS} sources={SOURCES} heroActions={<TimesheetTemplateLinks />}>
      <section id="abschnitt-1">
        <h2>Welche Angaben gehören auf den Stundenzettel?</h2>
        <p>Für gewerbliche Minijobs sind grundsätzlich Beginn, Ende und Dauer der täglichen Arbeit aufzuzeichnen. § 17 MiLoG erfasst geringfügige Beschäftigung nach § 8 Absatz 1 SGB IV und damit auch kurzfristige Beschäftigungen. Minijobs in Privathaushalten nach § 8a SGB IV sind von dieser besonderen Vorschrift ausgenommen. <a href={"https://www.gesetze-im-internet.de/milog/__17.html"}>§ 17 MiLoG</a></p>
        <p>Nutze pro Person und Monat ein eigenes Blatt. Ergänze Unternehmensname, Name und Datum, damit die Einträge zugeordnet werden können. Trage tatsächlich genommene Pausen separat ein: So lässt sich die Nettoarbeitszeit nachrechnen. Ein vereinbarter Dienstplan allein zeigt noch nicht, wann tatsächlich gearbeitet wurde.</p>
      </section>
      <section id="abschnitt-2">
        <h2>Beispiel: Arbeitszeit und Pause richtig eintragen</h2>
        <GuideTable caption="Fiktives Rechenbeispiel" headers={["Datum", "Beginn", "Ende", "Pause", "Arbeitszeit"]} rows={[["11.09.2026", "09:00", "13:30", "30 Minuten", "04:00 Stunden"]]} />
        <p>Fiktives Beispiel für eine Person: Zwischen Beginn und Ende liegen 4 Stunden 30 Minuten. Nach Abzug der tatsächlich genommenen Pause bleiben 4 Stunden. Übertrage nicht die Anwesenheitsdauer von 4,5 Stunden als Arbeitszeit. Und verwechsle Minuten nicht mit Dezimalstellen: 4 Stunden 15 Minuten sind 4,25 Stunden, nicht 4,15.</p>
        <p>Bei einer Schicht über Mitternacht gehört das Enddatum dazu. Im <Link href={"/stundenzettel"}>Online-Stundenzettel</Link> aktivierst du dafür „Folgetag“. Auf der PDF-Vorlage trägst du das Datum neben der Endzeit ein. Gibt es mehrere Arbeitsblöcke, kannst du auf dem Papier mehrere Zeilen für denselben Tag verwenden.</p>
      </section>
      <section id="abschnitt-3">
        <h2>Bis wann erfassen und wie lange aufbewahren?</h2>
        <p>Nach § 17 Absatz 1 MiLoG muss die Aufzeichnung spätestens am siebten Kalendertag nach dem Arbeitstag vorliegen. Sie ist ab dem maßgeblichen Aufzeichnungszeitpunkt mindestens zwei Jahre aufzubewahren. Diese besondere Regel gilt nicht pauschal für jeden Arbeitszeitnachweis. <a href={"https://www.gesetze-im-internet.de/milog/__17.html"}>§ 17 MiLoG</a></p>
        <p>Für Arbeit am 11.09.2026 ist der siebte folgende Kalendertag der 18.09.2026. Praktisch ist es einfacher, die Zeiten am Arbeitstag einzutragen. Wartet bei gewerblichen Minijobs nicht auf das Monatsende, um die ersten Einträge zu erstellen.</p>
        <p>Legt fest, wo die Nachweise liegen und wer fehlende Angaben klärt. Nachträgliche Korrekturen sollten mit ursprünglichem Wert, Änderung und Grund nachvollziehbar bleiben. Die allgemeine Einordnung findest du unter <Link href={"/arbeitszeitnachweis"}>Arbeitszeitnachweis: Angaben und Fristen</Link>.</p>
      </section>
      <section id="abschnitt-4">
        <h2>Wie passen Stunden und Verdienstgrenze zusammen?</h2>
        <p>Für 2026 nennt die Minijob-Zentrale eine monatliche Verdienstgrenze von 603 Euro und einen gesetzlichen Mindestlohn von 13,90 Euro. Höhere vereinbarte oder einschlägige Branchenlöhne sind bei der Planung zu berücksichtigen. <a href={"https://www.minijob-zentrale.de/SharedDocs/Downloads/DE/Broschueren_Merkblaetter/gewerblich/19911_arbeitszeitkonten-fuer-minijobs.pdf?__blob=publicationFile"}>Minijob-Zentrale, Stand Januar 2026</a></p>
        <p>Ein einfaches Planungsbeispiel: Bei 15 Euro Stundenlohn entsprechen 603 Euro rechnerisch 40,2 Stunden, also 40 Stunden 12 Minuten. Das ist keine allgemeine Höchststundenzahl für jeden Minijob und keine vollständige sozialversicherungsrechtliche Prüfung. Zusätzliche Entgeltbestandteile und Schwankungen müssen gesondert betrachtet werden.</p>
        <p>Ein Arbeitszeitkonto macht aus beliebigen Schwankungen nicht automatisch einen zulässigen Minijob. Die Minijob-Zentrale warnt insbesondere vor erheblich schwankender Arbeitszeit und vor Zeitguthaben, die nicht abgebaut werden können. <a href={"https://www.minijob-zentrale.de/SharedDocs/Downloads/DE/Broschueren_Merkblaetter/gewerblich/19911_arbeitszeitkonten-fuer-minijobs.pdf?__blob=publicationFile"}>Minijob-Zentrale: Arbeitszeitkonten</a></p>
        <p>Wenn eure Arbeitsstunden schwanken, hilft der Ratgeber <Link href={"/arbeitszeitkonto"}>Arbeitszeitkonto im kleinen Betrieb</Link>, Sollzeit, tatsächlich geleistete Zeit und Übertrag auseinanderzuhalten.</p>
      </section>
      <section id="abschnitt-5">
        <h2>Häufige Fragen</h2>
        <h3>Muss ich die Vorlage unterschreiben lassen?</h3>
        <p>§ 17 MiLoG verlangt keine Unterschrift als eigenes Pflichtfeld. Zusätzliche vertragliche oder branchenspezifische Anforderungen sind damit nicht ausgeschlossen. Eine interne Bestätigung kann zur Prüfung gehören, ersetzt aber keine vollständigen Zeitangaben. <a href={"https://www.gesetze-im-internet.de/milog/__17.html"}>§ 17 MiLoG</a></p>
        <h3>Gibt es die Vorlage auch für Excel?</h3>
        <p>Du kannst die Zeiten online ausfüllen und als CSV herunterladen. Excel und LibreOffice können die Datei öffnen. Sie enthält fertige Werte, keine weiterrechnenden Formeln. Die leere PDF-Vorlage oben ist zum handschriftlichen Ausfüllen gedacht.</p>
        <h3>Was mache ich bei Urlaub oder Krankheit?</h3>
        <p>Trage ausgefallene Stunden nicht als tatsächlich geleistete Arbeit ein. Führe Abwesenheiten gesondert und prüfe die jeweiligen Ansprüche: Für Urlaub besteht ein Anspruch auf Bezahlung; für Krankheit und gesetzliche Feiertage regelt das Entgeltfortzahlungsgesetz die Voraussetzungen. <a href={"https://www.gesetze-im-internet.de/burlg/__1.html"}>§ 1 BUrlG</a>, <a href={"https://www.gesetze-im-internet.de/entgfg/__3.html"}>§ 3 EntgFG</a>, <a href={"https://www.gesetze-im-internet.de/entgfg/__2.html"}>§ 2 EntgFG</a></p>
        <h3>Wann lohnt sich eine gemeinsame Zeiterfassung?</h3>
        <p>Wenn du regelmäßig mehrere Stundenzettel einsammelst, fehlende Buchungen klärst oder Monatsstände vergleichen musst, wird eine gemeinsame Ablage hilfreicher. Auf <Link href={"/zeiterfassung-kleinbetriebe"}>Zeiterfassung für Kleinbetriebe</Link> siehst du den Ablauf und Kostenbeispiele für verschiedene Teamgrößen.</p>
      </section>
    </WorkTimeGuide>
  );
}
