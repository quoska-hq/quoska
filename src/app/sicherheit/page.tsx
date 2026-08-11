import type { Metadata } from "next";
import Link from "next/link";
import { Archive, EyeOff, Fingerprint, History, LockKeyhole, MapPin } from "lucide-react";
import { MarketingPageShell, SectionHeading } from "@/components/marketing/page-shell";

export const metadata: Metadata = {
  title: "Sicherheit und Datenschutz",
  description:
    "Wie Quoska Beschäftigtendaten schützt: Hosting in Deutschland und Frankfurt, TLS, Tenant-Isolation, Rollen, Audit-Verlauf und verschlüsselte Backups.",
  alternates: { canonical: "/sicherheit" },
};

const CONTROLS = [
  {
    icon: MapPin,
    title: "Kurze, benannte Infrastrukturwege",
    body: "Web-Anwendung auf Hetzner in Nürnberg, PostgreSQL-Datenbank und Authentifizierung in der Supabase-Projektregion Frankfurt am Main.",
  },
  {
    icon: LockKeyhole,
    title: "Verschlüsselte Übertragung",
    body: "Die öffentliche Anwendung ist ausschließlich über HTTPS erreichbar. Sitzungsdaten werden über technisch notwendige Authentifizierungs-Cookies verwaltet.",
  },
  {
    icon: Fingerprint,
    title: "Mandanten und Rollen getrennt",
    body: "PostgreSQL Row-Level Security begrenzt Datenabfragen auf den eigenen Betrieb. Rollen unterscheiden Mitarbeitende, Manager und Administratoren.",
  },
  {
    icon: History,
    title: "Nachvollziehbare Zeitänderungen",
    body: "Zeitkorrekturen erzeugen Audit-Einträge mit Akteur, Zeitpunkt, altem und neuem Wert sowie Begründung. Mitarbeitende ändern Zeiten nicht unbemerkt.",
  },
  {
    icon: Archive,
    title: "Tägliche Sicherung",
    body: "Produktionsdaten werden täglich in ein geschütztes S3-Backup in der AWS-Region Frankfurt exportiert und mit Prüfsumme abgelegt.",
  },
  {
    icon: EyeOff,
    title: "Keine Standort- oder Werbeprofile",
    body: "Quoska erfasst keine GPS-Standorte. Auf der öffentlichen Website laufen derzeit weder Werbetracker noch Webanalyse-Cookies.",
  },
] as const;

export default function SecurityPage() {
  return (
    <MarketingPageShell
      eyebrow="Sicherheit"
      title="Beschäftigtendaten verdienen konkrete Antworten."
      intro="Auf dieser Seite steht nicht nur „sicher“ oder „DSGVO“. Hier steht, wo Quoska betrieben wird, wie Betriebe voneinander getrennt sind und welche Daten bewusst nicht erhoben werden."
    >
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
          <div className="grid border-l border-t border-slate-900/15 md:grid-cols-2 lg:grid-cols-3">
            {CONTROLS.map(({ icon: Icon, title, body }) => (
              <article key={title} className="border-b border-r border-slate-900/15 p-7">
                <Icon className="size-5 text-[#5145ad]" />
                <h2 className="mt-5 font-semibold text-slate-950">{title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-900/10 bg-[#e7e3da]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-20">
          <SectionHeading eyebrow="Verantwortlichkeiten" title="Technik ersetzt keine betriebliche Entscheidung.">
            <p>
              Der Arbeitgeber bleibt für Rechtsgrundlage, Transparenz gegenüber
              Mitarbeitenden, Berechtigungen und betriebliche Regeln verantwortlich.
              Quoska stellt dafür Funktionen und technische Schutzmaßnahmen bereit.
            </p>
          </SectionHeading>
          <div className="border-t-2 border-slate-950 pt-6 text-sm leading-7 text-slate-700">
            <p>
              Die eingesetzten Dienstleister und Verarbeitungszwecke sind in der
              Datenschutzerklärung einzeln aufgeführt. Sicherheitsmeldungen können
              vertraulich an den Betreiber gesendet werden.
            </p>
            <div className="mt-6 flex flex-wrap gap-5 font-semibold text-slate-950">
              <Link href="/datenschutz" className="border-b border-slate-400 hover:border-[#5145ad] hover:text-[#5145ad]">Datenschutzerklärung</Link>
              <a href="mailto:support@quoska.de" className="border-b border-slate-400 hover:border-[#5145ad] hover:text-[#5145ad]">support@quoska.de</a>
            </div>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
