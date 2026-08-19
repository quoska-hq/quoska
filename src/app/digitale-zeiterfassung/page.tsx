import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check, Laptop, Smartphone, Tablet } from "lucide-react";
import { MarketingPageShell, SectionHeading } from "@/components/marketing/page-shell";

export const metadata: Metadata = {
  title: "Digitale Zeiterfassung einführen – Ablauf und Checkliste",
  description:
    "Digitale Zeiterfassung im Betrieb einführen: Rollen, Arbeitsmodelle, Korrekturen und monatliche Prüfung mit einer praktischen Checkliste planen.",
  alternates: { canonical: "/digitale-zeiterfassung" },
};

const CHECKLIST = [
  "Klare Rollen und Zugriffsrechte festlegen",
  "Arbeitsmodelle und Bundesland hinterlegen",
  "Regel für vergessene Buchungen kommunizieren",
  "Korrekturprozess mit Begründung definieren",
  "Monatliche Prüfung und Export verantworten",
] as const;

export default function DigitalTimeTrackingPage() {
  return (
    <MarketingPageShell
      eyebrow="Einführungsleitfaden"
      title="Digitale Zeiterfassung im Betrieb einführen."
      intro="Eine gute Einführung klärt Rollen, Arbeitsmodelle, Pausen und den Umgang mit vergessenen Buchungen, bevor der erste Monat abgeschlossen wird. Quoska bildet diesen Ablauf direkt im Browser auf Computer, Tablet und Smartphone ab."
    >
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <SectionHeading eyebrow="Das Grundprinzip" title="Erfassen, prüfen, nachvollziehen.">
            <p>
              Digitale Zeiterfassung ersetzt Zettel oder nachträglich gepflegte
              Tabellen durch einen einheitlichen Vorgang. Der Zeitpunkt wird erfasst,
              Pausen gehören zum Eintrag und Änderungen laufen über einen sichtbaren Prozess.
            </p>
          </SectionHeading>
          <div className="grid border-l border-t border-slate-900/15 sm:grid-cols-3">
            <Step number="01" title="Erfassen">
              Mitarbeitende stempeln Beginn, Pause und Ende direkt im Browser.
            </Step>
            <Step number="02" title="Prüfen">
              Verantwortliche sehen fehlende Einträge und offene Anfragen.
            </Step>
            <Step number="03" title="Dokumentieren">
              Freigegebene Korrekturen bleiben mit Begründung im Verlauf.
            </Step>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-900/10 bg-[#f5f3ee]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
            <SectionHeading
              eyebrow="Geräte"
              title="Ein Zugang, drei typische Arbeitsplätze."
            >
              <p>
                Der Browser ist der gemeinsame Zugang. Dadurch bleibt der
                Ablauf über verschiedene Geräte hinweg gleich, ohne dass eine
                native App aus einem App Store verpflichtend ist.
              </p>
            </SectionHeading>
            <div className="grid border-l border-t border-slate-900/15 bg-white sm:grid-cols-3">
              <Device
                icon={Laptop}
                title="Computer"
                body="Für Büro, Verwaltung und den täglichen Arbeitsplatz."
              />
              <Device
                icon={Tablet}
                title="Tablet"
                body="Für gemeinsam genutzte oder flexibel platzierte Geräte."
              />
              <Device
                icon={Smartphone}
                title="Smartphone"
                body="Für die mobile Zeiterfassung im vorhandenen Browser."
              />
            </div>
          </div>
          <div className="mt-10 border-t-2 border-slate-950 pt-6 text-sm leading-7 text-slate-700">
            <p className="max-w-3xl">
              Auf unterstützten Geräten lässt sich Quoska als Progressive Web
              App zusätzlich zum Startbildschirm hinzufügen. Das ist optional:
              Der direkte Aufruf im Browser bleibt verfügbar.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-900/10 bg-[#e7e3da]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-20">
          <div>
            <SectionHeading eyebrow="Einführung" title="Eine praktische Checkliste für den Start." />
            <ul className="mt-8 border-t border-slate-900/20">
              {CHECKLIST.map((item) => (
                <li key={item} className="flex gap-3 border-b border-slate-900/20 py-4 text-sm text-slate-700">
                  <Check className="mt-0.5 size-4 shrink-0 text-[#5145ad]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-8 text-sm leading-7 text-slate-700">
            <article>
              <h2 className="text-lg font-semibold text-slate-950">So wenig Reibung wie möglich</h2>
              <p className="mt-2">
                Der tägliche Vorgang sollte auf wenige eindeutige Aktionen reduziert sein.
                Sonderfälle gehören in den Korrekturprozess, nicht in eine überladene Stempeluhr.
              </p>
            </article>
            <article>
              <h2 className="text-lg font-semibold text-slate-950">Transparenz vor dem ersten Stempelvorgang</h2>
              <p className="mt-2">
                Mitarbeitende sollten wissen, welche Daten erfasst werden, wer sie sieht und wie
                eine vergessene Buchung korrigiert wird. Das erhöht Akzeptanz und reduziert Rückfragen.
              </p>
            </article>
            <article>
              <h2 className="text-lg font-semibold text-slate-950">Nicht erst am Monatsende prüfen</h2>
              <p className="mt-2">
                Ein Cockpit mit offenen Aufgaben hilft, Fehler zeitnah zu klären. Quoska bündelt
                diese Hinweise und die zugehörigen Arbeitszeiten an einem Ort.
              </p>
              <Link href="/funktionen" className="mt-4 inline-block border-b border-slate-400 font-semibold text-slate-950 hover:border-[#5145ad] hover:text-[#5145ad]">Funktionen von Quoska ansehen</Link>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <SectionHeading
            eyebrow="Einordnung"
            title="Browserbasiert heißt nicht unkontrolliert."
          >
            <p>
              Mitarbeitende sehen ihre eigenen Daten. Verantwortliche erhalten
              die Ansichten, die sie für Team, Freigaben und Berichte benötigen.
              Rollen und Mandantentrennung gelten unabhängig vom verwendeten Gerät.
            </p>
          </SectionHeading>
          <div className="space-y-7 border-t border-slate-900/15 pt-6 text-sm leading-7 text-slate-700">
            <p>
              Zeitstempel entstehen serverseitig. Vergessene oder fehlerhafte
              Buchungen werden nicht still überschrieben, sondern über einen
              begründeten Korrekturprozess bearbeitet. So bleibt die digitale
              Erfassung auch dann nachvollziehbar, wenn im Alltag etwas
              nachgetragen werden muss.
            </p>
            <div className="flex flex-wrap gap-6 font-semibold text-slate-950">
              <Link
                href="/zeiterfassung-kleinbetriebe"
                className="inline-flex items-center gap-2 hover:text-[#5145ad]"
              >
                Für Kleinbetriebe <ArrowUpRight className="size-4" />
              </Link>
              <Link
                href="/open-source-zeiterfassung"
                className="inline-flex items-center gap-2 hover:text-[#5145ad]"
              >
                Open-Source-Zeiterfassung <ArrowUpRight className="size-4" />
              </Link>
              <Link
                href="/sicherheit"
                className="inline-flex items-center gap-2 hover:text-[#5145ad]"
              >
                Sicherheit und Datenschutz <ArrowUpRight className="size-4" />
              </Link>
              <Link
                href="/arbeitszeiterfassung-pflicht-kleinbetriebe"
                className="inline-flex items-center gap-2 hover:text-[#5145ad]"
              >
                Aktuelle Rechtslage <ArrowUpRight className="size-4" />
              </Link>
              <Link
                href="/arbeitszeitnachweis"
                className="inline-flex items-center gap-2 hover:text-[#5145ad]"
              >
                Arbeitszeitnachweis <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}

function Step({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <article className="border-b border-r border-slate-900/15 p-6">
      <span className="font-mono text-xs text-[#5145ad]">{number}</span>
      <h2 className="mt-8 font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{children}</p>
    </article>
  );
}

function Device({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Laptop;
  title: string;
  body: string;
}) {
  return (
    <article className="border-b border-r border-slate-900/15 p-6">
      <Icon className="size-5 text-[#5145ad]" />
      <h2 className="mt-8 font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
    </article>
  );
}
