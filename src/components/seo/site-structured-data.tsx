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
      ...(publicEmail ? { email: publicEmail } : {}),
    },
    {
      "@type": "WebSite",
      "@id": `${site.url}/#website`,
      url: site.url,
      name: site.name,
      inLanguage: "de-DE",
      publisher: { "@id": `${site.url}/#organization` },
    },
  ],
};

export function SiteStructuredData() {
  return <JsonLd data={SITE_STRUCTURED_DATA} />;
}
