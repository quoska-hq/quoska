import { SectionHeading } from "@/components/marketing/page-shell";
import { SourceLink } from "./guide-components";
import { FAQ, SOURCES } from "./guide-data";

export function GuideFinalSections() {
  return (
    <>
      <section className="border-y border-slate-900/10 bg-[#f5f3ee]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <SectionHeading eyebrow="Kontrolle und Bußgelder" title="Keine pauschale 30.000-Euro-Antwort.">
            <p>
              Behörden der Länder überwachen Arbeitszeit- und Arbeitsschutz. Sie
              können Nachbesserungen verlangen und je nach Vorschrift Bußgelder verhängen.
            </p>
          </SectionHeading>
          <div className="space-y-6 text-sm leading-7 text-slate-700">
            <p>
              § 22 ArbZG nennt für bestimmte Verstöße — darunter fehlerhafte oder
              fehlende Aufzeichnungen nach § 16 Abs. 2 ArbZG — einen Bußgeldrahmen
              von bis zu 30.000 Euro. Nicht jede Lücke in der allgemeinen Erfassung
              wird deshalb automatisch mit diesem Betrag belegt.
            </p>
            <p>
              Laut BMAS beurteilen die zuständige Arbeitsschutzbehörde und im
              Streitfall die Gerichte den Einzelfall verbindlich. Höhe und Maßnahme
              hängen von der konkreten Pflichtverletzung und ihrer Schwere ab.
            </p>
            <div className="flex flex-wrap gap-x-7 gap-y-3 font-semibold">
              <SourceLink href={SOURCES.arbzg22}>§ 22 ArbZG</SourceLink>
              <SourceLink href={SOURCES.bmasFaq}>BMAS zur Kontrolle</SourceLink>
            </div>
          </div>
        </div>
      </section>

      <section id="fragen" className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <SectionHeading eyebrow="Häufige Fragen" title="Die wichtigsten Punkte kompakt.">
            <p>
              Antworten für kleine Arbeitgeber — mit der notwendigen Grenze
              zwischen allgemeiner Orientierung und Einzelfallprüfung.
            </p>
          </SectionHeading>
          <div className="border-t border-slate-900/15">
            {FAQ.map((item) => (
              <section key={item.q} className="border-b border-slate-900/15 py-6">
                <h2 className="font-semibold text-slate-950">{item.q}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-700">{item.a}</p>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-900/10 bg-[#e7e3da]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5145ad]">
            Quellen und Aktualisierung
          </p>
          <h2 className="mt-4 max-w-3xl font-serif text-3xl tracking-[-0.03em] text-slate-950">
            Auf amtliche Originalquellen gestützt.
          </h2>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-700">
            Zuletzt geprüft am 14. August 2026. Verwendet wurden Entscheidungen
            und Veröffentlichungen von EuGH, BAG und BMAS sowie die aktuell
            veröffentlichten Gesetzestexte. Bei einer Änderung wird neu geprüft.
          </p>
          <ul className="mt-7 grid gap-x-10 gap-y-3 text-sm font-semibold md:grid-cols-2">
            <li><SourceLink href={SOURCES.bag}>Bundesarbeitsgericht, 1 ABR 22/21</SourceLink></li>
            <li><SourceLink href={SOURCES.eugh}>EuGH, C-55/18 (CCOO)</SourceLink></li>
            <li><SourceLink href={SOURCES.bmasFaq}>BMAS: FAQ Arbeitszeiterfassung</SourceLink></li>
            <li><SourceLink href={SOURCES.arbeitsschutzgesetz}>§ 3 Arbeitsschutzgesetz</SourceLink></li>
            <li><SourceLink href={SOURCES.arbeitszeitgesetz}>Arbeitszeitgesetz</SourceLink></li>
            <li><SourceLink href={SOURCES.milog17}>§ 17 Mindestlohngesetz</SourceLink></li>
          </ul>
        </div>
      </section>
    </>
  );
}
