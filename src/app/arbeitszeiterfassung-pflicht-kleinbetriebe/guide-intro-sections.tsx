import { Clock3, FileCheck2, Scale } from "lucide-react";
import { SectionHeading } from "@/components/marketing/page-shell";
import { LegalPoint, LegalStep, RecordCard, SourceLink } from "./guide-components";
import { SOURCES } from "./guide-data";

export function GuideIntroSections() {
  return (
    <>
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20">
          <div className="border-l-4 border-[#5145ad] bg-[#f5f3ee] p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5145ad]">
              Kurzantwort
            </p>
            <h2 className="mt-4 max-w-3xl font-serif text-3xl leading-tight tracking-[-0.03em] text-slate-950 sm:text-4xl">
              Die Pflicht gilt schon heute. Elektronisch muss die allgemeine
              Erfassung noch nicht zwingend sein.
            </h2>
            <div className="mt-7 grid gap-5 text-sm leading-7 text-slate-700 md:grid-cols-2">
              <p>
                Das Bundesarbeitsgericht hat 2022 entschieden, dass Arbeitgeber
                ein System einführen und tatsächlich nutzen müssen, das die
                gesamte tägliche Arbeitszeit erfasst. Das gilt grundsätzlich
                auch für kleine Betriebe; eine pauschale Ausnahme nach
                Beschäftigtenzahl gibt es nicht.
              </p>
              <p>
                Das System muss objektiv, verlässlich und zugänglich sein. Die
                konkrete Form ist derzeit nicht allgemein vorgeschrieben:
                Papier kann genügen, eine gut eingeführte digitale Lösung ist
                im Alltag aber oft leichter zu prüfen.
              </p>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold">
              <SourceLink href={SOURCES.bag}>BAG, 1 ABR 22/21</SourceLink>
              <SourceLink href={SOURCES.bmasFaq}>BMAS-Fragen und Antworten</SourceLink>
            </div>
          </div>
          <p className="mt-6 max-w-4xl text-xs leading-6 text-slate-600">
            Dieser Beitrag bietet eine allgemeine Orientierung und keine
            Rechtsberatung für den Einzelfall. Tarifverträge,
            Betriebsvereinbarungen, Branchenregeln und die konkrete Tätigkeit
            können zu abweichenden Anforderungen führen.
          </p>
        </div>
      </section>

      <section className="border-y border-slate-900/10 bg-[#e7e3da]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <SectionHeading eyebrow="Rechtslage" title="Drei Schritte zur heutigen Pflicht.">
            <p>
              Die allgemeine Pflicht steht noch nicht als ausformulierte
              Komplettregel im Arbeitszeitgesetz. Sie ergibt sich aus dem
              Zusammenspiel von EU-Recht, der BAG-Entscheidung und dem
              Arbeitsschutzgesetz.
            </p>
          </SectionHeading>
          <div className="grid border-l border-t border-slate-900/15 bg-white md:grid-cols-3">
            <LegalStep icon={Scale} year="2019" title="EuGH" source={SOURCES.eugh}>
              Die Mitgliedstaaten müssen ein objektives, verlässliches und
              zugängliches System zur Messung der täglichen Arbeitszeit sicherstellen.
            </LegalStep>
            <LegalStep
              icon={FileCheck2}
              year="2022"
              title="Bundesarbeitsgericht"
              source={SOURCES.bag}
            >
              Das BAG leitet aus § 3 Abs. 2 Nr. 1 ArbSchG eine bereits bestehende
              Pflicht zur Einrichtung und Nutzung eines solchen Systems ab.
            </LegalStep>
            <LegalStep
              icon={Clock3}
              year="2026"
              title="Aktueller Stand"
              source={SOURCES.bmasFaq}
            >
              Laut BMAS darf nicht auf eine Reform gewartet werden. Die gesamte
              Arbeitszeit ist schon jetzt zu dokumentieren.
            </LegalStep>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
            <SectionHeading
              eyebrow="Kleinbetriebe"
              title="Die Größe verändert das Wie, nicht automatisch das Ob."
            >
              <p>
                Ein Betrieb mit einer oder fünf angestellten Personen ist nicht
                allein wegen seiner Größe von der Pflicht befreit. Größe und Art
                des Unternehmens dürfen aber bei der Ausgestaltung berücksichtigt werden.
              </p>
            </SectionHeading>
            <div className="space-y-8 text-sm leading-7 text-slate-700">
              <LegalPoint title="Nur die Inhaberin oder der Inhaber arbeitet im Betrieb">
                Ohne Arbeitnehmerinnen oder Arbeitnehmer greift die hier beschriebene
                Arbeitgeberpflicht nicht für die eigene selbstständige Tätigkeit.
                Sobald Beschäftigte hinzukommen, muss ihre Einordnung geprüft werden.
              </LegalPoint>
              <LegalPoint title="Auch Minijobs sind Beschäftigung">
                Für geringfügig Beschäftigte kann neben der allgemeinen Pflicht eine
                konkrete Dokumentationspflicht nach dem Mindestlohngesetz gelten.
                Haushaltsnahe Minijobs nach § 8a SGB IV behandelt § 17 MiLoG gesondert.
              </LegalPoint>
              <LegalPoint title="Gesetzliche Ausnahmen bleiben Einzelfragen">
                Das Arbeitszeitgesetz nennt unter anderem bestimmte leitende
                Angestellte und Chefärzte als Ausnahmen. Eine Stellenbezeichnung
                allein entscheidet das nicht. Prüfen Sie die tatsächlichen Aufgaben.
              </LegalPoint>
              <div className="flex flex-wrap gap-x-7 gap-y-3 font-semibold">
                <SourceLink href={SOURCES.arbzg18}>§ 18 ArbZG</SourceLink>
                <SourceLink href={SOURCES.milog17}>§ 17 MiLoG</SourceLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-900/10 bg-[#f5f3ee]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
          <SectionHeading eyebrow="Was erfasst wird" title="Beginn, Ende und Dauer jedes Arbeitstags.">
            <p>
              Das BMAS nennt diese drei Angaben, damit Höchstarbeitszeiten und
              Ruhezeiten kontrolliert werden können. Das BAG bezieht ausdrücklich
              auch Überstunden ein.
            </p>
          </SectionHeading>
          <div className="mt-12 grid border-l border-t border-slate-900/15 bg-white md:grid-cols-3">
            <RecordCard number="01" title="Beginn">
              Wann hat die tatsächliche Arbeitszeit an diesem Kalendertag begonnen?
            </RecordCard>
            <RecordCard number="02" title="Ende">
              Wann wurde die tägliche Arbeit tatsächlich beendet?
            </RecordCard>
            <RecordCard number="03" title="Dauer">
              Wie viel Arbeitszeit bleibt nach Berücksichtigung der Pausen?
            </RecordCard>
          </div>
          <div className="mt-10 grid gap-8 text-sm leading-7 text-slate-700 lg:grid-cols-2">
            <div className="border-t-2 border-slate-950 pt-6">
              <h3 className="font-semibold text-slate-950">Müssen Pausen einzeln gestempelt werden?</h3>
              <p className="mt-3">
                Die allgemeine Mindestformulierung des BMAS lautet Beginn, Ende
                und Dauer. Ein System kann Pausen mit Start und Ende erfassen;
                jedenfalls muss die ausgewiesene Arbeitsdauer nachvollziehbar sein.
              </p>
            </div>
            <div className="border-t-2 border-slate-950 pt-6">
              <h3 className="font-semibold text-slate-950">Gilt das auch im Homeoffice?</h3>
              <p className="mt-3">
                Ja. Arbeitszeitschutz und Erfassung hängen nicht vom Arbeitsort ab.
                Auch Vertrauensarbeitszeit bleibt möglich, ersetzt aber nicht die Dokumentation.
              </p>
            </div>
          </div>
          <div className="mt-7 text-sm font-semibold">
            <SourceLink href={SOURCES.bmasFaq}>
              BMAS zu Inhalt, Form, Delegation und Vertrauensarbeitszeit
            </SourceLink>
          </div>
        </div>
      </section>
    </>
  );
}
