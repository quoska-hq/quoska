import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  GitBranch,
  Scale,
} from "lucide-react";

const GUIDES = [
  {
    icon: Building2,
    href: "/zeiterfassung-kleinbetriebe",
    eyebrow: "Für kleine Teams",
    title: "Zeiterfassung für Kleinbetriebe",
    body: "Was kleine Betriebe wirklich brauchen und wie der Einstieg ohne großes Softwareprojekt gelingt.",
  },
  {
    icon: BookOpen,
    href: "/digitale-zeiterfassung",
    eyebrow: "Ohne App-Zwang",
    title: "Digitale Zeiterfassung im Browser",
    body: "Arbeitszeiten am Computer, Tablet oder Smartphone erfassen und einen klaren Ablauf einführen.",
  },
  {
    icon: GitBranch,
    href: "/open-source-zeiterfassung",
    eyebrow: "Offene Codebasis",
    title: "Open-Source-Zeiterfassung",
    body: "Quellcode prüfen, selbst hosten oder dieselbe Anwendung als verwaltete Cloud-Version nutzen.",
  },
  {
    icon: Scale,
    href: "/arbeitszeiterfassung-pflicht-kleinbetriebe",
    eyebrow: "Rechtslage 2026",
    title: "Pflicht zur Arbeitszeiterfassung",
    body: "Was kleine Arbeitgeber schon heute erfassen müssen — mit BAG-Entscheidung und amtlichen Quellen.",
  },
] as const;

export function GuidesSection() {
  return (
    <section className="border-y border-slate-900/10 bg-[#e7e3da]">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5145ad]">
              Ratgeber
            </p>
            <h2 className="mt-4 max-w-lg font-serif text-4xl leading-tight tracking-[-0.035em] text-slate-950 sm:text-5xl">
              Die passende Zeiterfassung bewusst auswählen.
            </h2>
          </div>
          <p className="max-w-xl leading-7 text-slate-700 lg:justify-self-end">
            Vier Einstiege für Betriebe, die Anforderungen, Bedienung und
            Betriebsmodell vor der Entscheidung verstehen möchten.
          </p>
        </div>

        <div className="mt-12 grid border-l border-t border-slate-900/15 md:grid-cols-2 lg:grid-cols-4">
          {GUIDES.map(({ icon: Icon, href, eyebrow, title, body }) => (
            <article
              key={href}
              className="flex flex-col border-b border-r border-slate-900/15 bg-white p-7"
            >
              <Icon className="size-5 text-[#5145ad]" />
              <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-[#5145ad]">
                {eyebrow}
              </p>
              <h3 className="mt-3 text-lg font-semibold text-slate-950">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
              <Link
                href={href}
                className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-slate-950 hover:text-[#5145ad]"
              >
                {title} lesen <ArrowUpRight className="size-4" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
