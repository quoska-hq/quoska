import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BellRing, Check, Coffee, History } from "lucide-react";
import {
  FactCard,
  GuideFaq,
  GuideNotice,
  SourceLink,
} from "@/components/marketing/guide-elements";
import {
  MarketingPageShell,
  SectionHeading,
} from "@/components/marketing/page-shell";
import { site } from "@/lib/site";

const PAGE_PATH = "/pausenregelung-arbeitszeit";
const UPDATED_DATE = "2026-08-19";
const ARBZG_SOURCE = "https://www.gesetze-im-internet.de/arbzg/__4.html";

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
    a: "§ 4 ArbZG verlangt eine tatsächliche Unterbrechung der Arbeit. Eine rechnerische Ergänzung kann einen Datensatz transparent vervollständigen, ersetzt aber nicht die Planung und das tatsächliche Nehmen der Ruhepause.",
  },
] as const;

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${site.url}${PAGE_PATH}#artikel`,
      headline: "Pausenregelung bei der Arbeitszeit: 6 Stunden, 9 Stunden und Mindestpausen",
      description:
        "Quellenbasierter Leitfaden zu Ruhepausen nach § 4 Arbeitszeitgesetz.",
      datePublished: UPDATED_DATE,
      dateModified: UPDATED_DATE,
      inLanguage: "de-DE",
      mainEntityOfPage: `${site.url}${PAGE_PATH}`,
      author: { "@id": `${site.url}/#organization` },
      publisher: { "@id": `${site.url}/#organization` },
      citation: [ARBZG_SOURCE],
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
  title: "Pausenregelung Arbeitszeit: 6 und 9 Stunden erklärt",
  description:
    "Pausenregelung nach § 4 ArbZG: Wann 30 oder 45 Minuten nötig sind, wie 15-Minuten-Blöcke funktionieren und was bei genau 6 Stunden gilt.",
  alternates: { canonical: PAGE_PATH },
};

export default function BreakRulesPage() {
  return (
    <MarketingPageShell
      eyebrow="Pausenregelung"
      title="Pausenregelung bei der Arbeitszeit: die Schwellen richtig lesen."
      intro="Mehr als sechs Stunden, mehr als neun Stunden und mindestens 15 Minuten je Pausenabschnitt: § 4 Arbeitszeitgesetz ist kurz, wird im Arbeitsalltag aber häufig ungenau wiedergegeben."
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20">
          <GuideNotice>
            <p>
              <strong>Stand 19. August 2026.</strong> Die Übersicht beschreibt
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

      <section className="bg-[#e7e3da]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
          <SectionHeading eyebrow="Mit Quoska" title="Pausen sichtbar im selben Zeitverlauf.">
            <p>
              Mitarbeitende starten und beenden Pausen direkt in der
              Stempeluhr. Optional kann Quoska beim Ausstempeln fehlende
              Mindestpausen transparent ergänzen; ergänzte Minuten werden
              gekennzeichnet, protokolliert und erklärt. Die tatsächliche Pause
              muss trotzdem genommen werden.
            </p>
          </SectionHeading>
          <div className="mt-12 grid border-l border-t border-slate-900/15 bg-white md:grid-cols-3">
            <FactCard number="01" title="Aktiv pausieren">
              <Coffee className="mb-4 size-5 text-[#5145ad]" />
              Start und Ende einer Pause werden als eigene Ereignisse erfasst.
            </FactCard>
            <FactCard number="02" title="Früh erkennen">
              <BellRing className="mb-4 size-5 text-[#5145ad]" />
              Hinweise und das Cockpit machen auffällige Pausen im laufenden
              Arbeitsalltag sichtbar.
            </FactCard>
            <FactCard number="03" title="Änderungen erklären">
              <History className="mb-4 size-5 text-[#5145ad]" />
              Automatische Ergänzungen und spätere Korrekturen erscheinen im
              Aktivitätsverlauf.
            </FactCard>
          </div>
          <div className="mt-8 flex flex-wrap gap-6 text-sm font-semibold">
            <Link href="/arbeitszeitnachweis" className="inline-flex items-center gap-2 text-slate-950 hover:text-[#5145ad]">
              Arbeitszeitnachweis ansehen <ArrowUpRight className="size-4" />
            </Link>
            <Link href="/funktionen" className="inline-flex items-center gap-2 text-slate-950 hover:text-[#5145ad]">
              Alle Funktionen <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section id="fragen" className="border-t border-slate-900/10 bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <SectionHeading eyebrow="Häufige Fragen" title="Die Schwellen ohne Rundungsfehler." />
          <GuideFaq items={FAQ} />
        </div>
      </section>

      <section className="border-t border-slate-900/10 bg-[#f5f3ee]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6">
          <h2 className="font-semibold text-slate-950">Amtliche Quelle</h2>
          <p className="mt-4 text-sm leading-7 text-slate-700">
            <SourceLink href={ARBZG_SOURCE}>§ 4 Arbeitszeitgesetz: Ruhepausen</SourceLink>
          </p>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600">
            Der Gesetzestext ist die Grundlage dieser Übersicht. Für Jugendliche,
            besondere Tätigkeiten, Tarifregelungen oder behördlich zugelassene
            Abweichungen können andere Vorschriften hinzukommen.
          </p>
        </div>
      </section>
    </MarketingPageShell>
  );
}
