import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { currentYear } from "@/config/server/site-meta";

const PRODUCT_POINTS = [
  "Zeiten und Pausen an einem Ort",
  "Korrekturen mit nachvollziehbarem Verlauf",
  "Bis drei Personen kostenlos",
] as const;

export default function AuthLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="flex min-h-screen bg-[#f5f3ee]">
      <aside className="relative hidden w-[480px] shrink-0 flex-col justify-between border-r border-slate-900/15 bg-[#dcd8cf] p-10 lg:flex xl:w-[520px]">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/icons/logo.png"
            alt="Quoska"
            width={122}
            height={125}
            className="h-7 w-auto"
          />
          <span className="text-lg font-bold tracking-[-0.03em] text-slate-950">
            Quoska
          </span>
        </Link>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6658d3]">
            Der einfache Arbeitstag
          </p>
          <h1 className="mt-5 max-w-sm font-serif text-5xl leading-[1.04] tracking-[-0.04em] text-slate-950">
            Zeiterfassung, die nicht im Weg steht.
          </h1>
          <p className="mt-5 max-w-sm leading-7 text-slate-600">
            Für Mitarbeitende schnell verstanden. Für Verantwortliche sauber
            nachvollziehbar.
          </p>
          <ul className="mt-8 border-t border-slate-900/20">
            {PRODUCT_POINTS.map((point) => (
              <li
                key={point}
                className="flex items-center gap-3 border-b border-slate-900/20 py-4 text-sm text-slate-700"
              >
                <Check className="size-4 shrink-0 text-[#6658d3]" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <p>© {currentYear} Quoska</p>
          <p>
            <Link href="/datenschutz" className="hover:text-[#6658d3]">
              Datenschutz
            </Link>
            {" · "}
            <Link href="/impressum" className="hover:text-[#6658d3]">
              Impressum
            </Link>
          </p>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <Image
                src="/icons/logo.png"
                alt="Quoska"
                width={122}
                height={125}
                className="h-[30px] w-auto"
              />
              <span className="text-xl font-bold tracking-[-0.03em] text-slate-950">
                Quoska
              </span>
            </Link>
            <p className="mt-3 text-sm text-slate-500">
              Zeiterfassung für dein Team
            </p>
          </div>
          <div className="border-t-2 border-slate-950 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
