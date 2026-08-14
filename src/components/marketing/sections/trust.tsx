import Link from "next/link";
import { ArrowUpRight, Database, EyeOff, GitBranch, Server } from "lucide-react";
import { site } from "@/lib/site";

const FACTS = [
  {
    icon: Database,
    title: "Datenbank in Frankfurt",
    body: "Die produktive Datenbank läuft in der Supabase-Region Frankfurt am Main.",
  },
  {
    icon: Server,
    title: "Anwendung in Deutschland",
    body: "Die Web-Anwendung wird auf einem Hetzner-Server in Nürnberg betrieben.",
  },
  {
    icon: EyeOff,
    title: "Kein Werbe-Tracking",
    body: "Die öffentliche Website verwendet keine Analyse- oder Werbe-Cookies.",
  },
  {
    icon: GitBranch,
    title: "Offener Quellcode",
    body: "Quoska ist unter AGPL-3.0 veröffentlicht und technisch nachvollziehbar.",
  },
] as const;

export function TrustSection() {
  return (
    <section className="bg-[#151618] text-white">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
        <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b8afff]">
              Vertrauen braucht Fakten
            </p>
            <h2 className="mt-4 max-w-lg font-serif text-4xl leading-tight tracking-[-0.035em] sm:text-5xl">
              Klar gesagt, wo Quoska läuft.
            </h2>
          </div>
          <p className="max-w-xl leading-7 text-slate-300 lg:justify-self-end">
            Zeiterfassung enthält sensible Beschäftigtendaten. Deshalb nennen
            wir konkret, welche Infrastruktur eingesetzt wird und was auf der
            Website bewusst nicht stattfindet.
          </p>
        </div>

        <div className="mt-12 grid border-l border-t border-white/20 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map(({ icon: Icon, title, body }) => (
            <article key={title} className="border-b border-r border-white/20 p-6">
              <Icon className="size-5 text-[#b8afff]" />
              <h3 className="mt-5 font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
          <Link href="/open-source-zeiterfassung" className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-[#b8afff]">
            Open-Source-Zeiterfassung
            <ArrowUpRight className="size-4" />
          </Link>
          <Link href="/sicherheit" className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-[#b8afff]">
            Sicherheit und Datenschutz
            <ArrowUpRight className="size-4" />
          </Link>
          <a
            href={site.githubUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-[#b8afff]"
          >
            Quellcode auf GitHub
            <ArrowUpRight className="size-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
