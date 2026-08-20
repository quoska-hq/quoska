import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { HeroSection } from "@/components/marketing/sections/hero";
import { ProductTourSection } from "@/components/marketing/sections/product-tour";
import { FeaturesSection } from "@/components/marketing/sections/features";
import { WhyQuoskaSection } from "@/components/marketing/sections/why-quoska";
import { HowItWorksSection } from "@/components/marketing/sections/how-it-works";
import { TrustSection } from "@/components/marketing/sections/trust";
import { GuidesSection } from "@/components/marketing/sections/guides";
import { PricingSection } from "@/components/marketing/sections/pricing";
import { FaqSection, FAQ } from "@/components/marketing/sections/faq";
import { FinalCtaSection } from "@/components/marketing/sections/final-cta";
import { JsonLd } from "@/components/seo/json-ld";
import { FOUNDER_OFFERS, PLAN_ORDER, PLANS } from "@/config/plans";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    absolute: "Digitale Zeiterfassung für kleine Betriebe | Quoska",
  },
  description:
    "Digitale Zeiterfassung für kleine Betriebe: Arbeitszeiten, Pausen, Urlaub und nachvollziehbare Korrekturen. Kostenlos bis 3 Personen.",
  alternates: { canonical: "/" },
  category: "Business & Industrial",
  openGraph: {
    title: "Digitale Zeiterfassung für kleine Betriebe | Quoska",
    description:
      "Arbeitszeiten, Pausen, Urlaub und Korrekturen an einem Ort — kostenlos bis 3 Personen.",
    locale: "de_DE",
    type: "website",
    siteName: "Quoska",
    url: site.url,
  },
  twitter: {
    card: "summary_large_image",
    title: "Digitale Zeiterfassung für kleine Betriebe | Quoska",
    description:
      "Arbeitszeiten, Pausen, Urlaub und Korrekturen an einem Ort — kostenlos bis 3 Personen.",
  },
};

/** Product and visible FAQ data; Organization and WebSite live in the root layout. */
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["SoftwareApplication", "WebApplication"],
      "@id": `${site.url}/#software`,
      name: site.name,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: "de-DE",
      url: site.url,
      description:
        "Digitale Zeiterfassung für kleine Betriebe mit Pausen, Urlaub, Korrekturen und Auswertungen.",
      publisher: { "@id": `${site.url}/#organization` },
      isAccessibleForFree: true,
      featureList: [
        "Arbeitszeiterfassung und Pausen",
        "Korrekturen mit Aktivitätsverlauf",
        "Urlaub und Krankheit",
        "Projektzeiterfassung",
        "Cockpit, Berichte und CSV-Export",
      ],
      offers: [
        ...Object.values(FOUNDER_OFFERS).map((offer) => ({
          "@type": "Offer",
          name: `${PLANS[offer.plan].label} Founder`,
          price: String(offer.priceEur),
          priceCurrency: "EUR",
          url: `${site.url}/preise`,
          availability: "https://schema.org/LimitedAvailability",
          description: `Founder-Preis für die ersten ${offer.maxOrganizations} Buchungen dieses Tarifs`,
        })),
        ...PLAN_ORDER.map((key) => {
          const plan = PLANS[key];
          return {
            "@type": "Offer",
            name: plan.label,
            price: String(plan.priceEur ?? 0),
            priceCurrency: "EUR",
            url: `${site.url}/preise`,
            availability: "https://schema.org/InStock",
            description:
              plan.employeeLimit === null
                ? "Ohne Personenlimit"
                : `Bis ${plan.employeeLimit} aktive Personen`,
          };
        }),
      ],
    },
    {
      "@type": "FAQPage",
      url: `${site.url}/#faq`,
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ],
};

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col bg-[#f5f3ee]">
      <JsonLd data={jsonLd} />
      <MarketingNav />

      <main className="flex-1">
        <HeroSection />
        <ProductTourSection />
        <FeaturesSection />
        <WhyQuoskaSection />
        <HowItWorksSection />
      <TrustSection />
      <GuidesSection />
      <PricingSection />
        <FaqSection />
        <FinalCtaSection />
      </main>

      <MarketingFooter />
    </div>
  );
}
