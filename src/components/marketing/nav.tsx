"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/#features", label: "Produkt" },
  { href: "/#ablauf", label: "Ablauf" },
  { href: "/#preise", label: "Preise" },
  { href: "/#faq", label: "Fragen" },
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
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-900/10 bg-[#f5f3ee]/95 backdrop-blur-sm">
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
                  className="px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-[#6658d3]"
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
                  className="rounded-none text-slate-600 hover:bg-transparent hover:text-[#6658d3]"
                >
                  Anmelden
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  size="sm"
                  className="rounded-none bg-slate-950 text-white hover:bg-[#6658d3]"
                >
                  Kostenlos testen
                </Button>
              </Link>
            </div>

            {/* Mobile toggle */}
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center text-slate-700 hover:text-[#6658d3] md:hidden"
              aria-label={open ? "Menü schließen" : "Menü öffnen"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
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

      {/* Mobile menu */}
      {variant === "default" && open && (
        <div className="border-t border-slate-900/10 bg-[#f5f3ee] md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-3 sm:px-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="border-b border-slate-900/10 px-1 py-3 text-sm font-medium text-slate-700 hover:text-[#6658d3]"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link href="/login" onClick={() => setOpen(false)}>
                <Button variant="outline" size="sm" className="w-full rounded-none">
                  Anmelden
                </Button>
              </Link>
              <Link href="/register" onClick={() => setOpen(false)}>
                <Button
                  size="sm"
                  className="w-full rounded-none bg-slate-950 text-white hover:bg-[#6658d3]"
                >
                  Testen
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
