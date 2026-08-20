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
    { url: base, lastModified: "2026-08-14" },
    { url: `${base}/funktionen`, lastModified: "2026-08-19" },
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
    { url: `${base}/pausenregelung-arbeitszeit`, lastModified: "2026-08-19" },
    { url: `${base}/projektzeiterfassung`, lastModified: "2026-08-19" },
    { url: `${base}/arbeitszeitrechner`, lastModified: "2026-08-20" },
    { url: `${base}/stundenzettel`, lastModified: "2026-08-20" },
    { url: `${base}/ueberstundenrechner`, lastModified: "2026-08-20" },
    { url: `${base}/monatsarbeitszeit-rechner`, lastModified: "2026-08-20" },
    { url: `${base}/agb`, lastModified: "2026-08-11" },
    { url: `${base}/datenschutz`, lastModified: "2026-08-12" },
    { url: `${base}/impressum`, lastModified: "2026-08-11" },
    { url: `${base}/widerruf`, lastModified: "2026-06-20" },
  ];
}
