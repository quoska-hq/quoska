import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Clock3, FileCheck2, History } from "lucide-react";
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

const PAGE_PATH = "/arbeitszeitnachweis";
const UPDATED_DATE = "2026-08-19";

const SOURCES = {
  bmasFaq:
    "https://www.bmas.de/DE/Arbeit/Arbeitsrecht/Arbeitnehmerrechte/Regelungen-zur-Arbeitszeit/Fragen-und-Antworten/faq-arbeitszeiterfassung.html",
  bag: "https://www.bundesarbeitsgericht.de/entscheidung/1-abr-22-21/",
  arbzg16: "https://www.gesetze-im-internet.de/arbzg/__16.html",
  milog17: "https://www.gesetze-im-internet.de/milog/__17.html",
} as const;

const FAQ = [
  {
    q: "Gibt es einen einheitlichen amtlichen Arbeitszeitnachweis?",
    a: "Nein. Für die allgemeine Arbeitszeiterfassung besteht derzeit keine einheitliche Formvorschrift. Je nach Tätigkeit, Branche, Tarifvertrag oder Sonderregel können jedoch zusätzliche Anforderungen gelten.",
  },
  {
    q: "Welche Angaben sollte ein Arbeitszeitnachweis enthalten?",
    a: "Nach der aktuellen Einordnung des BMAS müssen Beginn, Ende und Dauer der täglichen Arbeitszeit nachvollziehbar sein. Datum, Pausen und dokumentierte Korrekturen helfen dabei, die Nettoarbeitszeit überprüfbar zu machen.",
  },
  {
    q: "Muss ein Arbeitszeitnachweis unterschrieben werden?",
    a: "Die hier dargestellten allgemeinen Regeln schreiben keine pauschale Unterschrift für jeden Tagesnachweis vor. Arbeitsvertragliche, tarifliche oder branchenspezifische Vorgaben können darüber hinausgehen.",
  },
  {
    q: "Wie lange müssen Arbeitszeitnachweise aufbewahrt werden?",
    a: "Eine einheitliche Frist für jede allgemeine Arbeitszeitaufzeichnung ist derzeit nicht festgelegt. Für Nachweise nach § 16 Absatz 2 ArbZG und für besondere Aufzeichnungen nach § 17 MiLoG gelten mindestens zwei Jahre.",
  },
] as const;

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${site.url}${PAGE_PATH}#artikel`,
      headline: "Arbeitszeitnachweis 2026: Inhalt, Fristen und Beispiel",
      description:
        "Quellenbasierter Leitfaden zu Inhalt, Form und Aufbewahrung von Arbeitszeitnachweisen in Deutschland.",
      datePublished: UPDATED_DATE,
      dateModified: UPDATED_DATE,
      inLanguage: "de-DE",
      mainEntityOfPage: `${site.url}${PAGE_PATH}`,
      author: { "@id": `${site.url}/#organization` },
      publisher: { "@id": `${site.url}/#organization` },
      citation: Object.values(SOURCES),
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
  title: "Arbeitszeitnachweis 2026: Inhalt, Fristen und Beispiel",
  description:
    "Arbeitszeitnachweis richtig führen: Welche Angaben wichtig sind, welche Zwei-Jahres-Fristen gelten und wie ein nachvollziehbarer Nachweis aussieht.",
  alternates: { canonical: PAGE_PATH },
};

const PRACTICAL_FIELDS = [
  ["01", "Arbeitstag", "Das Kalenderdatum ordnet Beginn, Ende und Dauer eindeutig zu."],
  ["02", "Arbeitsbeginn", "Der tatsächliche Beginn der täglichen Arbeitszeit."],
  ["03", "Arbeitsende", "Das tatsächliche Ende, bei Bedarf mit Kennzeichnung des Folgetags."],
  ["04", "Pausen", "Genommene Unterbrechungen machen die berechnete Nettoarbeitszeit prüfbar."],
  ["05", "Tägliche Dauer", "Die Arbeitszeit nach Abzug der berücksichtigten Pausen."],
  ["06", "Korrekturverlauf", "Nachträge sollten Grund, alten Wert, neuen Wert und Bearbeitung erkennen lassen."],
] as const;

