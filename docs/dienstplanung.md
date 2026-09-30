# Dienstplanung für Deutschland

Die optionale Dienstplanung verwendet bestehende Mitarbeitende, Sollmodelle,
genehmigte Abwesenheiten, Krankmeldungen und Zeitkonten. Sie schreibt keine
Zeiteinträge und verändert keine bestehenden Sollstunden oder Urlaubskonten.
Administratoren und Führungskräfte richten das Modul unter `/app/planning` ein.
Mitarbeitende sehen freigegebene Dienste unter `/app/my-shifts`.

## Einrichtung und Ablauf

1. Ersten Planungsmonat wählen; Filialen mit Bundesland und örtlichen Feiertagen eintragen.
2. Kompetenzen und die berechtigten Personen je Filiale festlegen.
3. Verfügbarkeit unabhängig vom vertraglichen Sollmodell vereinbaren. Weitere
   Beschäftigungen und die Arbeitszeithistorie vollständig eintragen. Die
   Einsatzberechtigung kann zeitlich begrenzt werden; Verfügbarkeit lässt sich
   für einzelne Tage ausdrücklich abweichend festlegen.
4. Wiederkehrende Schichtvorlagen mit konkreten Pausen und den gleichzeitig
   benötigten Kompetenzbesetzungen festlegen.
5. Drei Monate anlegen, Rechenvorschlag prüfen und übernehmen. Den ersten Monat
   verbindlich freigeben, die weiteren Monate ankündigen.
6. Beim Monatswechsel den aktuellen Monat verbindlich machen und den fehlenden
   dritten Monat ergänzen. Änderungen an gesperrten Diensten brauchen eine
   Begründung und eine erneute Prüfung. Bei größeren Abweichungen betroffene
   Schichten ausdrücklich zur Neubesetzung freigeben, Vorlagen bei Bedarf
   aktualisieren und den Entwurf anschließend erneut veröffentlichen.

Ein Tausch benötigt die Zustimmung beider Personen und die Freigabe einer
Planungsverantwortlichen. Geänderte Schichten oder neue Abwesenheiten werden
vor Freigabe erneut geprüft. Mitarbeitende können ihre Wunsch-Arbeitstage
angeben; Wünsche ändern die vereinbarte Verfügbarkeit nicht.

Vertragliche Solländerungen können mit künftigem Stichtag vorgemerkt werden.
Zeiterfassung, Zeitkonto, Cockpit und neue Urlaubsanträge verwenden dasselbe
datierte Sollmodell. Bereits wirksame Änderungen bleiben erhalten. Beim ersten
Vormerken wird das bisher verwendete Modell als Grundlage beibehalten;
unbekannte frühere Vertragsänderungen werden nicht erfunden. Bereits berechnete
Urlaubsanträge werden durch eine Planänderung nicht neu bewertet.

## Unterstütztes Regelprofil

`DE-adult-standard-8h-v1` verwendet konservative Grenzen: acht Nettoarbeitsstunden
je geplantem Arbeitstag und einen Schichtblock pro Arbeitstag, höchstens 48 Stunden in einer Kalenderwoche, elf Stunden Ruhezeit und
konkrete Ruhepausen nach spätestens sechs Stunden. Weitere Beschäftigungen zählen
mit. Pausen entfernen Personen aus der verfügbaren Besetzung. Eine Person deckt
nur einen gleichzeitig benötigten Kompetenzplatz ab.

Sonn- und Feiertagsarbeit braucht eine dokumentierte, zeitlich gültige
Berechtigung. Die Bäckerei-Ausnahme für Herstellung und Auslieferung ist auf
drei Stunden begrenzt; sie deckt den Verkauf nicht automatisch ab. Ersatzruhetage
werden ausdrücklich reserviert und über Monatsgrenzen geprüft. Mindestens
15 beschäftigungsfreie Sonntage im Kalenderjahr müssen verbleiben. Örtliche
Feiertage müssen bestätigt werden. Fehlende Feiertagsjahre sperren die Freigabe.
Mehrdeutige oder nicht existierende Uhrzeiten bei Zeitumstellung werden abgewiesen.

Das Modul bildet keine Tarifausnahmen, Verkürzungen der Ruhezeit, zehnstündige
Arbeitstage mit Ausgleichszeiträumen, geteilte Dienste mit kurzen Abständen, Jugend- oder Mutterschutzprofile ab. Solche
Fälle bleiben gesperrt. Sonn- oder Feiertagsarbeit bei weiteren Arbeitgebern
bleibt ohne gesondertes Berechtigungs- und Ersatzruheprofil ebenfalls gesperrt.
Die Bestätigung von Nachtarbeit umfasst Voraussetzungen, Vorsorge und Ausgleich
außerhalb der automatischen Stundenprüfung. Dokumentierte
Sonderberechtigungen müssen vom Betrieb fachlich geprüft werden. Die Anwendung
erteilt keine behördliche oder juristische Zulassung.

