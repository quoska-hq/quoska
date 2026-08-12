import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Clock3, History, LayoutDashboard } from "lucide-react";

const CAPABILITIES = [
  {
    icon: Clock3,
    title: "Einfach stempeln",
    body: "Ein Klick für Arbeitsbeginn, Pause und Feierabend — auch im mobilen Browser.",
  },
  {
    icon: LayoutDashboard,
    title: "Früh sehen, was fehlt",
    body: "Offene Korrekturen, Abweichungen und Projektzeiten erscheinen direkt im Cockpit.",
  },
  {
    icon: History,
    title: "Änderungen nachvollziehen",
    body: "Korrekturen laufen über Anträge. Der ursprüngliche Eintrag und sein Verlauf bleiben sichtbar.",
  },
] as const;

export function ProductTourSection() {
  return (
    <section id="produkt" className="bg-white">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24 lg:py-28">
        <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5145ad]">
              Kein Marketing-Mock-up
            </p>
            <h2 className="mt-4 max-w-xl font-serif text-4xl leading-tight tracking-[-0.035em] text-slate-950 sm:text-5xl">
              So sieht Quoska wirklich aus.
            </h2>
          </div>
          <p className="max-w-xl leading-7 text-slate-700 lg:justify-self-end">
            Die Oberfläche bleibt bewusst ruhig: Mitarbeitende erfassen ihren
            Tag, Verantwortliche sehen Aufgaben und Entwicklungen ohne sich
            durch Tabellen zu arbeiten.
          </p>
        </div>

        <div
          data-testid="product-showcase"
          className="mt-12 border border-slate-900/15 bg-[#f5f3ee] px-4 py-8 sm:p-8 lg:px-10 lg:py-12"
        >
          <div className="relative mx-auto max-w-[72rem] space-y-8 lg:space-y-0 lg:pb-24 lg:pl-32 xl:pl-40">
            <figure>
              <div className="overflow-hidden border border-slate-900/20 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.13)]">
                <div className="flex h-11 items-center justify-between border-b border-slate-900/10 bg-[#faf9f6] px-4">
                  <div className="flex items-center gap-1.5" aria-hidden="true">
                    <span className="size-2 rounded-full bg-slate-300" />
                    <span className="size-2 rounded-full bg-slate-300" />
                    <span className="size-2 rounded-full bg-[#6658d3]" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                    Für Verantwortliche
                  </span>
                </div>
                <Image
                  src="/product/activity-log.png"
                  alt="Quoska Aktivitätsverlauf mit Filter und unveränderlich protokollierten Zeitereignissen"
                  width={1440}
                  height={960}
                  unoptimized
                  sizes="(max-width: 1024px) 100vw, 1050px"
                  className="h-auto w-full"
                />
              </div>
              <figcaption className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 lg:ml-44 xl:ml-40">
                Aktivitäten, Korrekturen und Zeitereignisse bleiben filterbar
                und für Verantwortliche nachvollziehbar.
              </figcaption>
            </figure>

            <figure className="mx-auto w-full max-w-[18rem] lg:absolute lg:bottom-0 lg:left-0 lg:mx-0 lg:w-[17rem] xl:w-[18rem]">
              <div className="rounded-[2rem] bg-slate-950 p-[6px] shadow-[0_28px_65px_rgba(15,23,42,0.24)]">
                <div className="overflow-hidden rounded-[1.7rem] bg-[#f8f7f3]">
                  <div className="relative h-7 bg-[#f8f7f3]" aria-hidden="true">
                    <span className="absolute left-1/2 top-2 h-1.5 w-14 -translate-x-1/2 rounded-full bg-slate-300" />
                  </div>
                  <Image
                    src="/product/mobile-clock.png"
                    alt="Mobile Stempeluhr in Quoska mit Tagesfortschritt, Pause und Wochensumme"
                    width={430}
                    height={932}
                    unoptimized
                    sizes="(max-width: 1024px) 288px, 288px"
                    className="h-auto w-full"
                  />
                </div>
              </div>
              <figcaption className="mt-4 text-center text-sm leading-6 text-slate-600 lg:text-left">
                Für Mitarbeitende direkt im mobilen Browser.
              </figcaption>
            </figure>
          </div>
        </div>

        <div className="mt-14 grid border-l border-t border-slate-900/15 md:grid-cols-3">
          {CAPABILITIES.map(({ icon: Icon, title, body }) => (
            <article key={title} className="border-b border-r border-slate-900/15 p-6 sm:p-7">
              <Icon className="size-5 text-[#5145ad]" />
              <h3 className="mt-5 font-semibold text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
            </article>
          ))}
        </div>

        <Link
          href="/funktionen"
          className="mt-8 inline-flex items-center gap-2 border-b border-slate-400 pb-1 text-sm font-semibold text-slate-900 hover:border-[#5145ad] hover:text-[#5145ad]"
        >
          Alle Funktionen ansehen
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
