import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * robots.txt — allow public marketing + legal pages, keep the authenticated app,
 * the API, and the setup wizard out of the index.
 */
export default function robots(): MetadataRoute.Robots {
  const privatePaths = ["/app/", "/api/", "/setup"];

  return {
    rules: [
      {
        // Explicitly permit the major AI search, assistant, and model crawlers.
        // The wildcard below also keeps the file future-proof for new agents.
        userAgent: [
          "OAI-SearchBot",
          "ChatGPT-User",
          "GPTBot",
          "OAI-AdsBot",
          "ClaudeBot",
          "Claude-SearchBot",
          "Claude-User",
          "PerplexityBot",
          "Perplexity-User",
          "Google-Extended",
        ],
        allow: "/",
        disallow: privatePaths,
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: privatePaths,
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
