import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/funktionen", label: "Funktionen" },
  { href: "/#ablauf", label: "Ablauf" },
  { href: "/sicherheit", label: "Sicherheit" },
  { href: "/preise", label: "Preise" },
] as const;

/**
 * Shared marketing navigation with a compact mobile menu.
 * Used on landing page and as a lighter variant on legal pages.
 */
export function MarketingNav({
  variant = "default",
}: {
  variant?: "default" | "legal";
}) {
  return (
    <header className="relative sticky top-0 z-50 border-b border-slate-900/10 bg-[#f5f3ee]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="Quoska — Startseite"
        >
          <Image
            src="/icons/logo.png"
            alt="Quoska"
            width={122}
            height={125}
            className="h-[26px] w-auto shrink-0"
          />
          <span className="text-lg font-bold tracking-[-0.03em] text-slate-950">
            Quoska
          </span>
        </Link>

        {variant === "default" && (
          <>
            <nav className="hidden items-center gap-1 md:flex">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-[#5145ad]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="hidden items-center gap-2 md:flex">
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-none text-slate-600 hover:bg-transparent hover:text-[#5145ad]"
                >
                  Anmelden
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  size="sm"
                  className="rounded-none bg-slate-950 text-white hover:bg-[#5145ad]"
                >
                  Kostenlos testen
                </Button>
              </Link>
            </div>

            <details className="group md:hidden">
              <summary
                className="inline-flex size-10 list-none items-center justify-center text-slate-700 hover:text-[#5145ad] [&::-webkit-details-marker]:hidden"
                aria-label="Menü öffnen"
              >
                <Menu className="size-5 group-open:hidden" />
                <X className="hidden size-5 group-open:block" />
              </summary>
              <div className="fixed inset-x-0 top-16 border-t border-slate-900/10 bg-[#f5f3ee] shadow-[0_18px_40px_rgba(15,23,42,0.10)]">
                <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-3 sm:px-6">
                  {NAV_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="border-b border-slate-900/10 px-1 py-3 text-sm font-medium text-slate-700 hover:text-[#5145ad]"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Link href="/login">
                      <Button variant="outline" size="sm" className="w-full rounded-none">
                        Anmelden
                      </Button>
                    </Link>
                    <Link href="/register">
                      <Button size="sm" className="w-full rounded-none bg-slate-950 text-white hover:bg-[#5145ad]">
                        Testen
                      </Button>
                    </Link>
                  </div>
                </nav>
              </div>
            </details>
          </>
        )}

        {variant === "legal" && (
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-slate-600">
              ← Zur Startseite
            </Button>
          </Link>
        )}
      </div>

    </header>
  );
}
