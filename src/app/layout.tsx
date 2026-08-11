import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { site } from "@/lib/site";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Quoska — Zeiterfassung für deutsche KMU",
    template: "%s | Quoska",
  },
  description:
    "Arbeitszeiten, Pausen, Korrekturen und Auswertungen für deutsche Betriebe — übersichtlich und ohne komplizierte Einführung.",
  applicationName: site.name,
  manifest: "/manifest.json",
  authors: [{ name: site.name }],
  creator: site.name,
  publisher: site.name,
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: site.url,
    siteName: site.name,
    title: "Quoska — Zeiterfassung für deutsche KMU",
    description:
      "Arbeitszeit erfassen, Pausen dokumentieren und Auswertungen erstellen.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Quoska — Zeiterfassung für deutsche KMU",
    description:
      "Arbeitszeit erfassen, Pausen dokumentieren und Auswertungen erstellen.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: site.name,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f3ee",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="de"
      data-scroll-behavior="smooth"
      className={cn("h-full antialiased", "font-sans", inter.variable)}
    >
      <head>
        <link rel="icon" href="/icons/favicon-32.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" sizes="180x180" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        {/* Service worker registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
