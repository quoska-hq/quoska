import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";

export function ToolSection({ children }: { children: ReactNode }) {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-16">
        {children}
      </div>
    </section>
  );
}

export function ToolPanel({ children }: { children: ReactNode }) {
  return (
    <div className="border border-slate-900/15 bg-[#f5f3ee] shadow-[8px_8px_0_rgba(15,23,42,0.07)]">
      {children}
    </div>
  );
}

export function ToolPanelHeader({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-900/15 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{children}</p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-2 text-xs font-medium text-slate-500">
        <LockKeyhole className="size-3.5 text-[#6658d3]" /> Bleibt in deinem Browser
      </span>
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-800">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs leading-5 text-slate-500">{hint}</p>}
    </div>
  );
}

export function ResultMetric({
  label,
  value,
  emphasis = false,
  children,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={`border-b border-r border-slate-900/15 p-5 ${emphasis ? "bg-slate-950 text-white" : "bg-white"}`}>
      <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${emphasis ? "text-slate-300" : "text-slate-500"}`}>
        {label}
      </p>
      <p className="mt-3 font-mono text-2xl font-semibold tracking-tight">{value}</p>
      {children && <div className={`mt-2 text-xs leading-5 ${emphasis ? "text-slate-300" : "text-slate-500"}`}>{children}</div>}
    </div>
  );
}

export function ToolClusterLinks({ current }: { current: string }) {
  const tools = [
    ["/arbeitszeitrechner", "Arbeitszeitrechner"],
    ["/stundenzettel", "Stundenzettel"],
    ["/ueberstundenrechner", "Überstundenrechner"],
    ["/monatsarbeitszeit-rechner", "Monatsarbeitszeit"],
  ];
  return (
    <div className="grid gap-px border border-slate-900/15 bg-slate-900/15 sm:grid-cols-2 lg:grid-cols-4">
      {tools.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          aria-current={href === current ? "page" : undefined}
          className={`flex items-center justify-between gap-3 bg-white p-4 text-sm font-semibold transition-colors ${href === current ? "text-[#5145ad]" : "text-slate-700 hover:text-[#5145ad]"}`}
        >
          {label} <ArrowRight className="size-4" />
        </Link>
      ))}
    </div>
  );
}
