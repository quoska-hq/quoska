import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * sitemap.xml — public, indexable routes only.
 * App/api/setup routes are disallowed in robots.ts and intentionally excluded here.
 * Dates change only after a significant update to that route's content. Do not
 * replace these with a build date: frequent false updates make `lastModified`
 * less useful to crawlers.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url;

  return [
    { url: base, lastModified: "2026-08-20" },
    { url: `${base}/funktionen`, lastModified: "2026-08-19" },
    { url: `${base}/ueber-uns`, lastModified: "2026-09-02" },
    { url: `${base}/browser-erweiterung`, lastModified: "2026-08-25" },
    { url: `${base}/preise`, lastModified: "2026-08-19" },
    { url: `${base}/sicherheit`, lastModified: "2026-08-11" },
    { url: `${base}/digitale-zeiterfassung`, lastModified: "2026-08-19" },
    { url: `${base}/zeiterfassung-kleinbetriebe`, lastModified: "2026-08-19" },
    {
      url: `${base}/arbeitszeiterfassung-pflicht-kleinbetriebe`,
      lastModified: "2026-08-14",
    },
    { url: `${base}/open-source-zeiterfassung`, lastModified: "2026-08-19" },
    { url: `${base}/arbeitszeitnachweis`, lastModified: "2026-08-19" },
    { url: `${base}/arbeitszeitwuensche`, lastModified: "2026-09-07" },
    { url: `${base}/pausenregelung-arbeitszeit`, lastModified: "2026-08-30" },
    { url: `${base}/projektzeiterfassung`, lastModified: "2026-08-19" },
    { url: `${base}/arbeitszeitrechner`, lastModified: "2026-08-20" },
    { url: `${base}/stundenzettel`, lastModified: "2026-08-20" },
    { url: `${base}/ueberstundenrechner`, lastModified: "2026-08-20" },
    { url: `${base}/monatsarbeitszeit-rechner`, lastModified: "2026-08-20" },
    { url: `${base}/alternativen`, lastModified: "2026-08-20" },
    { url: `${base}/alternativen/clockodo`, lastModified: "2026-08-20" },
    { url: `${base}/alternativen/clockin`, lastModified: "2026-08-20" },
    { url: `${base}/alternativen/crewmeister`, lastModified: "2026-08-20" },
  ];
}
