import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Cloud,
  Code2,
  Database,
  Server,
  ShieldCheck,
} from "lucide-react";
import {
  MarketingPageShell,
  SectionHeading,
} from "@/components/marketing/page-shell";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Open-Source-Zeiterfassung für kleine Betriebe",
  description:
    "Open-Source-Zeiterfassung aus Deutschland: Quellcode unter AGPL-3.0 prüfen, selbst hosten oder als verwaltete Cloud-Version nutzen.",
  alternates: { canonical: "/open-source-zeiterfassung" },
};

const OPEN_SOURCE_FACTS = [
  {
    icon: Code2,
    title: "Öffentlicher Anwendungscode",
    body: "Die produktive Cloud-Version und selbst gehostete Installationen basieren auf demselben öffentlichen Repository.",
  },
  {
    icon: ShieldCheck,
    title: "AGPL-3.0-Lizenz",
    body: "Der Code darf geprüft, betrieben und angepasst werden. Die Lizenzbedingungen bleiben dabei transparent und nachlesbar.",
  },
  {
    icon: Database,
    title: "Nachvollziehbare Datengrenzen",
    body: "PostgreSQL Row-Level Security, Rollen und Audit-Felder sind nicht nur versprochen, sondern im Code und in den Migrationen sichtbar.",
  },
] as const;

const SELF_HOSTING_CHECKLIST = [
  "Node.js 20+, Docker und Supabase CLI bereitstellen",
  "Supabase-Projekt, Authentifizierung und Datenbank konfigurieren",
  "HTTPS, Domain und sichere Produktionsvariablen einrichten",
  "Backups, Updates und Überwachung selbst verantworten",
  "Lizenzhinweise bei eigenen Änderungen beachten",
] as const;

const SOFTWARE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareSourceCode",
  name: "Quoska",
  description:
    "Open-Source-Zeiterfassung für kleine Betriebe und Teams in Deutschland.",
  codeRepository: site.githubUrl,
  license: "https://www.gnu.org/licenses/agpl-3.0.html",
  programmingLanguage: ["TypeScript", "SQL"],
  runtimePlatform: ["Node.js", "Docker", "Web browser"],
  targetProduct: {
    "@type": "SoftwareApplication",
    name: "Quoska",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: site.url,
  },
};

export default function OpenSourceTimeTrackingPage() {
  return (
    <MarketingPageShell
      eyebrow="Open Source"
      title="Open-Source-Zeiterfassung, die auch verwaltet laufen kann."
      intro="Quoska verbindet eine öffentlich prüfbare Codebasis mit zwei Betriebswegen: selbst hosten oder die verwaltete Cloud-Version nutzen. So bleibt nachvollziehbar, wie Arbeitszeiten, Rollen und Änderungen technisch verarbeitet werden."
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_JSON_LD) }}
      />

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
          <SectionHeading
            eyebrow="Offene Codebasis"
            title="Nicht nur eine öffentliche Produktseite."
          >
            <p>
              Im Repository stehen Anwendungscode, Datenbankmigrationen,
              Schutzregeln und Deployment-Dokumentation zusammen. Technische
              Entscheidungen lassen sich dadurch bis zur Implementierung
              verfolgen.
            </p>
          </SectionHeading>

          <div className="mt-12 grid border-l border-t border-slate-900/15 md:grid-cols-3">
            {OPEN_SOURCE_FACTS.map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="border-b border-r border-slate-900/15 p-7"
              >
                <Icon className="size-5 text-[#5145ad]" />
                <h2 className="mt-5 text-lg font-semibold text-slate-950">
                  {title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-900/10 bg-[#e7e3da]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
          <SectionHeading
            eyebrow="Betriebsmodell"
            title="Selbst hosten oder betreiben lassen."
          >
            <p>
              Beide Wege verwenden dieselbe Anwendung. Der Unterschied liegt
              darin, wer Infrastruktur, Updates und Datensicherung verantwortet.
            </p>
          </SectionHeading>

          <div className="mt-12 grid gap-px border border-slate-900/15 bg-slate-900/15 lg:grid-cols-2">
            <OperatingModel
              icon={Cloud}
              eyebrow="Quoska Cloud"
              title="Direkt im Browser starten"
              points={[
                "Hosting, Updates und Backups werden übernommen",
                "Keine eigene Server-Infrastruktur notwendig",
                "Kostenlos mit bis zu drei Personen nutzbar",
                "Monatlich kündbare Flatrates für größere Teams",
              ]}
            >
              <Link
                href="/preise"
                className="inline-flex items-center gap-2 font-semibold text-slate-950 hover:text-[#5145ad]"
              >
                Cloud-Preise ansehen <ArrowUpRight className="size-4" />
              </Link>
            </OperatingModel>
            <OperatingModel
              icon={Server}
              eyebrow="Self-Hosting"
              title="In eigener Umgebung betreiben"
              points={[
                "Eigene Kontrolle über Betrieb und Infrastruktur",
                "Anpassungen am öffentlichen Code möglich",
                "Docker- und Hetzner-Referenz für den Produktionsbetrieb",
                "Updates, Backups und Verfügbarkeit liegen beim Betreiber",
              ]}
            >
              <a
                href={site.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 font-semibold text-slate-950 hover:text-[#5145ad]"
              >
                Repository öffnen <ArrowUpRight className="size-4" />
              </a>
            </OperatingModel>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <SectionHeading
            eyebrow="Self-Hosting"
            title="Offener Code ersetzt keinen sicheren Betrieb."
          >
            <p>
              Wer selbst hostet, entscheidet bewusst über Server, Datenbank,
              Updates und Wiederherstellung. Das schafft Kontrolle, bringt aber
              auch laufende Verantwortung mit sich.
            </p>
          </SectionHeading>

          <div>
            <ul className="border-t border-slate-900/15">
              {SELF_HOSTING_CHECKLIST.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 border-b border-slate-900/15 py-5 text-sm leading-6 text-slate-700"
                >
                  <Check className="mt-0.5 size-4 shrink-0 text-[#5145ad]" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold">
              <a
                href={`${site.githubUrl}#schnellstart`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-slate-950 hover:text-[#5145ad]"
              >
                Schnellstart <ArrowUpRight className="size-4" />
              </a>
              <a
                href={`${site.githubUrl}/blob/main/docs/deployment-hetzner.md`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-slate-950 hover:text-[#5145ad]"
              >
                Deployment-Referenz <ArrowUpRight className="size-4" />
              </a>
              <Link
                href="/sicherheit"
                className="inline-flex items-center gap-2 text-slate-950 hover:text-[#5145ad]"
              >
                Sicherheitsmodell <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}

function OperatingModel({
  icon: Icon,
  eyebrow,
  title,
  points,
  children,
}: {
  icon: typeof Cloud;
  eyebrow: string;
  title: string;
  points: readonly string[];
  children: React.ReactNode;
}) {
  return (
    <article className="bg-white p-7 sm:p-9">
      <Icon className="size-5 text-[#5145ad]" />
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-[#5145ad]">
        {eyebrow}
      </p>
      <h2 className="mt-3 font-serif text-3xl tracking-[-0.035em] text-slate-950">
        {title}
      </h2>
      <ul className="mt-7 space-y-3">
        {points.map((point) => (
          <li key={point} className="flex gap-3 text-sm leading-6 text-slate-700">
            <Check className="mt-0.5 size-4 shrink-0 text-[#5145ad]" />
            {point}
          </li>
        ))}
      </ul>
      <div className="mt-8 text-sm">{children}</div>
    </article>
  );
}
