import type { Metadata } from "next";
import Image from "next/image";
import { CalendarDays, Clock3, FileDown, History, Palmtree, Users } from "lucide-react";
import { MarketingPageShell, SectionHeading } from "@/components/marketing/page-shell";

export const metadata: Metadata = {
  title: "Funktionen der digitalen Zeiterfassung",
  description:
    "Stempeluhr, Pausen, Korrekturen, Urlaub, Rollen und Auswertungen: alle Funktionen von Quoska für kleine Betriebe im Überblick.",
  alternates: { canonical: "/funktionen" },
};

const FEATURES = [
  {
    icon: Clock3,
    title: "Stempeln und Pausen",
    body: "Arbeitsbeginn, Pause und Feierabend werden mit serverseitigen Zeitstempeln erfasst. Die Oberfläche funktioniert am Rechner und im mobilen Browser.",
  },
  {
    icon: History,
    title: "Korrekturen mit Verlauf",
    body: "Mitarbeitende begründen eine Korrektur, Verantwortliche prüfen sie. Alte und neue Werte bleiben im Aktivitätsverlauf nachvollziehbar.",
  },
  {
    icon: Users,
    title: "Rollen und Team",
    body: "Mitarbeitende sehen ihre eigenen Daten. Manager und Administratoren erhalten die Ansichten, die sie für Team und Freigaben benötigen.",
  },
  {
    icon: Palmtree,
    title: "Urlaub und Krankheit",
    body: "Abwesenheiten, Anträge und Freigaben laufen im selben System. So stimmen Zeiterfassung und Monatsübersicht zusammen.",
  },
  {
    icon: CalendarDays,
    title: "Arbeitsmodelle und Feiertage",
    body: "Individuelle Wochenpläne bilden Teilzeit und freie Wochentage ab. Feiertage werden passend zum hinterlegten Bundesland berücksichtigt.",
  },
  {
    icon: FileDown,
    title: "Cockpit, Berichte und CSV",
    body: "Arbeitszeit, Auffälligkeiten und Projektanteile werden im Cockpit zusammengeführt. Zeitraumbezogene Daten lassen sich als CSV weitergeben.",
  },
] as const;

export default function FunctionsPage() {
  return (
    <MarketingPageShell
      eyebrow="Funktionen"
      title="Der komplette Arbeitstag. Ohne überladenes System."
      intro="Quoska verbindet die tägliche Stempeluhr mit den Aufgaben, die danach entstehen: Pausen prüfen, Korrekturen freigeben, Abwesenheiten verwalten und Daten auswerten."
    >
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
          <div className="grid border-l border-t border-slate-900/15 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <article key={title} className="border-b border-r border-slate-900/15 p-7">
                <Icon className="size-5 text-[#5145ad]" />
                <h2 className="mt-5 text-lg font-semibold text-slate-950">{title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-900/10 bg-[#e7e3da]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:gap-16">
          <SectionHeading eyebrow="Für Verantwortliche" title="Handlungsbedarf wird sichtbar.">
            <p>
              Das Cockpit verdichtet Arbeitszeiten nicht nur zu einer Zahl. Es zeigt offene
              Korrekturen, fehlende Einträge, auffällige Pausen und die Verteilung auf Projekte,
              bevor daraus Nacharbeit am Monatsende wird.
            </p>
          </SectionHeading>
          <div className="border border-slate-900/20 bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.10)]">
            <Image
              src="/product/cockpit.png"
              alt="Quoska Cockpit mit Arbeitszeit, Aufgaben, Team und Projekten"
              width={1440}
              height={960}
              sizes="(max-width: 1024px) 100vw, 760px"
              className="h-auto w-full border border-slate-900/10"
            />
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
