import Link from "next/link";
import Image from "next/image";
import { currentYear } from "@/config/server/site-meta";
import { site } from "@/lib/site";

const FOOTER_LINKS = [
  {
    title: "Produkt",
    links: [
      { href: "/funktionen", label: "Funktionen" },
      { href: "/#ablauf", label: "Ablauf" },
      { href: "/preise", label: "Preise" },
      { href: "/projektzeiterfassung", label: "Projektzeiterfassung" },
      { href: "/sicherheit", label: "Sicherheit" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Ratgeber",
    links: [
      { href: "/digitale-zeiterfassung", label: "Digitale Zeiterfassung" },
      { href: "/zeiterfassung-kleinbetriebe", label: "Für Kleinbetriebe" },
      {
        href: "/arbeitszeiterfassung-pflicht-kleinbetriebe",
        label: "Rechtslage 2026",
      },
      { href: "/open-source-zeiterfassung", label: "Open Source" },
      { href: "/arbeitszeitnachweis", label: "Arbeitszeitnachweis" },
      { href: "/pausenregelung-arbeitszeit", label: "Pausenregelung" },
    ],
  },
  {
    title: "Werkzeuge",
    links: [
      { href: "/arbeitszeitrechner", label: "Arbeitszeitrechner" },
      { href: "/stundenzettel", label: "Stundenzettel" },
      { href: "/ueberstundenrechner", label: "Überstundenrechner" },
      { href: "/monatsarbeitszeit-rechner", label: "Monatsarbeitszeit" },
    ],
  },
  {
    title: "Rechtliches",
    links: [
      { href: "/impressum", label: "Impressum" },
      { href: "/datenschutz", label: "Datenschutzerklärung" },
      { href: "/agb", label: "AGB" },
      { href: "/widerruf", label: "Widerrufsrecht" },
    ],
  },
  {
    title: "Konto",
    links: [
      { href: "/login", label: "Anmelden" },
      { href: "/register", label: "Registrieren" },
    ],
  },
] as const;

/** Shared marketing footer with all legally required links. */
export function MarketingFooter() {
  const year = currentYear;

  return (
    <footer className="border-t border-slate-900/10 bg-[#f5f3ee]">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-16">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-6">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/icons/logo.png"
                alt="Quoska"
                width={122}
                height={125}
                className="h-[26px] w-auto shrink-0"
              />
              <span className="text-lg font-bold tracking-tight text-slate-900">
                Quoska
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-600">
              Eine klare Zeiterfassung für den Arbeitsalltag in deutschen
              Betrieben.
            </p>
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-slate-600">
              Entwickelt in Deutschland
            </p>
            <a
              href={site.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-800 transition-colors hover:text-[#5145ad]"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-4 fill-current"
              >
                <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.4c.58.1.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.77 2.72 1.26 3.38.96.1-.75.4-1.26.74-1.55-2.57-.29-5.27-1.28-5.27-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.16 1.18a10.96 10.96 0 0 1 5.75 0c2.19-1.49 3.16-1.18 3.16-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.7 5.38-5.28 5.67.42.36.79 1.06.79 2.14v3.18c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" />
              </svg>
              Open Source auf GitHub
            </a>
          </div>

          {FOOTER_LINKS.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                {group.title}
              </h3>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-600 transition-colors hover:text-[#5145ad]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-slate-300 pt-6 text-xs text-slate-600 sm:flex-row sm:items-center">
          <p>© {year} Quoska — Zeiterfassung für deutsche KMU.</p>
          <p className="text-slate-600">
            Alle Rechte vorbehalten. Irrtümer vorbehalten.
          </p>
        </div>
      </div>
    </footer>
  );
}