export default function WorkTimeRecordPage() {
  return (
    <MarketingPageShell
      eyebrow="Arbeitszeitnachweis"
      title="Arbeitszeitnachweis: nachvollziehbar statt nur ausgefüllt."
      intro="Ein Arbeitszeitnachweis soll erkennen lassen, wann die tägliche Arbeit begonnen und geendet hat und wie sich ihre Dauer ergibt. Dieser Leitfaden trennt die allgemeine Erfassungspflicht von besonderen Aufbewahrungs- und Dokumentationsregeln."
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20">
          <GuideNotice>
            <p>
              <strong>Stand 19. August 2026.</strong> Diese Übersicht bietet
              allgemeine Informationen und keine Rechtsberatung für den
              Einzelfall. Verbindliche Entscheidungen treffen die zuständigen
              Behörden und Gerichte.
            </p>
          </GuideNotice>

          <div className="mt-10 grid border-l border-t border-slate-900/15 md:grid-cols-3">
            <FactCard number="01" title="Beginn, Ende und Dauer">
              Das BMAS nennt diese drei Angaben als Kern der täglichen
              Arbeitszeitdokumentation.
            </FactCard>
            <FactCard number="02" title="Derzeit formoffen">
              Für die allgemeine Aufzeichnung besteht aktuell keine
              Formvorschrift; sie kann laut BMAS auch handschriftlich erfolgen.
            </FactCard>
            <FactCard number="03" title="Verantwortung bleibt">
              Die Erfassung kann delegiert werden. Für die Organisation und die
              öffentlich-rechtlichen Vorgaben bleibt der Arbeitgeber
              verantwortlich.
            </FactCard>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-900/10 bg-[#e7e3da]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
          <SectionHeading
            eyebrow="Inhalt"
            title="Sechs Bausteine für einen prüfbaren Nachweis."
          >
            <p>
              Gesetzliche Mindestangaben und ein praktisch nachvollziehbarer
              Datensatz sind nicht immer deckungsgleich. Die folgenden Felder
              machen Berechnung und spätere Korrekturen verständlich.
            </p>
          </SectionHeading>
          <div className="mt-12 grid border-l border-t border-slate-900/15 bg-white md:grid-cols-2 lg:grid-cols-3">
            {PRACTICAL_FIELDS.map(([number, title, body]) => (
              <FactCard key={number} number={number} title={title}>
                {body}
              </FactCard>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
          <SectionHeading
            eyebrow="Aufbewahrung"
            title="Nicht jede Frist stammt aus derselben Regel."
          >
            <p>
              Der allgemeine Systemauftrag aus der BAG-Entscheidung ist von den
              besonderen Nachweispflichten des Arbeitszeit- und
              Mindestlohngesetzes zu unterscheiden.
            </p>
          </SectionHeading>

          <div className="mt-10 overflow-x-auto border border-slate-900/15">
            <table className="min-w-[760px] w-full text-left text-sm leading-6">
              <thead className="bg-[#f5f3ee] text-slate-950">
                <tr>
                  <th className="p-4 font-semibold">Grundlage</th>
                  <th className="p-4 font-semibold">Was sie betrifft</th>
                  <th className="p-4 font-semibold">Zeitpunkt / Frist</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                <tr className="border-t border-slate-900/15 align-top">
                  <th className="p-4 font-semibold text-slate-950">BAG / ArbSchG</th>
                  <td className="p-4">System zur Erfassung der gesamten täglichen Arbeitszeit</td>
                  <td className="p-4">Derzeit keine einheitliche allgemeine Aufbewahrungsfrist festgelegt</td>
                </tr>
                <tr className="border-t border-slate-900/15 align-top">
                  <th className="p-4 font-semibold text-slate-950">§ 16 Abs. 2 ArbZG</th>
                  <td className="p-4">Arbeitszeit über die werktägliche Arbeitszeit des § 3 Satz 1 hinaus</td>
                  <td className="p-4">Mindestens zwei Jahre aufbewahren</td>
                </tr>
                <tr className="border-t border-slate-900/15 align-top">
                  <th className="p-4 font-semibold text-slate-950">§ 17 MiLoG</th>
                  <td className="p-4">Bestimmte geringfügig Beschäftigte und genannte Wirtschaftsbereiche</td>
                  <td className="p-4">Bis zum siebten folgenden Kalendertag erfassen; mindestens zwei Jahre aufbewahren</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-900/10 bg-[#f5f3ee]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <SectionHeading eyebrow="Beispiel" title="Ein Arbeitstag auf einen Blick.">
            <p>
              Das Beispiel zeigt keine amtliche Vorlage, sondern eine klare
              Darstellung, aus der die Nettoarbeitszeit rechnerisch hervorgeht.
            </p>
          </SectionHeading>
          <div className="overflow-x-auto border border-slate-900/15 bg-white">
            <table className="min-w-[620px] w-full text-sm">
              <thead className="bg-[#e7e3da] text-left text-slate-950">
                <tr>
                  {['Datum', 'Beginn', 'Ende', 'Pause', 'Dauer', 'Status'].map((label) => (
                    <th key={label} className="p-4 font-semibold">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-900/15 text-slate-700">
                  <td className="p-4">19.08.2026</td>
                  <td className="p-4">08:00</td>
                  <td className="p-4">16:30</td>
                  <td className="p-4">00:30</td>
                  <td className="p-4 font-semibold text-slate-950">08:00</td>
                  <td className="p-4">Bestätigt</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="bg-[#e7e3da]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
          <SectionHeading eyebrow="Mit Quoska" title="Vom Stempelvorgang zum Nachweis.">
            <p>
              Quoska verbindet die tägliche Erfassung mit einem sichtbaren
              Korrekturweg. Das unterstützt die Dokumentation, ersetzt aber
              nicht die Prüfung der Regeln, die für den konkreten Betrieb gelten.
            </p>
          </SectionHeading>
          <div className="mt-12 grid gap-px border border-slate-900/15 bg-slate-900/15 md:grid-cols-3">
            {[
              [Clock3, "Serverseitige Zeitstempel", "Beginn, Pause und Ende entstehen unabhängig von der veränderbaren Geräteuhr."],
              [History, "Begründete Korrekturen", "Alter und neuer Wert, Grund und Bearbeitung bleiben im Aktivitätsverlauf sichtbar."],
              [FileCheck2, "Berichte und CSV", "Zeiträume lassen sich prüfen und als strukturierte Daten für die weitere Verarbeitung exportieren."],
            ].map(([Icon, title, body]) => {
              const ItemIcon = Icon as typeof Clock3;
              return (
                <article key={title as string} className="bg-white p-7">
                  <ItemIcon className="size-5 text-[#5145ad]" />
                  <h3 className="mt-6 font-semibold text-slate-950">{title as string}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{body as string}</p>
                </article>
              );
            })}
          </div>
          <div className="mt-8 flex flex-wrap gap-6 text-sm font-semibold">
            <Link href="/stundenzettel" className="inline-flex items-center gap-2 text-slate-950 hover:text-[#5145ad]">
              Stundenzettel kostenlos ausfüllen <ArrowUpRight className="size-4" />
            </Link>
            <Link href="/funktionen" className="inline-flex items-center gap-2 text-slate-950 hover:text-[#5145ad]">
              Funktionen ansehen <ArrowUpRight className="size-4" />
            </Link>
            <Link href="/pausenregelung-arbeitszeit" className="inline-flex items-center gap-2 text-slate-950 hover:text-[#5145ad]">
              Pausenregelung verstehen <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section id="fragen" className="border-t border-slate-900/10 bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <SectionHeading eyebrow="Häufige Fragen" title="Form, Inhalt und Fristen eingeordnet." />
          <GuideFaq items={FAQ} />
        </div>
      </section>

      <section className="border-t border-slate-900/10 bg-[#f5f3ee]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6">
          <h2 className="font-semibold text-slate-950">Amtliche Quellen</h2>
          <ul className="mt-5 grid gap-3 text-sm leading-6 text-slate-700 md:grid-cols-2">
            <li><SourceLink href={SOURCES.bmasFaq}>BMAS: Fragen und Antworten zur Arbeitszeiterfassung</SourceLink></li>
            <li><SourceLink href={SOURCES.bag}>BAG: Beschluss 1 ABR 22/21</SourceLink></li>
            <li><SourceLink href={SOURCES.arbzg16}>§ 16 ArbZG: Arbeitszeitnachweise</SourceLink></li>
            <li><SourceLink href={SOURCES.milog17}>§ 17 MiLoG: besondere Dokumentationspflichten</SourceLink></li>
          </ul>
          <Link href="/arbeitszeiterfassung-pflicht-kleinbetriebe" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-slate-950 hover:text-[#5145ad]">
            Vollständige Einordnung der Erfassungspflicht <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </section>
    </MarketingPageShell>
  );
}
