import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { FinalCtaSection } from "@/components/marketing/sections/final-cta";

export function MarketingPageShell({
  eyebrow,
  title,
  intro,
  children,
  cta = true,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
  cta?: boolean;
}) {
  return (
    <div className="flex min-h-full flex-col bg-[#f5f3ee]">
      <MarketingNav />
      <main className="flex-1">
        <header className="border-b border-slate-900/10">
          <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-20 lg:py-24">
            <nav aria-label="Brotkrumen" className="flex items-center gap-1.5 text-xs text-slate-600">
              <Link href="/" className="hover:text-[#5145ad]">Startseite</Link>
              <ChevronRight className="size-3.5" aria-hidden="true" />
              <span aria-current="page">{eyebrow}</span>
            </nav>
            <p className="mt-10 text-xs font-semibold uppercase tracking-[0.18em] text-[#5145ad]">
              {eyebrow}
            </p>
            <h1 className="mt-5 max-w-4xl font-serif text-5xl leading-[1.02] tracking-[-0.045em] text-slate-950 sm:text-6xl">
              {title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">{intro}</p>
          </div>
        </header>
        {children}
        {cta && <FinalCtaSection />}
      </main>
      <MarketingFooter />
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5145ad]">{eyebrow}</p>
      <h2 className="mt-4 font-serif text-4xl leading-tight tracking-[-0.035em] text-slate-950 sm:text-5xl">{title}</h2>
      {children && <div className="mt-5 leading-7 text-slate-700">{children}</div>}
    </div>
  );
}
