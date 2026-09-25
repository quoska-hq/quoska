import { ArrowUpRight, MessageCircle, Plug, Settings2, Zap } from "lucide-react";
import { ENTERPRISE_CONTACT_URL } from "@/config/enterprise";
import { legalInfo } from "@/lib/site";

const EXAMPLES = [
  {
    icon: Plug,
    title: "Deine Programme verbinden",
    body: "Du brauchst eine Integration mit einer bestimmten Software? Sag uns, welches Programm du nutzt und welche Daten fließen sollen.",
  },
  {
    icon: Zap,
    title: "Zeiterfassung automatisieren",
    body: "Zeiten automatisch erfassen oder wiederkehrende Schritte sparen: Gemeinsam schauen wir, welche Automatisierung deinen Alltag erleichtert.",
  },
  {
    icon: Settings2,
    title: "Besondere Abläufe abbilden",
    body: "Ein eigener Bericht, ein spezieller Ablauf oder eine fehlende Funktion? Wir passen Quoska gerne an die Bedürfnisse deines Betriebs an.",
  },
] as const;

export function FeatureRequestsSection() {
  return (
    <section id="funktionswuensche" className="scroll-mt-24 border-y border-slate-900/10 bg-[#eeeafd]">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start lg:gap-20">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#5145ad]">
              <MessageCircle aria-hidden="true" className="size-4" /> Enterprise & Funktionswünsche
            </p>
            <h2 className="mt-4 max-w-2xl font-serif text-3xl leading-tight tracking-[-0.035em] text-slate-950 sm:text-4xl">
              Deine Zeiterfassung soll zu deinem Betrieb passen.
            </h2>
            <p className="mt-5 max-w-2xl leading-7 text-slate-700">
              Du brauchst unbegrenzt viele Mitarbeitende oder individuelle Lösungen?
              Unser Enterprise-Angebot verbindet beides. Wir sind offen für neue Funktionen, Integrationen und
              besondere Anforderungen. Schreib uns direkt, was du brauchst – wir
              entwickeln Quoska gemeinsam mit den Betrieben weiter, die es nutzen.
              Funktionswünsche sind in jedem Tarif willkommen. Umfang, Preis und
              Zeitplan individueller Anpassungen stimmen wir mit dir ab.
            </p>
          </div>
          <div className="border-l-2 border-[#5145ad] pl-6">
            <h3 className="text-lg font-semibold text-slate-950">Kurze Wege. Schnelle Umsetzung.</h3>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              Unser Ziel: Die meisten Wünsche innerhalb weniger Tage umsetzen,
              kleinere Anpassungen möglichst schon innerhalb eines Tages. Was
              möglich ist und wie schnell es geht, klären wir direkt mit dir.
            </p>
            <a
              href={ENTERPRISE_CONTACT_URL}
              className="mt-5 inline-flex items-center gap-2 bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5145ad]"
            >
              Anforderungen besprechen <ArrowUpRight aria-hidden="true" className="size-4" />
            </a>
            <p className="mt-3 text-sm text-slate-600">Direkt per E-Mail an {legalInfo.email}</p>
          </div>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {EXAMPLES.map(({ icon: Icon, title, body }) => (
            <article key={title} className="border-t border-slate-900/20 pt-6">
              <Icon aria-hidden="true" className="size-5 text-[#5145ad]" />
              <h3 className="mt-4 font-semibold text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-700">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
