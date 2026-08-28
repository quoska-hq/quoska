import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BookOpenCheck, Code2, MessageCircle, ShieldCheck } from "lucide-react";
import { MarketingPageShell, SectionHeading } from "@/components/marketing/page-shell";
import { legalInfo, site } from "@/lib/site";

const PATH = "/ueber-uns";

export const metadata: Metadata = {
  title: "Über Quoska – Produkt, Betreiber und Redaktion",
  description:
    "Wer Quoska entwickelt, wie das Produkt betrieben wird und nach welchen Grundsätzen Ratgeber und Vergleiche recherchiert und aktualisiert werden.",
  alternates: { canonical: PATH },
  openGraph: {
    title: "Über Quoska – Produkt, Betreiber und Redaktion",
    description:
      "Offene Codebasis, transparenter Betrieb und nachvollziehbare redaktionelle Grundsätze.",
    url: PATH,
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": `${site.url}${PATH}#seite`,
  url: `${site.url}${PATH}`,
  name: "Über Quoska",
  inLanguage: "de-DE",
  about: { "@id": `${site.url}/#organization` },
  mainEntity: { "@id": `${site.url}/ueber-uns#oskar-kuiper` },
  isPartOf: { "@id": `${site.url}/#website` },
};

const EDITORIAL_PRINCIPLES = [
  {
    icon: BookOpenCheck,
    title: "Primärquellen zuerst",
    body: "Rechtsratgeber verweisen möglichst direkt auf Gesetze, Gerichte und zuständige Behörden. Sekundärquellen ersetzen diese Grundlage nicht.",
  },
  {
    icon: ShieldCheck,
    title: "Geltendes und Geplantes trennen",
    body: "Bestehende Pflichten, politische Vorhaben und praktische Empfehlungen werden ausdrücklich auseinandergehalten.",
  },
  {
    icon: MessageCircle,
    title: "Korrekturen offen annehmen",
    body: "Hinweise auf veraltete Quellen oder unklare Formulierungen können direkt an die öffentliche Support-Adresse geschickt werden.",
  },
] as const;

export default function AboutPage() {
  return (
    <MarketingPageShell
      eyebrow="Über Quoska"
      title="Ein kleines Produkt mit einer überprüfbaren Grundlage."
      intro="Quoska wird von Oskar Kuiper entwickelt und betrieben. Produktcode, technische Entscheidungen und zentrale Aussagen der Ratgeber sollen so weit wie möglich nachvollziehbar sein."
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      <section id="oskar-kuiper" className="bg-white scroll-mt-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <SectionHeading eyebrow="Betreiber" title={legalInfo.operatorName}>
            <p>
              Oskar ist Gründer, Entwickler und Betreiber von Quoska. Er
              verantwortet die Anwendung, die öffentliche Dokumentation und die
              redaktionellen Inhalte dieser Website.
            </p>
          </SectionHeading>
          <div className="border-t-2 border-slate-950 pt-6 text-sm leading-7 text-slate-700">
            <p>
              Quoska ist als fokussierte Zeiterfassung für kleine deutsche
              Betriebe entstanden: tägliche Buchungen sollen einfach bleiben,
              während Korrekturen, Rollen und technische Datengrenzen sichtbar
              und prüfbar sind.
            </p>
            <p className="mt-5">
              Arbeitsrechtliche Beiträge sind allgemeine Informationen und
              keine individuelle Rechtsberatung. Wo eine Frage vom Einzelfall,
              einem Tarifvertrag oder einer Branchenregel abhängt, wird diese
              Grenze benannt.
            </p>
            <div className="mt-7 flex flex-wrap gap-x-7 gap-y-3 font-semibold text-slate-950">
              <a href={site.githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-[#5145ad]">
                Quellcode und Historie <ArrowUpRight className="size-4" />
              </a>
              <a href={`mailto:${legalInfo.email}`} className="inline-flex items-center gap-2 hover:text-[#5145ad]">
                Redaktion kontaktieren <ArrowUpRight className="size-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-900/10 bg-[#e7e3da]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
          <SectionHeading eyebrow="Redaktion" title="So entstehen Ratgeber und Vergleiche.">
            <p>
              Aktualität ist bei Arbeitszeitregeln und Softwarepreisen wichtiger
              als ein möglichst langer Text. Deshalb nennen die Seiten ihren
              Quellenstand und verlinken die überprüften Grundlagen.
            </p>
          </SectionHeading>
          <div className="mt-12 grid border-l border-t border-slate-900/15 bg-white md:grid-cols-3">
            {EDITORIAL_PRINCIPLES.map(({ icon: Icon, title, body }) => (
              <article key={title} className="border-b border-r border-slate-900/15 p-7">
                <Icon className="size-5 text-[#5145ad]" />
                <h2 className="mt-5 text-lg font-semibold text-slate-950">{title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <SectionHeading eyebrow="Nachprüfbar" title="Produktversprechen bis zum Code verfolgen.">
            <p>
              Die verwaltete Cloud-Version und das öffentliche Repository nutzen
              dieselbe Anwendungscodebasis.
            </p>
          </SectionHeading>
          <div className="space-y-5">
            <TrustLink icon={Code2} href="/open-source-zeiterfassung" title="Open-Source- und Self-Hosting-Modell">
              Lizenz, Betriebswege und technische Voraussetzungen im Überblick.
            </TrustLink>
            <TrustLink icon={ShieldCheck} href="/sicherheit" title="Sicherheit und Datenverarbeitung">
              Hosting-Regionen, Zugriffsschutz und nachvollziehbare Änderungen.
            </TrustLink>
            <TrustLink icon={BookOpenCheck} href="/arbeitszeiterfassung-pflicht-kleinbetriebe" title="Quellenbasierter Rechtsratgeber">
              Aktuelle Pflicht, Form und Aufbewahrung mit amtlichen Belegen.
            </TrustLink>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}

function TrustLink({
  icon: Icon,
  href,
  title,
  children,
}: {
  icon: typeof Code2;
  href: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="group flex gap-5 border border-slate-900/15 bg-[#f5f3ee] p-6 hover:border-[#5145ad]">
      <Icon className="mt-1 size-5 shrink-0 text-[#5145ad]" />
      <span>
        <span className="font-semibold text-slate-950 group-hover:text-[#5145ad]">{title}</span>
        <span className="mt-2 block text-sm leading-6 text-slate-600">{children}</span>
      </span>
    </Link>
  );
}
