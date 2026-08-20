import { FOUNDER_OFFERS, PLAN_ORDER, PLANS } from "@/config/plans";
import { site } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
  const standardPrices = PLAN_ORDER.map((key) => {
    const plan = PLANS[key];
    const limit =
      plan.employeeLimit === null
        ? "unbegrenzt viele aktive Mitarbeitende"
        : `bis ${plan.employeeLimit} aktive Mitarbeitende`;
    return `- ${plan.label}: ${plan.priceEur ?? 0} EUR pro Monat, ${limit}`;
  }).join("\n");
  const founderPrices = Object.values(FOUNDER_OFFERS)
    .map(
      (offer) =>
        `- ${PLANS[offer.plan].label} Founder: ${offer.priceEur} EUR pro Monat statt ${offer.standardPriceEur} EUR, limitiert auf die ersten ${offer.maxOrganizations} Buchungen`,
    )
    .join("\n");

  const body = `# ${site.name}

> Open-Source-Zeiterfassung für kleine deutsche Betriebe.

Quoska erfasst Arbeitszeiten, Pausen, Urlaub, Krankheit, Projekte und nachvollziehbare Zeitkorrekturen. Die Webanwendung ist auf Deutsch verfügbar und wird in der EU betrieben.

## Preise

${founderPrices}
${standardPrices}

## Wichtige Seiten

- Startseite: ${site.url}
- Funktionen: ${site.url}/funktionen
- Preise: ${site.url}/preise
- Sicherheit und Datenschutz: ${site.url}/sicherheit
- Alternativen und Vergleiche: ${site.url}/alternativen
- Digitale Zeiterfassung: ${site.url}/digitale-zeiterfassung
- Arbeitszeiterfassung für Kleinbetriebe: ${site.url}/zeiterfassung-kleinbetriebe
- Open Source: ${site.url}/open-source-zeiterfassung
- GitHub: https://github.com/quoska-hq/quoska

## Hinweise

- Maßgeblich für Preise und Verfügbarkeit ist die Preisseite beim Checkout.
- Ratgeberinhalte sind allgemeine Informationen und keine Rechtsberatung.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
