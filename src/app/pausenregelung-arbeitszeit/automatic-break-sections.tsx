import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, BellRing, Coffee } from "lucide-react";
import {
  FactCard,
  GuideNotice,
} from "@/components/marketing/guide-elements";
import { SectionHeading } from "@/components/marketing/page-shell";

export function AutomaticBreakExplanationSection() {
  return (
    <section className="border-y border-slate-900/10 bg-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
        <SectionHeading
          eyebrow="Automatischer Pausenabzug"
          title="Gebuchte Minuten sind noch keine genommene Pause."
        >
          <p>
            Im Fall 5 AZR 51/24 konnte das Zeiterfassungssystem automatische
            und tatsächlich gebuchte Pausen unterscheiden. Das BAG hielt fest:
            Aus dem automatischen Abzug allein lässt sich nicht ableiten, ob
            die Arbeit wirklich unterbrochen wurde.
          </p>
        </SectionHeading>
        <div className="space-y-6 text-sm leading-7 text-slate-700">
          <p>
            Der konkrete Rechtsstreit betraf die Vergütung von Mehrarbeit einer
            Klinikärztin und besondere tarifliche sowie betriebliche Regeln. Das
            Urteil ist deshalb kein pauschales Verbot jeder Pausenautomatik. Für
            die Praxis zeigt es aber deutlich, warum automatische und manuell
            erfasste Pausen getrennt erkennbar bleiben sollten.
          </p>
          <div className="grid gap-px border border-slate-900/15 bg-slate-900/15 sm:grid-cols-3">
            {[
              ["Dokumentieren", "Automatisch ergänzte Minuten eindeutig von einer aktiv gebuchten Pause unterscheiden."],
              ["Organisieren", "Beschäftigten die tatsächliche Unterbrechung ermöglichen und Pausenabläufe verständlich regeln."],
              ["Nachfragen", "Wiederholte automatische Ergänzungen als Anlass für ein sachliches Gespräch nutzen."],
            ].map(([title, body]) => (
              <article key={title} className="bg-[#f5f3ee] p-5">
                <h3 className="font-semibold text-slate-950">{title}</h3>
                <p className="mt-2 text-xs leading-6 text-slate-600">{body}</p>
              </article>
            ))}
          </div>
          <GuideNotice>
            <p>
              Eine automatisch ergänzte Pause bedeutet nicht, dass Beschäftigte
              diese Zeit verschenken sollen. Wurde tatsächlich durchgearbeitet,
              muss der Eintrag geklärt und gegebenenfalls korrigiert werden.
            </p>
          </GuideNotice>
        </div>
      </div>
    </section>
  );
}

export function QuoskaBreakAutomationSection() {
  return (
    <section className="bg-[#e7e3da]">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
        <SectionHeading eyebrow="Mit Quoska" title="Pausen sichtbar im selben Zeitverlauf.">
          <p>
            Mitarbeitende starten und beenden Pausen direkt in der Stempeluhr.
            Optional kann Quoska beim Ausstempeln fehlende Mindestpausen
            transparent ergänzen; ergänzte Minuten werden gekennzeichnet,
            protokolliert und erklärt. Die tatsächliche Pause muss trotzdem
            genommen werden. Administratoren schalten die Automatik in den
            Einstellungen für das Team ein oder aus.
          </p>
        </SectionHeading>
        <div className="mt-12 grid border-l border-t border-slate-900/15 bg-white md:grid-cols-3">
          <FactCard number="01" title="Aktiv pausieren">
            <Coffee className="mb-4 size-5 text-[#5145ad]" />
            Start und Ende einer Pause werden als eigene Ereignisse erfasst.
          </FactCard>
          <FactCard number="02" title="Optional ergänzen">
            <Coffee className="mb-4 size-5 text-[#5145ad]" />
            Fehlen beim Abschluss Minuten bis zur Mindestpause, kann Quoska sie
            sichtbar ergänzen – ohne sie als manuelle Pause auszugeben.
          </FactCard>
          <FactCard number="03" title="Muster früh erkennen">
            <BellRing className="mb-4 size-5 text-[#5145ad]" />
            Fünf relevante Tage ohne manuelle Pausenbuchung innerhalb der
            letzten sieben Tage führen zu einem Gesprächshinweis im Cockpit.
          </FactCard>
        </div>
        <p className="mt-6 max-w-4xl text-sm leading-7 text-slate-700">
          Der Hinweis behauptet nicht, dass keine Pause genommen wurde. Er macht
          sichtbar, dass die Dokumentation wiederholt nur auf der Automatik
          beruht, damit Verantwortliche den tatsächlichen Ablauf gemeinsam mit
          der betroffenen Person prüfen können.
        </p>
        <div className="mt-8 flex flex-wrap gap-6 text-sm font-semibold">
          <GuideLink href="/arbeitszeitrechner">Arbeitszeit und Pausen berechnen</GuideLink>
          <GuideLink href="/arbeitszeitnachweis">Arbeitszeitnachweis ansehen</GuideLink>
          <GuideLink href="/funktionen">Alle Funktionen</GuideLink>
        </div>
      </div>
    </section>
  );
}

function GuideLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 text-slate-950 hover:text-[#5145ad]">
      {children} <ArrowUpRight className="size-4" />
    </Link>
  );
}
