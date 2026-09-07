# Import vergangener Arbeitszeiten

Recherche und Implementierung: 7. September 2026.

## Belegte Formate und Beispiele

Ein gemeinsames, verbindliches Zeiterfassungsschema ließ sich in den geprüften
Anbieterdokumentationen nicht feststellen. CSV ist das gemeinsame Dateiformat;
Feldnamen, Datumsformat, Zeitzone und Dauerformat unterscheiden sich. Deshalb
verwendet Quoska einen Import mit Spaltenzuordnung und Vorschau.

- [Clockify: Export reports](https://clockify.me/help/reports/exporting-reports)
  dokumentiert den CSV-Detailbericht mit Benutzer, E-Mail, Startdatum/-zeit,
  Enddatum/-zeit, Dauer und Beschreibung. Zusammenfassungen enthalten keine
  Zeitstempel. CSV-Verfügbarkeit hängt vom Tarif ab.
- [Clockify: Import data](https://clockify.me/help/getting-started/import-timesheets)
  zeigt konkrete Felder und Formatbeispiele sowie Spaltenzuordnung und Vorschau.
- [Toggl: Detailed report](https://support.toggl.com/en-us/article/detailed-report-k9bzy2/)
  dokumentiert einzelne Zeiteinträge und deren CSV-Export.
  [Toggl Support bestätigt Start-/Endzeit und Datum im CSV](https://community.toggl.com/t/csv-export-no-longer-includes-start-time-end-time-date/4439).
- [Toggl: Universal CSV Importer](https://docs.toggl.com/universal-csv-importer)
  ist ein weiteres konkretes Beispiel für Migration mit Feldzuordnung.
- [Clockodo: CSV-Import](https://support.clockodo.com/de/help-center/wie-kann-ich-csv-dateien-importieren)
  dokumentiert die Feldzuordnung; eine Zeiteintragsvorlage gibt es auf Anfrage.
  [Clockodo: Funktionen](https://www.clockodo.com/de/funktionen/)
  bestätigt CSV-Berichtsexporte. Ein öffentlich verifiziertes CSV-Beispielschema
  für einen direkten Clockodo-Adapter wurde nicht gefunden. Deshalb gibt es
  keinen als Clockodo-kompatibel beworbenen Direktadapter. Ein Detail-CSV mit
  passenden Einzelzeiten lässt sich manuell zuordnen; ohne reale Beispieldatei
  ist die direkte Kompatibilität nicht bestätigt.

Die Testdaten sind selbst erstellte, synthetische Beispiele anhand der
dokumentierten Felder, keine Exporte aus echten Kundenkonten.

## Nutzung

Unter **Einstellungen → Vergangene Arbeitszeiten importieren**:

1. Im bisherigen System einen ungerundeten Detailbericht als UTF-8-CSV exportieren.
2. Datei hochladen, Datum-/Dauerformat und Quellzeitzone einstellen.
3. Spalten zuordnen und jede Quellperson einem bestehenden Mitarbeiter zuweisen.
   Übereinstimmende E-Mail-Adressen werden vorgeschlagen. Namen werden bewusst
   nicht automatisch zugeordnet. Ohne Personenspalte wird ein Ziel für alle
   Zeilen gewählt.
4. Vorschau prüfen, Fehler korrigieren, anschließend Import bestätigen.

Falls der Import nicht klappt, bietet die Importkarte Hilfe durch
`support@quoska.de` an. Nutzer können den Export als E-Mail-Anhang oder einen
Download-Link schicken und das bisherige System sowie das Problem beschreiben.
Der Kontaktlink öffnet eine E-Mail-Vorlage; Dateien und Importdaten werden dabei
nicht automatisch angehängt oder versendet. Der Support kann die Daten manuell übernehmen.

Die [CSV-Vorlage](../public/examples/arbeitszeiten-import.csv) enthält eine
Tagschicht und eine Nachtschicht. Pflicht: Startdatum, Beginn und Ende oder
Arbeitsdauer; bei Ende nach Mitternacht muss ein Enddatum vorhanden sein.
Dauer bedeutet Nettoarbeitszeit; bei vorhandenem Ende wird sie auf Konsistenz
geprüft, sonst wird Ende aus Beginn + Dauer + Pause berechnet.

Unterstützt: Komma/Semikolon/Tabulator, CSV-Anführungszeichen mit eingebetteten
Zeilenumbrüchen, UTF-8-BOM, vier explizite Datumsformate, 12-/24-Stunden-Uhrzeiten
mit optionalen Sekunden, Dauer HH:MM[:SS] oder Dezimalstunden/Minuten,
Zeitzonen Europe/Berlin und UTC. Zweideutige oder nicht existierende Uhrzeiten
bei der Zeitumstellung werden abgewiesen und müssen separat in UTC exportiert
werden. Es werden keine Daten in andere Zeitzonen geraten.

Grenzen: 2 MB, 2.000 Einträge und 100 Spalten pro Datei; maximal 24 Stunden pro
Eintrag und 500 Zeichen für Beschreibung inklusive Projektnotiz. Nur vergangene,
abgeschlossene Einträge. Pausen müssen ganze Minuten sein. Ohne Pausenspalte
werden 0 Minuten übernommen; automatische Pausenregeln werden nicht angewendet.
Projektbezeichnungen bleiben als Notiz erhalten, es werden keine Projekte oder
Mitarbeiter angelegt. Andere Felder (z. B. Tags, Kunden, Abrechnung) werden nicht
übernommen. PDF, XLSX, Tagessummen ohne Beginn und API-JSON werden nicht unterstützt.
Das ist kein Wiederherstellungsformat für ältere Quoska-Berichtsexporte, die
Uhrzeiten ohne Zeitzonen-/Enddatumsinformation ausgeben.

## Speicherung und Betrieb

- Migration `031_time_entry_import.sql` vor Nutzung installieren. Keine neuen
  Bibliotheken, API-Zugangsdaten oder Kontoverbindungen erforderlich.
- API und Datenbank prüfen Manager-/Adminrolle und Unternehmenszugehörigkeit.
  Die RPC ist nur für `service_role` ausführbar und nutzt `SECURITY INVOKER`.
- Jede Vorschau und jeder Import validiert serverseitig neu. Innerhalb der Datei
  und gegen vorhandene Einträge werden Überschneidungen erkannt. Identische
  Person, Beginn, Ende, Pause und Notiz ohne Projektzuordnung zählen als Duplikat.
  Abweichende Daten bei gleichem Zeitraum sind Fehler, keine stillen Updates.
- Alle neuen Zeiten und Audit-Einträge werden in derselben Transaktion gespeichert.
  Ein Fehler verhindert den gesamten Import. Wiederholen nach einem
  Verbindungsabbruch ist durch Duplikaterkennung möglich.
- Der begrenzte, mengenorientierte Commit sperrt `time_entries` kurz gegen andere
  Schreiber, damit zwischen Konfliktprüfung und Insert keine Live-Stempelung oder
  manuelle Änderung dazwischenkommt. Vorschauen sperren nicht. Große Migrationen
  auf mehrere Dateien verteilen; für deutlich größere Kundenbestände wäre ein
  Hintergrundimport mit feinerer Sperrstrategie eine spätere Erweiterung.
- Einträge sind als `entry_source = import` sichtbar und mit Akteur, Zeitpunkt
  und Originaldaten protokolliert. Die Datei selbst wird nicht gespeichert.
- Beschäftigungsbeginn und Anfangssaldo werden nicht verändert. Bei Migration
  müssen diese zur importierten Historie passen, damit der Überstundensaldo
  keine alten Zeiten ausschließt oder bereits mitgebrachte Überstunden doppelt zählt.

Die Datenbankmigration ist ein ausdrücklicher Schritt beim Deployment in Quoska Cloud.

## Validierung

- TypeScript-Prüfung und ESLint für alle geänderten TypeScript-Dateien erfolgreich.
- 36 neue Parser-/API-Tests und 54 bestehende Tests für Zeiten, Pausen und Audit erfolgreich.
- `tests/integration/time-import.sql` gegen lokales PostgreSQL erfolgreich:
  Unternehmensgrenzen, Rollen, Duplikate, Überschneidungen, laufende Stempeluhr,
  atomarer Import und Rollback bei simuliertem Auditfehler.
- `tests/e2e/time-import.spec.ts` erfolgreich: CSV-Upload, Zuordnung, Vorschau,
  Speicherung, erneuter Import, gleichzeitige Importversuche und mobile Ansicht.
- Getestet mit synthetischen Beispieldaten. Ein echter Clockodo-Export bleibt
  Voraussetzung, bevor ein spezifischer Clockodo-Adapter zugesichert wird.
