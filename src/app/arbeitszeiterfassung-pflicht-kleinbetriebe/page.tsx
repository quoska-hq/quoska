import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing/page-shell";
import { site } from "@/lib/site";
import { GuideFinalSections } from "./guide-final-sections";
import { GuideIntroSections } from "./guide-intro-sections";
import { GuideMainSections } from "./guide-main-sections";
import { JSON_LD, PAGE_PATH, PUBLISHED_DATE } from "./guide-data";

export const metadata: Metadata = {
  title: "Arbeitszeiterfassung: Pflicht für Kleinbetriebe 2026",
  description:
    "Arbeitszeiterfassung im Kleinbetrieb: Was 2026 gilt, welche Zeiten erfasst werden müssen und wann besondere Fristen greifen — mit amtlichen Quellen.",
  alternates: { canonical: PAGE_PATH },
  openGraph: {
    title: "Arbeitszeiterfassung: Pflicht für Kleinbetriebe 2026",
    description:
      "Die aktuelle Rechtslage verständlich erklärt — mit BAG-Entscheidung, amtlichen Quellen und einer praktischen Checkliste.",
    type: "article",
    locale: "de_DE",
    url: `${site.url}${PAGE_PATH}`,
    publishedTime: PUBLISHED_DATE,
    modifiedTime: PUBLISHED_DATE,
  },
};

export default function TimeRecordingDutyGuidePage() {
  return (
    <MarketingPageShell
      eyebrow="Rechtsratgeber · Stand 14. August 2026"
      title="Arbeitszeiterfassung für Kleinbetriebe: Was 2026 wirklich gilt."
      intro="Auch kleine Arbeitgeber müssen sich mit der vollständigen Arbeitszeiterfassung befassen. Dieser Leitfaden trennt die bereits geltende Pflicht von angekündigten Gesetzesänderungen — und verlinkt jede wesentliche Aussage auf amtliche Primärquellen."
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <article>
        <GuideIntroSections />
        <GuideMainSections />
        <GuideFinalSections />
      </article>
    </MarketingPageShell>
  );
}
