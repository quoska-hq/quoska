import type { Metadata } from "next";
import { Check } from "lucide-react";
import {
  FactCard,
  GuideAuthor,
  GuideFaq,
  GuideNotice,
  SourceLink,
} from "@/components/marketing/guide-elements";
import {
  MarketingPageShell,
  SectionHeading,
} from "@/components/marketing/page-shell";
import { site } from "@/lib/site";
import {
  AutomaticBreakExplanationSection,
  QuoskaBreakAutomationSection,
} from "./automatic-break-sections";

const PAGE_PATH = "/pausenregelung-arbeitszeit";
const PUBLISHED_DATE = "2026-08-19";
const UPDATED_DATE = "2026-08-30";
const SEO_TITLE = "Automatischer Pausenabzug: Regeln und Quoska-Pause";
const SEO_DESCRIPTION =
  "Automatischer Pausenabzug verständlich erklärt: Pausen nach § 4 ArbZG, BAG-Urteil 5 AZR 51/24 und die optionale Quoska-Pausenautomatik.";
const ARBZG_SOURCE = "https://www.gesetze-im-internet.de/arbzg/__4.html";
const BAG_SOURCE = "https://www.bundesarbeitsgericht.de/entscheidung/5-azr-51-24/";
const ANWALT_DE_SOURCE = "https://www.anwalt.de/rechtstipps/pause-du-hast-das-recht-auf-auszeit-231648.html";

const FAQ = [
  {
    q: "Ist bei genau sechs Stunden Arbeitszeit eine Pause vorgeschrieben?",
    a: "§ 4 ArbZG nennt die 30-minütige Mindestpause bei mehr als sechs Stunden. Gleichzeitig dürfen Arbeitnehmer nicht länger als sechs Stunden hintereinander ohne Ruhepause beschäftigt werden. Soll die Arbeit nach sechs Stunden weitergehen, muss sie daher durch eine Pause unterbrochen werden.",
  },
  {
    q: "Wie viel Pause ist bei acht Stunden Arbeitszeit erforderlich?",
    a: "Bei mehr als sechs und bis zu neun Stunden Arbeitszeit sind insgesamt mindestens 30 Minuten Ruhepause vorgesehen.",
  },
  {
    q: "Wie viel Pause ist bei mehr als neun Stunden erforderlich?",
    a: "Bei mehr als neun Stunden Arbeitszeit sind insgesamt mindestens 45 Minuten Ruhepause vorgesehen.",
  },
  {
    q: "Darf die Pause aufgeteilt werden?",
    a: "Ja. Die gesetzliche Ruhepause kann in Zeitabschnitte von jeweils mindestens 15 Minuten aufgeteilt werden.",
  },
  {
    q: "Reicht ein automatischer Pausenabzug?",
    a: "Nein. § 4 ArbZG verlangt eine tatsächliche Unterbrechung der Arbeit. Auch das BAG stellte im Urteil 5 AZR 51/24 klar, dass ein automatischer Abzug für sich nicht zeigt, ob wirklich pausiert oder durchgearbeitet wurde. Eine rechnerische Ergänzung kann einen Datensatz transparent kennzeichnen, ersetzt aber weder die Pausenorganisation noch die tatsächliche Erholung.",
  },
  {
    q: "Wie funktioniert die automatische Pause in Quoska?",
    a: "Wenn die Option aktiviert ist, ergänzt Quoska beim Abschluss eines Zeiteintrags fehlende Minuten bis zur hinterlegten Mindestpause. Die automatisch ergänzten Minuten bleiben vom manuell erfassten Anteil unterscheidbar, werden protokolliert und der betroffenen Person mitgeteilt. Administratoren können die Funktion in den Einstellungen für das Team ausschalten.",
  },
  {
    q: "Wann erscheint der Pausenhinweis im Quoska-Cockpit?",
    a: "Der Hinweis erscheint, wenn bei einer Person innerhalb der letzten sieben Kalendertage an mindestens fünf abgeschlossenen Tagen mit mehr als sechs Stunden keine Pause manuell erfasst wurde. Er ist ein Anlass, die tatsächlichen Pausen und den betrieblichen Ablauf gemeinsam zu prüfen – keine automatische Feststellung eines Rechtsverstoßes.",
  },
] as const;

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${site.url}${PAGE_PATH}#artikel`,
      headline: SEO_TITLE,
      description: SEO_DESCRIPTION,
      datePublished: PUBLISHED_DATE,
      dateModified: UPDATED_DATE,
      inLanguage: "de-DE",
      mainEntityOfPage: `${site.url}${PAGE_PATH}`,
      isPartOf: { "@id": `${site.url}/#website` },
      author: { "@id": `${site.url}/ueber-uns#oskar-kuiper` },
      publisher: { "@id": `${site.url}/#organization` },
      articleSection: "Arbeitszeit und Pausen",
      about: [
        { "@type": "Thing", name: "Automatischer Pausenabzug" },
        { "@type": "Thing", name: "Pausenregelung nach § 4 ArbZG" },
        { "@type": "SoftwareApplication", name: "Quoska" },
      ],
      citation: [ARBZG_SOURCE, BAG_SOURCE, ANWALT_DE_SOURCE],
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${site.url}${PAGE_PATH}#brotkrumen`,
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
          name: "Automatischer Pausenabzug",
          item: `${site.url}${PAGE_PATH}`,
        },
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${site.url}${PAGE_PATH}#fragen`,
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ],
};

