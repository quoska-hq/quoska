import Link from "next/link";
import { ArrowUpRight, Check, CircleAlert } from "lucide-react";
import { SectionHeading } from "@/components/marketing/page-shell";
import { DutyRow, SourceLink } from "./guide-components";
import { CHECKLIST, SOURCES } from "./guide-data";

export function GuideMainSections() {
  return (
    <>
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
          <SectionHeading
            eyebrow="Pflichten auseinanderhalten"
            title="Eine allgemeine Pflicht, dazu besondere Nachweise."
          >
            <p>
              Für Fristen und Sanktionen ist entscheidend, auf welcher Vorschrift
              die konkrete Aufzeichnung beruht. Diese Ebenen werden häufig verwechselt.
            </p>
          </SectionHeading>
          <div className="mt-12 overflow-x-auto border border-slate-900/15">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-slate-950 text-white">
                <tr>
                  <th className="p-4 font-semibold">Regel</th>
                  <th className="p-4 font-semibold">Für wen / was?</th>
                  <th className="p-4 font-semibold">Form und Zeitpunkt</th>
                  <th className="p-4 font-semibold">Aufbewahrung</th>
                </tr>
              </thead>
              <tbody className="leading-6 text-slate-700">
                <DutyRow
                  rule="Allgemeine Pflicht aus ArbSchG/BAG"
                  scope="Grundsätzlich die gesamte tägliche Arbeitszeit der erfassten Arbeitnehmer"
                  form="Derzeit keine allgemeine Formvorschrift; objektiv, verlässlich und zugänglich"
                  retention="Noch keine eigenständige, einheitliche Frist für jeden Datensatz festgelegt"
                />
                <DutyRow
                  rule="§ 16 Abs. 2 ArbZG"
                  scope="Arbeitszeit oberhalb von acht Stunden werktäglich sowie dort genannte Nachweise"
                  form="Vollständig und richtig aufzeichnen"
                  retention="Mindestens zwei Jahre"
                />
                <DutyRow
                  rule="§ 17 MiLoG"
                  scope="Insbesondere Minijobs und Beschäftigte in den gesetzlich genannten Branchen"
                  form="Beginn, Ende und Dauer spätestens bis Ablauf des siebten Folgetags"
                  retention="Mindestens zwei Jahre"
                />
              </tbody>
            </table>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold">
            <SourceLink href={SOURCES.arbzg16}>§ 16 ArbZG</SourceLink>
            <SourceLink href={SOURCES.milog17}>§ 17 MiLoG</SourceLink>
            <SourceLink href={SOURCES.schwarzarbg2a}>Branchen nach § 2a SchwarzArbG</SourceLink>
            <SourceLink href={SOURCES.bmasMinimumWage}>BMAS zur Mindestlohndokumentation</SourceLink>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-900/10 bg-[#e7e3da]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <SectionHeading
            eyebrow="Elektronische Erfassung"
            title="Angekündigt ist nicht dasselbe wie geltendes Gesetz."
          >
            <p>
              Die Bundesregierung plant laut BMAS einen konkreteren gesetzlichen
              Rahmen mit elektronischer Aufzeichnung. Im aktuell veröffentlichten
              Arbeitszeitgesetz ist sie noch nicht allgemein geregelt.
            </p>
          </SectionHeading>
          <div className="space-y-7 text-sm leading-7 text-slate-700">
            <div className="flex gap-4 bg-white p-6 sm:p-8">
              <CircleAlert className="mt-0.5 size-5 shrink-0 text-[#5145ad]" />
              <div>
                <h3 className="font-semibold text-slate-950">Darauf sollten Kleinbetriebe nicht warten</h3>
                <p className="mt-2">
                  Das „Ob“ der vollständigen Erfassung gilt bereits. Offen bleibt,
                  wie der Gesetzgeber Form, Fristen und mögliche Differenzierungen
                  ausgestaltet. Verlassen Sie sich nicht auf angekündigte Übergangsregeln.
                </p>
              </div>
            </div>
            <p>
              Praktisch spricht vieles für einen einfachen digitalen Ablauf. Rechtlich
              entscheidend ist aber nicht das Etikett „digital“, sondern ein objektiv,
              verlässlich und zugänglich funktionierendes System.
            </p>
            <div className="flex flex-wrap gap-x-7 gap-y-3 font-semibold">
              <SourceLink href={SOURCES.bmasFaq}>BMAS zum Reformvorhaben</SourceLink>
              <SourceLink href={SOURCES.arbeitszeitgesetz}>Aktuell veröffentlichtes ArbZG</SourceLink>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-20">
          <div>
            <SectionHeading eyebrow="Einführung" title="Eine belastbare betriebliche Checkliste.">
              <p>
                Ein Tool allein erfüllt keine Arbeitgeberpflicht. Entscheidend ist
                ein verständlicher Ablauf, der genutzt, kontrolliert und korrigiert wird.
              </p>
            </SectionHeading>
            <ul className="mt-9 border-t border-slate-900/15">
              {CHECKLIST.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 border-b border-slate-900/15 py-4 text-sm leading-6 text-slate-700"
                >
                  <Check className="mt-0.5 size-4 shrink-0 text-[#5145ad]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="self-end bg-[#f5f3ee] p-7 sm:p-9">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5145ad]">
              Umsetzung mit Quoska
            </p>
            <h2 className="mt-4 font-serif text-3xl leading-tight tracking-[-0.03em] text-slate-950">
              Dokumentation unterstützen, Verantwortung sichtbar lassen.
            </h2>
            <p className="mt-5 text-sm leading-7 text-slate-700">
              Quoska erfasst Arbeitsbeginn, Pausen und Arbeitsende, stellt
              Korrekturen nachvollziehbar dar und bietet Auswertungen sowie Exporte.
              Die Software ersetzt weder die rechtliche Einordnung noch die laufende Kontrolle.
            </p>
            <div className="mt-7 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold">
              <Link href="/digitale-zeiterfassung" className="inline-flex items-center gap-2 text-slate-950 hover:text-[#5145ad]">
                Digitalen Ablauf planen <ArrowUpRight className="size-4" />
              </Link>
              <Link href="/funktionen" className="inline-flex items-center gap-2 text-slate-950 hover:text-[#5145ad]">
                Funktionen prüfen <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
