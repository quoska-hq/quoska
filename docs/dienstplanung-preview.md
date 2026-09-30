# Dienstplanung: interaktive Vorabversion

Die Vorschau zeigt den geplanten Arbeitsablauf innerhalb der Quoska-Oberfläche.
Sie verwendet ausschließlich einen erfundenen Betrieb mit zwölf Mitarbeitenden,
zwei Filialen und drei Schichten pro Filiale und Tag. Sie liest oder verändert
keine Mitarbeiterdaten in Supabase.

## Starten

Node.js 24 und die bestehenden Projektabhängigkeiten werden benötigt.

```sh
npm ci
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=preview-anon-key \
SUPABASE_SERVICE_ROLE_KEY=preview-service-key \
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3007 \
npm run dev -- --hostname 127.0.0.1 --port 3007
```

Anschließend `http://127.0.0.1:3007/preview/dienstplanung` öffnen. Die angegebenen
Schlüssel sind funktionslose Platzhalter. Für diese Vorschau ist keine Datenbank
und keine Anmeldung erforderlich. Die Route liefert außerhalb des
Entwicklungsmodus HTTP 404 und wird nicht als öffentliche Seite erfasst.

Im angemeldeten lokalen Quoska ist dieselbe Vorschau unter `/app/planning`
erreichbar. Die Desktopnavigation zeigt sie für Admins und Manager nur im
Entwicklungsmodus. Anmeldung und bestehende Zugriffsprüfung bleiben aktiv.

## Ausprobieren

1. November auswählen und die zwei offenen Dienste ansehen. Wochen und Filialen
   lassen sich filtern; ein Klick auf einen Dienst öffnet die Zuordnung.
2. Einen Planungsvorschlag berechnen. Verwerfen lässt den Plan unverändert;
   Übernehmen besetzt passende offene Dienste. Bestehende Zuordnungen bleiben
   erhalten. Die Demo optimiert keinen vollständigen Plan neu.
3. Unter „Team & Regeln“ Kompetenzen, Filialen, Vertragssoll, geplante Stunden
   und den separaten aktuellen Beispielsaldo ansehen. Namen und Kompetenzen
   lassen sich filtern.
4. Unter „Meine Dienste“ eine Person auswählen und einen kompatiblen Dienst
   tauschen. Beide Zuordnungen werden erneut geprüft. Die Zustimmung beider
   Personen wird ausschließlich für die Demo angenommen.
5. November vollständig besetzen und verbindlich freigeben. Danach sind
   Änderungen und Tauschen gesperrt.
6. „Monatswechsel simulieren“ ergänzt Januar als neuen dritten Monat. Die
   bisherigen Zuordnungen bleiben erhalten, auch für Prüfungen an Monatsgrenzen.
   Januar bleibt für Mitarbeitende verborgen, bis er angekündigt wird.

Änderungen gelten nur während der Sitzung. Neuladen oder „Beispiel zurücksetzen“
stellt den Ausgangsplan wieder her. Es werden keine Benachrichtigungen versendet.

## Technischer Umfang

- Typen und fiktive Daten sind von Oberfläche und Planungsfunktionen getrennt.
- Die deterministische Beispielplanung füllt offene Dienste. Sie bevorzugt
  Personen mit niedriger Auslastung und hält seltene Backkompetenz verfügbar.
- Die Beispielprüfung berücksichtigt Kompetenz, Filiale, Urlaub, einen Dienst
  pro Tag, elf Stunden Abstand und höchstens 40 geplante Wochenstunden.
- Vorschläge sind unverbindlich und verändern den Ausgangsplan nicht. Bei der
  Übernahme werden Zuordnungen erneut geprüft; gesperrte oder inzwischen
  besetzte Dienste werden nicht überschrieben.
- Sollzeit, zukünftige Planung und vorhandene Gleitzeit werden getrennt
  dargestellt. Geplante Dienste erzeugen keine Ist-Zeiteinträge.
- Der Kalender lässt sich mobil innerhalb seines Bereichs scrollen. Die
  Mitarbeiteransicht bietet alternativ eine Liste; Drucken ist am Desktop möglich.

Dies ist keine vollständige Optimierung oder arbeitsrechtliche Prüfung. Für das
Produkt fehlen insbesondere tenantbezogene Speicherung, Rollen und Rechte,
konfigurierbare Vertrags- und Arbeitszeitregeln, Feiertags- und Abwesenheitslogik,
vollständige Neuberechnung, Versionierung und Audit, echte Tauschzustimmungen,
Benachrichtigungen sowie der separate Optimierungsdienst und dessen Lasttests.

## Prüfen

```sh
npx vitest run tests/services/planningPreviewService.test.ts
npm run test:planning-preview
```

Die Browserprüfung startet selbst einen isolierten Entwicklungsserver auf Port
3110 mit Platzhaltern. Mit `E2E_BASE_URL=http://127.0.0.1:3007` kann ein bereits
laufender Vorschau-Server verwendet werden. Die normale E2E-Suite bleibt separat;
die CI führt zusätzlich diese Vorschauprüfung aus.
