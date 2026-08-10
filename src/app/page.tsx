import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { HeroSection } from "@/components/marketing/sections/hero";
import { FeaturesSection } from "@/components/marketing/sections/features";
import { HowItWorksSection } from "@/components/marketing/sections/how-it-works";
import { PricingSection } from "@/components/marketing/sections/pricing";
import { FaqSection, FAQ } from "@/components/marketing/sections/faq";
import { FinalCtaSection } from "@/components/marketing/sections/final-cta";
import { site, legalInfo } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    absolute: "Quoska — Zeiterfassung, die im Betrieb funktioniert",
  },
  description:
    "Arbeitszeiten, Pausen, Korrekturen und Auswertungen für deutsche Betriebe. Klar für Mitarbeitende, übersichtlich für Verantwortliche.",
  alternates: { canonical: "/" },
  category: "Business & Industrial",
  openGraph: {
    title: "Quoska — Zeiterfassung für deutsche KMU",
    description:
      "Arbeitszeit erfassen, Pausen dokumentieren und Auswertungen erstellen — ohne komplizierte Einführung.",
    locale: "de_DE",
    type: "website",
    siteName: "Quoska",
    url: site.url,
  },
  twitter: {
    card: "summary_large_image",
    title: "Quoska — Zeiterfassung für deutsche KMU",
    description:
      "Arbeitszeit erfassen, Pausen dokumentieren und Auswertungen erstellen.",
  },
};

/** Structured data for rich results: Organization + WebSite + SoftwareApplication + FAQPage. */
const orgEmail = legalInfo.email.includes("[TODO:") ? undefined : legalInfo.email;

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${site.url}/#organization`,
      name: site.name,
      url: site.url,
      logo: `${site.url}/icons/icon-512.png`,
      ...(orgEmail ? { email: orgEmail } : {}),
    },
    {
      "@type": "WebSite",
      "@id": `${site.url}/#website`,
      url: site.url,
      name: site.name,
      inLanguage: "de-DE",
      publisher: { "@id": `${site.url}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      name: site.name,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: "de-DE",
      url: site.url,
      description:
        "Zeiterfassung für deutsche KMU mit Pausen, Korrekturen und Auswertungen.",
      publisher: { "@id": `${site.url}/#organization` },
      offers: [
        { "@type": "Offer", name: "Free", price: "0", priceCurrency: "EUR" },
        { "@type": "Offer", name: "Team", price: "9", priceCurrency: "EUR" },
        { "@type": "Offer", name: "Business", price: "59", priceCurrency: "EUR" },
        { "@type": "Offer", name: "Pro", price: "99", priceCurrency: "EUR" },
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNav />

      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <FaqSection />
        <FinalCtaSection />
      </main>

      <MarketingFooter />
    </div>
  );
}
