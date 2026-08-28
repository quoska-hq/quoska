import { legalInfo, site } from "@/lib/site";
import { JsonLd } from "@/components/seo/json-ld";

const publicEmail = legalInfo.email.includes("[TODO:")
  ? undefined
  : legalInfo.email;

const SITE_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${site.url}/#organization`,
      name: site.name,
      url: site.url,
      logo: {
        "@type": "ImageObject",
        url: `${site.url}/icons/icon-512.png`,
        width: 512,
        height: 512,
      },
      sameAs: [site.githubUrl],
      founder: { "@id": `${site.url}/ueber-uns#oskar-kuiper` },
      ...(publicEmail ? { email: publicEmail } : {}),
    },
    {
      "@type": "Person",
      "@id": `${site.url}/ueber-uns#oskar-kuiper`,
      name: legalInfo.operatorName,
      url: `${site.url}/ueber-uns#oskar-kuiper`,
      jobTitle: "Gründer, Entwickler und Betreiber von Quoska",
      worksFor: { "@id": `${site.url}/#organization` },
    },
    {
      "@type": "WebSite",
      "@id": `${site.url}/#website`,
      url: site.url,
      name: site.name,
      alternateName: "Quoska Zeiterfassung",
      inLanguage: "de-DE",
      publisher: { "@id": `${site.url}/#organization` },
    },
  ],
};

export function SiteStructuredData() {
  return <JsonLd data={SITE_STRUCTURED_DATA} />;
}
