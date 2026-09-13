import Link from "next/link";
import { Download, ArrowRight } from "lucide-react";

export function TimesheetTemplateLinks({ calculatorHref = "/stundenzettel#vorlage" }: { calculatorHref?: string }) {
  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-4">
        <a href="/downloads/stundenzettel-monat.pdf" download className="inline-flex items-center gap-2 bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white hover:bg-[#5145ad]">
          <Download className="size-4" aria-hidden="true" /> Leere Monatsvorlage (PDF)
        </a>
        <Link href={calculatorHref} className="inline-flex items-center gap-2 py-3 text-sm font-semibold text-[#5145ad] underline underline-offset-4">
          Online ausfüllen und berechnen <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Kostenlos, ohne Anmeldung. PDF: eine A4-Seite zum Ausdrucken. Online: automatische Summen, CSV-Export und Druckansicht.</p>
    </div>
  );
}
