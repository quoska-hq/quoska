# Google Search Console für quoska.de

Die Website liefert bereits eine öffentliche Sitemap unter
<https://quoska.de/sitemap.xml>. Für verlässliche Aussagen zu Indexierung,
Suchanfragen, Impressionen und Positionen muss `quoska.de` zusätzlich als
Property in der [Google Search Console](https://search.google.com/search-console)
verifiziert werden.

## Empfohlen: Domain-Property per DNS

1. In der Search Console eine neue **Domain-Property** für `quoska.de` anlegen.
2. Den von Google ausgegebenen TXT-Eintrag beim DNS-Anbieter hinterlegen.
3. Nach der DNS-Aktualisierung die Verifizierung in der Search Console abschließen.

Dieser Weg deckt HTTPS, HTTP, die Hauptdomain und mögliche Subdomains gemeinsam
ab. Er benötigt keine Änderung an der Anwendung.

## Alternative: URL-Präfix per HTML-Tag

Für eine URL-Präfix-Property kann der Inhalt aus Googles
`google-site-verification`-Meta-Tag beim Image-Build übergeben werden. Dazu den
folgenden Build-Parameter zu den bereits vorhandenen Produktionsparametern
hinzufügen:

```bash
--build-arg GOOGLE_SITE_VERIFICATION=replace-with-google-token
```

Nach dem Deployment erscheint der Token als Meta-Tag auf den öffentlichen
Seiten. Der Wert ist absichtlich öffentlich, muss aber beim **Build** vorhanden
sein, weil Next.js die Marketingseiten statisch erzeugt.

## Nach der Verifizierung

1. `https://quoska.de/sitemap.xml` im Bereich **Sitemaps** einreichen.
2. Mit der URL-Prüfung zunächst diese Seiten testen und zur Indexierung senden:
   - `https://quoska.de/`
   - `https://quoska.de/zeiterfassung-kleinbetriebe`
   - `https://quoska.de/digitale-zeiterfassung`
   - `https://quoska.de/open-source-zeiterfassung`
   - `https://quoska.de/arbeitszeiterfassung-pflicht-kleinbetriebe`
3. Nach einigen Tagen im Leistungsbericht Suchanfragen, Seiten, Land
   (Deutschland), Impressionen, Klicks und durchschnittliche Position prüfen.
4. Nicht wiederholt dieselben URLs einreichen. Eine Anfrage garantiert keine
   sofortige Aufnahme und beschleunigt sich nicht durch Wiederholung.

Weitere Details stehen in Googles Dokumentation zu
[Search Console](https://developers.google.com/search/docs/monitor-debug/search-console-start)
und zum
[erneuten Crawlen](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).
