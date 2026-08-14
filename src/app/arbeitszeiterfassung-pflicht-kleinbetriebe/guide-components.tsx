import type { ReactNode } from "react";
import { ArrowUpRight, Scale } from "lucide-react";

export function SourceLink({ href, children }: { href: string; children: ReactNode }) {
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

export function LegalStep({
  icon: Icon,
  year,
  title,
  source,
  children,
}: {
  icon: typeof Scale;
  year: string;
  title: string;
  source: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col border-b border-r border-slate-900/15 p-6">
      <div className="flex items-center justify-between gap-4">
        <Icon className="size-5 text-[#5145ad]" />
        <span className="font-mono text-xs text-slate-500">{year}</span>
      </div>
      <h3 className="mt-8 font-semibold text-slate-950">{title}</h3>
      <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">{children}</p>
      <a
        href={source}
        target="_blank"
        rel="noreferrer"
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-950 hover:text-[#5145ad]"
      >
        Quelle öffnen <ArrowUpRight className="size-3.5" />
      </a>
    </section>
  );
}

export function LegalPoint({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t-2 border-slate-950 pt-5">
      <h3 className="font-semibold text-slate-950">{title}</h3>
      <p className="mt-2">{children}</p>
    </section>
  );
}

export function RecordCard({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-r border-slate-900/15 p-6">
      <span className="font-mono text-xs text-[#5145ad]">{number}</span>
      <h3 className="mt-8 text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">{children}</p>
    </section>
  );
}

export function DutyRow({
  rule,
  scope,
  form,
  retention,
}: {
  rule: string;
  scope: string;
  form: string;
  retention: string;
}) {
  return (
    <tr className="border-t border-slate-900/15 align-top">
      <th className="p-4 font-semibold text-slate-950">{rule}</th>
      <td className="p-4">{scope}</td>
      <td className="p-4">{form}</td>
      <td className="p-4">{retention}</td>
    </tr>
  );
}
