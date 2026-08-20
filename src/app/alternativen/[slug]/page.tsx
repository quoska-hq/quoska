import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlternativeComparisonContent } from "@/components/marketing/alternative-comparison";
import { MarketingPageShell } from "@/components/marketing/page-shell";
import { JsonLd } from "@/components/seo/json-ld";
import {
  ALTERNATIVE_COMPARISONS,
  COMPARISON_RESEARCH_DATE_ISO,
  getAlternativeComparison,
} from "@/config/marketing/comparisons";
import { site } from "@/lib/site";

interface AlternativePageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return ALTERNATIVE_COMPARISONS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: AlternativePageProps): Promise<Metadata> {
  const { slug } = await params;
  const comparison = getAlternativeComparison(slug);

  if (!comparison) return {};

  const path = `/alternativen/${comparison.slug}`;
  return {
    title: comparison.title,
    description: comparison.description,
    alternates: { canonical: path },
    openGraph: {
      title: comparison.title,
      description: comparison.description,
      url: `${site.url}${path}`,
      locale: "de_DE",
      type: "article",
    },
  };
}

export default async function AlternativePage({ params }: AlternativePageProps) {
  const { slug } = await params;
  const comparison = getAlternativeComparison(slug);

  if (!comparison) notFound();

  const path = `/alternativen/${comparison.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${site.url}${path}#page`,
        url: `${site.url}${path}`,
        name: comparison.title,
        description: comparison.description,
        inLanguage: "de-DE",
        dateModified: COMPARISON_RESEARCH_DATE_ISO,
        isPartOf: { "@id": `${site.url}/#website` },
        about: [
          { "@type": "Thing", name: "Quoska", url: site.url },
          { "@type": "Thing", name: comparison.competitor },
        ],
        breadcrumb: { "@id": `${site.url}${path}#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${site.url}${path}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Startseite",
            item: site.url,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Alternativen",
            item: `${site.url}/alternativen`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: `${comparison.competitor}-Alternative`,
            item: `${site.url}${path}`,
          },
        ],
      },
    ],
  };

  return (
    <MarketingPageShell
      eyebrow={`${comparison.competitor}-Alternative`}
      title={comparison.title}
      intro={comparison.intro}
    >
      <JsonLd data={jsonLd} />
      <AlternativeComparisonContent comparison={comparison} />
    </MarketingPageShell>
  );
}