export const metadata: Metadata = {
  title: SEO_TITLE,
  description: SEO_DESCRIPTION,
  authors: [{ name: "Oskar Kuiper", url: "/ueber-uns#oskar-kuiper" }],
  alternates: { canonical: PAGE_PATH },
  openGraph: {
    type: "article",
    locale: "de_DE",
    url: PAGE_PATH,
    siteName: site.name,
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
    publishedTime: PUBLISHED_DATE,
    modifiedTime: UPDATED_DATE,
    authors: [`${site.url}/ueber-uns#oskar-kuiper`],
    section: "Arbeitszeit und Pausen",
    tags: ["Automatischer Pausenabzug", "Pausenregelung", "Arbeitszeitgesetz"],
  },
  twitter: {
    card: "summary_large_image",
    title: SEO_TITLE,
    description: SEO_DESCRIPTION,
  },
};

export default function BreakRulesPage() {
  return (
    <MarketingPageShell
      eyebrow="Pausenregelung"
      title="Automatischer Pausenabzug und Pausenregelung: Was wirklich zählt."
      intro="Mehr als sechs Stunden, mehr als neun Stunden und mindestens 15 Minuten je Pausenabschnitt: Dieser Leitfaden erklärt § 4 Arbeitszeitgesetz, die Grenzen automatischer Abzüge und die optionale Quoska-Pausenautomatik."
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <GuideAuthor
        reviewedOn="30. August 2026"
        reviewedOnIso={UPDATED_DATE}
        sourceCount={3}
        sourceLabel="drei geprüfte Quellen, darunter zwei Primärquellen"
      />

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20">
          <GuideNotice>
            <p>
              <strong>Stand 30. August 2026.</strong> Die Übersicht beschreibt
              die allgemeine Regel des § 4 ArbZG und ist keine Rechtsberatung.
              Tarifverträge, Sonderregelungen und der konkrete Einzelfall können
              zusätzliche Anforderungen enthalten.
            </p>
          </GuideNotice>
          <div className="mt-10 grid border-l border-t border-slate-900/15 md:grid-cols-3">
            <FactCard number="01" title="Bis einschließlich 6 Stunden">
              § 4 ArbZG sieht noch keine gesetzliche Mindestpause vor. Länger
              als sechs Stunden am Stück darf jedoch nicht ohne Pause gearbeitet
              werden.
            </FactCard>
            <FactCard number="02" title="Mehr als 6 bis 9 Stunden">
              Die Arbeit ist durch Ruhepausen von insgesamt mindestens 30
              Minuten zu unterbrechen.
            </FactCard>
            <FactCard number="03" title="Mehr als 9 Stunden">
              Die gesetzliche Mindestpause beträgt insgesamt 45 Minuten.
            </FactCard>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-900/10 bg-[#e7e3da]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <SectionHeading eyebrow="Wortlaut" title="Drei Details entscheiden.">
            <p>
              Die Schwellen beziehen sich auf die Arbeitszeit, nicht einfach auf
              die Anwesenheit zwischen Kommen und Gehen.
            </p>
          </SectionHeading>
          <div className="space-y-6">
            {[
              ["Mehr als", "Die 30-Minuten-Stufe beginnt erst, wenn die Arbeitszeit sechs Stunden überschreitet. Wer weiterarbeitet, muss vorher unterbrechen."],
              ["Im Voraus feststehend", "Ruhepausen müssen geplant oder jedenfalls nach einem verlässlichen Rahmen bestimmbar sein; bloße zufällige Leerlaufzeit ist nicht dasselbe."],
              ["Mindestens 15 Minuten", "Die Gesamtpause darf aufgeteilt werden, aber jeder angerechnete Abschnitt muss mindestens 15 Minuten dauern."],
            ].map(([title, body]) => (
              <article key={title} className="border-t-2 border-slate-950 pt-5">
                <h3 className="font-semibold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-700">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
          <SectionHeading eyebrow="Beispiele" title="Von Anwesenheit zu Nettoarbeitszeit.">
            <p>
              Die Beispiele setzen normale erwachsene Beschäftigte ohne
              abweichende Sonderregel voraus.
            </p>
          </SectionHeading>
          <div className="mt-10 overflow-x-auto border border-slate-900/15">
            <table className="min-w-[720px] w-full text-left text-sm leading-6">
              <thead className="bg-[#f5f3ee] text-slate-950">
                <tr>
                  <th className="p-4 font-semibold">Zeitraum</th>
                  <th className="p-4 font-semibold">Pause</th>
                  <th className="p-4 font-semibold">Arbeitszeit</th>
                  <th className="p-4 font-semibold">Einordnung nach § 4 ArbZG</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {[
                  ["08:00–14:00", "0 Min.", "6:00 Std.", "Keine Mindestpause; keine weitere Arbeit ohne Unterbrechung"],
                  ["08:00–16:30", "30 Min.", "8:00 Std.", "30 Minuten Mindestpause erreicht"],
                  ["08:00–18:00", "45 Min.", "9:15 Std.", "45 Minuten Mindestpause erreicht"],
                ].map((row) => (
                  <tr key={row[0]} className="border-t border-slate-900/15 align-top">
                    {row.map((cell, index) => (
                      <td key={cell} className={`p-4 ${index === 2 ? "font-semibold text-slate-950" : ""}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-900/10 bg-[#f5f3ee]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
          <SectionHeading eyebrow="Betrieblicher Ablauf" title="Pausen müssen nicht nur gerechnet werden.">
            <p>
              Ein verlässlicher Ablauf verbindet die tatsächliche Unterbrechung
              mit einer nachvollziehbaren Dokumentation.
            </p>
          </SectionHeading>
          <ul className="mt-10 grid gap-px border border-slate-900/15 bg-slate-900/15 md:grid-cols-2">
            {[
              "Pausenregel und Zuständigkeit vorab kommunizieren",
              "Beginn und Ende der Pause tatsächlich erfassen",
              "15-Minuten-Mindestblöcke bei geteilten Pausen berücksichtigen",
              "Fehlende oder falsche Angaben über einen sichtbaren Korrekturweg klären",
            ].map((item) => (
              <li key={item} className="flex gap-3 bg-white p-6 text-sm leading-7 text-slate-700">
                <Check className="mt-1 size-4 shrink-0 text-[#5145ad]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <AutomaticBreakExplanationSection />
      <QuoskaBreakAutomationSection />

      <section id="fragen" className="border-t border-slate-900/10 bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <SectionHeading eyebrow="Häufige Fragen" title="Die Schwellen ohne Rundungsfehler." />
          <GuideFaq items={FAQ} />
        </div>
      </section>

      <section className="border-t border-slate-900/10 bg-[#f5f3ee]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6">
          <h2 className="font-semibold text-slate-950">Quellen und Vertiefung</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
            <li><SourceLink href={ARBZG_SOURCE}>§ 4 Arbeitszeitgesetz: Ruhepausen</SourceLink></li>
            <li><SourceLink href={BAG_SOURCE}>Bundesarbeitsgericht, Urteil vom 12. Februar 2025 – 5 AZR 51/24</SourceLink></li>
            <li><SourceLink href={ANWALT_DE_SOURCE}>anwalt.de: „PAUSE – du hast das Recht auf Auszeit!“</SourceLink></li>
          </ul>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600">
            Der Gesetzestext und die BAG-Entscheidung sind die Primärquellen;
            der anwalt.de-Beitrag dient als ergänzender Überblick. Für Jugendliche,
            besondere Tätigkeiten, Tarifregelungen oder behördlich zugelassene
            Abweichungen können weitere Vorschriften hinzukommen.
          </p>
        </div>
      </section>
    </MarketingPageShell>
  );
}