Rechtsgrundlagen: [ArbZG](https://www.gesetze-im-internet.de/arbzg/), insbesondere
§§ 2–6 und 9–11. Die Freigabe ersetzt keine Prüfung der betrieblichen Vereinbarungen.

## Rechenworker

Der Python-Worker verwendet Google OR-Tools CP-SAT und liefert Vorschläge.
Übernahme und Veröffentlichung erfolgen in der Anwendung nach einer unabhängigen
TypeScript-Prüfung. Der Worker bekommt Kennungen und Rechendaten, keine Namen,
E-Mail-Adressen, Gesundheitsunterlagen oder Supabase-Service-Schlüssel.

Ein zufälliger `PLANNING_WORKER_TOKEN` mit mindestens 32 Zeichen muss im
App-Environment und im Worker identisch gesetzt sein. Für Self-Hosting:

```sh
docker compose -f compose.prod.yaml -f compose.planning.yaml --profile planning up -d --build
```

Alternativ: Python 3.12+, Abhängigkeiten aus `planning-worker/requirements.txt`,
`PLANNING_APP_URL`, `PLANNING_WORKER_TOKEN` und `python planning-worker/worker.py`.
Extern wird HTTPS verlangt. HTTP braucht eine ausdrückliche lokale Freigabe.
Der Worker nutzt zwei Rechenthreads, maximal 60 Sekunden je Lauf und eine
drei Minuten gültige Lease. Ausgefallene Läufe werden höchstens dreimal versucht.
Das Compose-Profil begrenzt Speicher und CPU. Eine Zeitüberschreitung beweist
keine Unlösbarkeit.

Alle neuen Migrationen müssen vor Aktivierung des Moduls angewendet werden.
Ein fehlender Worker verhindert nur automatische Berechnungen. Die manuelle
Planung und Freigabe bleiben verfügbar.

## Sicherheit und Datenhaltung

Direkte Browser-Schreibzugriffe auf Planungstabellen sind gesperrt. Leserechte
prüfen die aktuelle Mitarbeiterrolle in der Datenbank. Mitarbeitende erhalten
ihre veröffentlichten Dienste; die Tauschauswahl zeigt nur freigegebene Dienste
und die erforderlichen Kollegennamen. Verfügbarkeit und Zeitkonten bleiben der
Planungsverantwortung vorbehalten.

Jede Änderung prüft die aktuelle Versionsnummer in einer atomaren Transaktion.
Änderungen an Personen, Abwesenheiten, Zeitbuchungen und Feiertagen invalidieren
alte Vorschläge. Freigaben erzeugen unveränderliche Revisionen und deduplizierte
In-App-Benachrichtigungen. Personen, deren Dienst entfällt, werden ebenfalls
benachrichtigt. Historische Perioden bleiben gespeichert.

Die Zeitkontoprognose verwendet dasselbe Sollmodell wie die Zeiterfassung.
Laufende Buchungen, offene Krankmeldungen und fehlende historische Feiertagsdaten
werden als Unsicherheit angezeigt. Verbindliche Dienste bestimmen im Cockpit,
an welchen Tagen ein Zeiteintrag erwartet wird; das vertragliche Soll bleibt bestehen.

## Größe und Tests

Aufwand wächst mit zulässigen Person-Schicht-Kombinationen und Überschneidungen.
Die Vorfilterung berücksichtigt Filialteams, Kompetenzen und Verfügbarkeit.
Die Oberfläche zeigt jeweils eine Woche und bietet einen Filialfilter.
Ein Monat ist auf 20.000 Schichten begrenzt; ein Rechenlauf auf zwei Millionen
Kandidatenkombinationen und 500.000 Konfliktpaare. Diese Schutzgrenzen sind keine
garantierten Kapazitätsangaben. `planning-worker/benchmark.py` prüft synthetische
Größen; echte Betriebe brauchen Tests mit ihren Regeln und ihrer Infrastruktur.

```sh
npm test
npm run test:legal
python -m unittest discover -s planning-worker -p 'test_*.py'
python planning-worker/benchmark.py
npm run test:e2e
```

PostgreSQL-Tests prüfen tatsächliche RLS-Policies, konkurrierende Versionsstände
und unveränderliche Revisionen mit PGlite. Der vollständige Browserablauf benötigt
eine lokale Supabase-Instanz und den laufenden Worker; CI startet beide.

## Separate Ausbaustufen

1. Ersatzbesetzung und Übernahme offener Schichten.
2. Kenntnisnahme und ausdrückliche Bestätigung veröffentlichter Pläne.
3. Wochen kopieren und mehrere Schichten gemeinsam bearbeiten.
4. Kosten- und Budgetübersicht.

Diese vier Stufen erweitern die Kernplanung unabhängig voneinander. Prognosen
aus Kassendaten, native Apps und vollständige Lohnabrechnung sind weitere,
separat zu bewertende Produktentscheidungen.
