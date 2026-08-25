import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  ChevronRight,
  Puzzle,
  type LucideIcon,
} from "lucide-react";
import { getChromeWebStoreUrl } from "@/config/browser-extension-store";

export function BrowserExtensionHero() {
  return (
    <section className="overflow-hidden border-b border-slate-900/10">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-20 lg:py-24">
        <div>
          <nav
            aria-label="Brotkrumen"
            className="flex items-center gap-1.5 text-xs text-slate-600"
          >
            <Link href="/" className="hover:text-[#5145ad]">
              Startseite
            </Link>
            <ChevronRight className="size-3.5" aria-hidden="true" />
            <span aria-current="page">Browser-Erweiterung</span>
          </nav>

          <p className="mt-10 inline-flex items-center gap-2 border border-[#6658d3]/25 bg-white px-3 py-2 text-xs font-semibold text-[#5145ad]">
            <Puzzle className="size-4" />
            Kostenlos im Chrome Web Store
          </p>
          <h1 className="mt-6 max-w-3xl font-serif text-5xl leading-[1.02] tracking-[-0.045em] text-slate-950 sm:text-6xl">
            Arbeitszeit erfassen. Direkt aus Chrome.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
            Einstempeln, Pausen starten und den Tagesfortschritt sehen, ohne
            Quoska dauerhaft in einem Tab geöffnet zu halten.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={getChromeWebStoreUrl("landing-hero")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 bg-slate-950 px-6 text-sm font-semibold text-white transition-colors hover:bg-[#5145ad]"
            >
              In Chrome hinzufügen
              <ArrowUpRight className="size-4" />
            </a>
            <a
              href="#so-funktionierts"
              className="inline-flex h-12 items-center justify-center gap-2 border border-slate-900/20 bg-white px-6 text-sm font-semibold text-slate-950 hover:border-slate-950"
            >
              So funktioniert es
              <ArrowDown className="size-4" />
            </a>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-slate-600">
            <span className="flex items-center gap-2">
              <Check className="size-4 text-emerald-600" /> Keine Browserüberwachung
            </span>
            <span className="flex items-center gap-2">
              <Check className="size-4 text-emerald-600" /> Jederzeit widerrufbar
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[32rem] lg:mx-0 lg:justify-self-end">
          <div
            aria-hidden="true"
            className="absolute -inset-12 bg-[radial-gradient(circle_at_center,rgba(102,88,211,0.22),transparent_65%)]"
          />
          <div className="relative border border-slate-900/15 bg-[#e7e3da] p-3 shadow-[0_32px_80px_rgba(15,23,42,0.16)] sm:p-5">
            <div className="mb-3 flex items-center gap-1.5" aria-hidden="true">
              <span className="size-2.5 rounded-full bg-slate-400/60" />
              <span className="size-2.5 rounded-full bg-slate-400/40" />
              <span className="size-2.5 rounded-full bg-slate-400/30" />
              <span className="ml-3 h-6 flex-1 border border-slate-900/10 bg-white/70" />
            </div>
            <Image
              src="/product/extension-popup.png"
              alt="Quoska Chrome-Erweiterung mit laufender Arbeitszeit, Tagesfortschritt und Pausensteuerung"
              width={736}
              height={870}
              priority
              unoptimized
              sizes="(max-width: 1024px) 90vw, 500px"
              className="h-auto w-full border border-slate-900/10"
            />
          </div>
          <div className="absolute -bottom-4 -left-3 border border-emerald-700/20 bg-white px-4 py-3 shadow-lg sm:-left-8">
            <p className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <span className="size-2 rounded-full bg-emerald-500" />
              Status immer im Blick
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function BrowserExtensionStep({
  icon: Icon,
  number,
  title,
  children,
}: {
  icon: LucideIcon;
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="border-b border-r border-slate-900/15 p-6">
      <div className="flex items-center justify-between">
        <Icon className="size-5 text-[#5145ad]" />
        <span className="font-mono text-xs text-[#5145ad]">{number}</span>
      </div>
      <h2 className="mt-10 font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{children}</p>
    </article>
  );
}

export function BrowserExtensionPrivacyFact({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <article className="bg-slate-950 p-6">
      <Icon className="size-5 text-[#a99fff]" />
      <h3 className="mt-6 font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
    </article>
  );
}
