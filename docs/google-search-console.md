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

## Status „Seite mit Weiterleitung“

Dieser Status ist kein Indexierungsfehler, wenn Google eine nicht-kanonische
Variante gefunden hat. Bei Quoska werden insbesondere diese Varianten dauerhaft
auf die bevorzugte HTTPS-Adresse ohne `www` und ohne abschließenden Slash
weitergeleitet:

- `http://quoska.de/...` → `https://quoska.de/...`
- `https://www.quoska.de/...` → `https://quoska.de/...`
- `https://quoska.de/preise/` → `https://quoska.de/preise`

Nur die Ziele gehören in die Sitemap und in interne Links. Das lässt sich für
alle Sitemap-URLs mit einem Request ohne automatisches Folgen von Redirects
prüfen; jede eingetragene URL muss direkt `200` liefern. Wenn Search Console
eine URL aus der Sitemap als Weiterleitung meldet, die exakte URL aus dem Bericht
prüfen: Dann liegt möglicherweise eine veraltete Sitemap, ein alter interner Link
oder eine abweichende Canonical-URL vor.

## Strukturierte Daten

Die Website setzt JSON-LD für `Organization`, `WebSite`, die Web-Anwendung und
inhaltsspezifische Seiten ein. Vergleichsseiten verwenden zusätzlich
`BreadcrumbList`; der Vergleichshub ein `ItemList`. Vor einem Deployment sind
die betroffenen URLs mit Googles Rich Results Test und nach dem Deployment mit
der URL-Prüfung zu kontrollieren.

`FAQPage` kann semantisch weiterhin verwendet werden. Google hat den FAQ-Rich-
Result jedoch zum 7. Mai 2026 vollständig eingestellt
([Dokumentations-Changelog](https://developers.google.com/search/updates)); das
Markup erzeugt dort keine besondere Suchdarstellung mehr und beeinflusst das
Ranking nicht. Für `SoftwareApplication` verlangt Google für den speziellen
[App-Rich-Result](https://developers.google.com/search/docs/appearance/structured-data/software-app)
neben Preisangaben auch eine echte Bewertung oder Rezension. Solche Werte dürfen
nicht erfunden werden; bis belastbare Bewertungen vorhanden sind, bleibt das
Markup korrekt, ist aber voraussichtlich nicht für diesen Rich Result qualifiziert.

## KI-Crawler und `llms.txt`

`robots.txt` erlaubt alle öffentlichen Seiten weiterhin über die Wildcard-Regel
und nennt zusätzlich die derzeit dokumentierten Crawler von OpenAI, Anthropic,
Perplexity und Google ausdrücklich. Authentifizierte App-Seiten, API-Endpunkte
und der Setup-Assistent bleiben auch für diese Bots gesperrt. Das schützt keine
Geheimnisse — Zugriffsschutz muss immer durch Authentifizierung erfolgen —,
verhindert aber unnötiges Crawling privater Oberflächen.

Die wichtigsten Produktinformationen und Links stehen zusätzlich unter
<https://quoska.de/llms.txt>. Dieses Format kann KI-Diensten die Orientierung
erleichtern, ist aber kein standardisiertes Google-Rankingsignal. Für klassische
SEO bleiben zugängliche HTML-Inhalte, Canonicals, interne Links und die Sitemap
maßgeblich.

Offizielle Dokumentation:

- [OpenAI-Crawler und Suchsichtbarkeit](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq)
- [Anthropic-Crawler](https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)
- [Perplexity-Crawler](https://docs.perplexity.ai/docs/resources/perplexity-crawlers)
- [Google-Extended](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)
- [Google: Einführung in robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro)
