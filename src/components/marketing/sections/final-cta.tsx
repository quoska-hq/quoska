import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCtaSection() {
  return (
    <section className="bg-[#151618] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1fr_auto] lg:items-end lg:py-24">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a99ff3]">
            Bereit, wenn ihr es seid
          </p>
          <h2 className="mt-4 max-w-3xl font-serif text-4xl leading-tight tracking-[-0.035em] sm:text-5xl lg:text-6xl">
            Die nächste Schicht kann schon in Quoska starten.
          </h2>
          <p className="mt-5 max-w-xl leading-7 text-slate-300">
            Kostenlos mit bis zu drei Personen ausprobieren. Ohne Kreditkarte
            und ohne Installation.
          </p>
        </div>

        <div className="flex flex-col items-start gap-4 lg:items-end">
          <Link href="/register">
            <Button className="h-12 rounded-none bg-[#a99ff3] px-7 text-base text-slate-950 hover:bg-white">
              Account anlegen
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </Link>
          <Link
            href="/login"
            className="text-sm text-slate-300 underline decoration-slate-600 underline-offset-4 hover:text-white"
          >
            Bereits registriert? Anmelden
          </Link>
        </div>
      </div>
    </section>
  );
}
