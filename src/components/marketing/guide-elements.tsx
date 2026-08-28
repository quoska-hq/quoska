import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Info, UserRound } from "lucide-react";

export function SourceLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-slate-950 underline decoration-slate-400 underline-offset-4 hover:text-[#5145ad]"
    >
      {children} <ArrowUpRight className="size-3.5 shrink-0" />
    </a>
  );
}

export function GuideNotice({ children }: { children: ReactNode }) {
  return (
    <aside className="flex gap-3 border border-slate-900/15 bg-[#f5f3ee] p-5 text-sm leading-7 text-slate-700">
      <Info className="mt-1 size-4 shrink-0 text-[#5145ad]" />
      <div>{children}</div>
    </aside>
  );
}

export function GuideAuthor({
  reviewedOn,
  reviewedOnIso,
  sourceCount,
}: {
  reviewedOn: string;
  reviewedOnIso: string;
  sourceCount: number;
}) {
  return (
    <section className="border-b border-slate-900/10 bg-white" aria-label="Redaktion und Quellenprüfung">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-7 sm:flex-row sm:items-center sm:px-6">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#e7e3da] text-[#5145ad]">
          <UserRound className="size-5" aria-hidden="true" />
        </div>
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-slate-950">
            Recherchiert und verantwortet von{" "}
            <Link rel="author" href="/ueber-uns#oskar-kuiper" className="underline decoration-slate-400 underline-offset-4 hover:text-[#5145ad]">
              Oskar Kuiper
            </Link>
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Gründer, Entwickler und Betreiber von Quoska. Die Darstellung stützt
            sich auf {sourceCount} {sourceCount === 1 ? "amtliche Primärquelle" : "amtliche Primärquellen"};
            Quellen zuletzt geprüft am <time dateTime={reviewedOnIso}>{reviewedOn}</time>.
            Sie ersetzt keine Rechtsberatung.
          </p>
        </div>
      </div>
    </section>
  );
}

export function FactCard({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="border-b border-r border-slate-900/15 p-6">
      <span className="font-mono text-xs text-[#5145ad]">{number}</span>
      <h3 className="mt-8 text-lg font-semibold text-slate-950">{title}</h3>
      <div className="mt-3 text-sm leading-7 text-slate-600">{children}</div>
    </article>
  );
}

export function GuideFaq({
  items,
}: {
  items: readonly { q: string; a: string }[];
}) {
  return (
    <div className="border-t border-slate-900/15">
      {items.map((item) => (
        <article key={item.q} className="border-b border-slate-900/15 py-6">
          <h3 className="font-semibold text-slate-950">{item.q}</h3>
          <p className="mt-3 text-sm leading-7 text-slate-700">{item.a}</p>
        </article>
      ))}
    </div>
  );
}
