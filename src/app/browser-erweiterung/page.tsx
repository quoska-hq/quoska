import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  Clock3,
  Coffee,
  FolderKanban,
  KeyRound,
  MousePointerClick,
  Puzzle,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import {
  CHROME_WEB_STORE_URL,
  getChromeWebStoreUrl,
} from "@/config/browser-extension-store";
import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingNav } from "@/components/marketing/nav";
import {
  BrowserExtensionHero,
  BrowserExtensionPrivacyFact,
  BrowserExtensionStep,
} from "@/components/marketing/browser-extension-elements";
import { SectionHeading } from "@/components/marketing/page-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { site } from "@/lib/site";

const PATH = "/browser-erweiterung";

export const metadata: Metadata = {
  title: "Chrome-Erweiterung für Zeiterfassung",
  description:
    "Mit der Quoska Chrome-Erweiterung Arbeitszeit und Pausen direkt in der Browserleiste erfassen – ohne Browserverlauf oder Seiteninhalte zu lesen.",
  alternates: { canonical: PATH },
  openGraph: {
    title: "Quoska für Chrome – Zeiterfassung in der Browserleiste",
    description:
      "Einstempeln, Pausen starten und Arbeitszeit sehen, ohne die Web-App offen zu halten.",
    url: PATH,
  },
};

const FEATURES = [
  {
    icon: Clock3,
    title: "Ein- und ausstempeln",
    body: "Arbeitsbeginn und Feierabend mit einem Klick direkt in der Browserleiste erfassen.",
  },
  {
    icon: Coffee,
    title: "Pausen steuern",
    body: "Pause starten, beenden und den aktuellen Zustand jederzeit eindeutig sehen.",
  },
  {
    icon: FolderKanban,
    title: "Projekt und Notiz",
    body: "Beim Einstempeln ein zugewiesenes Projekt und optional eine kurze Notiz mitgeben.",
  },
  {
    icon: TimerReset,
    title: "Tagesfortschritt sehen",
    body: "Laufende Arbeitszeit und Fortschritt zur heutigen Sollzeit bleiben direkt im Blick.",
  },
] as const;

const FAQ = [
  {
    question: "Brauche ich ein Quoska-Konto?",
    answer:
      "Ja. Die Erweiterung ergänzt die Quoska-Zeiterfassung und wird einmalig mit einem bestehenden Quoska-Konto verbunden.",
  },
  {
    question: "Liest die Erweiterung meinen Browserverlauf?",
    answer:
      "Nein. Sie liest weder besuchte Seiten noch Seiteninhalte oder den Browserverlauf. Die Erweiterung kommuniziert ausschließlich mit quoska.de.",
  },
  {
    question: "Kostet die Chrome-Erweiterung zusätzlich?",
    answer:
      "Nein. Die Erweiterung selbst verursacht keine zusätzlichen Kosten. Für die Nutzung ist ein aktives Quoska-Konto erforderlich.",
  },
  {
    question: "Wie trenne ich ein verlorenes oder altes Gerät?",
    answer:
      "Unter Einstellungen → Browser-Erweiterungen kannst du jede aktive Verbindung sofort widerrufen.",
  },
] as const;

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Quoska Zeiterfassung für Chrome",
      description:
        "Browser-Erweiterung zum Ein- und Ausstempeln, Steuern von Pausen und Anzeigen des eigenen Arbeitszeitstatus.",
      url: `${site.url}${PATH}`,
      installUrl: CHROME_WEB_STORE_URL,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Google Chrome",
      inLanguage: "de-DE",
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
      provider: { "@id": `${site.url}/#organization` },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ],
};

export default function BrowserExtensionPage() {
  return (
    <div className="flex min-h-full flex-col bg-[#f5f3ee]">
      <MarketingNav />
      <main className="flex-1">
        <JsonLd data={JSON_LD} />

        <BrowserExtensionHero />

        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
            <SectionHeading
              eyebrow="Alles Wichtige im Popup"
              title="Weniger Tabwechsel. Derselbe Quoska-Ablauf."
            >
              <p>
                Die Erweiterung ergänzt die Web-App genau dort, wo die tägliche
                Zeiterfassung möglichst schnell sein soll. Alle Buchungen landen
                weiterhin im selben Quoska-Konto.
              </p>
            </SectionHeading>
            <div className="mt-12 grid border-l border-t border-slate-900/15 md:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <article
                  key={title}
                  className="border-b border-r border-slate-900/15 p-7"
                >
                  <Icon className="size-5 text-[#5145ad]" />
                  <h2 className="mt-8 font-semibold text-slate-950">{title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="so-funktionierts"
          className="scroll-mt-20 border-y border-slate-900/10 bg-[#e7e3da]"
        >
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
            <SectionHeading eyebrow="In drei Schritten" title="Installieren. Verbinden. Stempeln.">
              <p>
                Die Verbindung wird bewusst von dir gestartet und in Quoska
                bestätigt. Dein Passwort wird dabei nicht an die Erweiterung
                weitergegeben.
              </p>
            </SectionHeading>
            <div className="grid border-l border-t border-slate-900/15 bg-white sm:grid-cols-3">
              <BrowserExtensionStep icon={Puzzle} number="01" title="Installieren">
                Erweiterung aus dem Chrome Web Store hinzufügen und in der
                Browserleiste anheften.
              </BrowserExtensionStep>
              <BrowserExtensionStep icon={KeyRound} number="02" title="Verbinden">
                Mit dem bestehenden Quoska-Konto anmelden und den Zugriff einmalig
                bestätigen.
              </BrowserExtensionStep>
              <BrowserExtensionStep icon={MousePointerClick} number="03" title="Stempeln">
                Popup öffnen und Arbeitszeit oder Pause direkt über die klaren
                Aktionen steuern.
              </BrowserExtensionStep>
            </div>
          </div>
        </section>

        <section className="bg-slate-950 text-white">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-20">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a99fff]">
                Datenschutz
              </p>
              <h2 className="mt-4 max-w-xl font-serif text-4xl leading-tight tracking-[-0.035em] sm:text-5xl">
                Zeiterfassung, nicht Browserüberwachung.
              </h2>
              <p className="mt-6 max-w-xl leading-7 text-slate-300">
                Die Erweiterung hat einen eng begrenzten Zweck: deinen eigenen
                Quoska-Status anzeigen und ausdrücklich ausgelöste Zeitaktionen
                übertragen.
              </p>
            </div>
            <div className="grid gap-px border border-white/15 bg-white/15 sm:grid-cols-2">
              <BrowserExtensionPrivacyFact
                icon={ShieldCheck}
                title="Kein Browserverlauf"
                body="Keine besuchten URLs, Seiteninhalte, Suchanfragen oder automatische Browseraktivität."
              />
              <BrowserExtensionPrivacyFact
                icon={KeyRound}
                title="Kein Passwort in der Erweiterung"
                body="Die Verbindung nutzt eine einmalige Freigabe und einen separat widerrufbaren Zugang."
              />
              <BrowserExtensionPrivacyFact
                icon={Puzzle}
                title="Nur quoska.de"
                body="Die Erweiterung kommuniziert ausschließlich verschlüsselt mit der Quoska-Domain."
              />
              <BrowserExtensionPrivacyFact
                icon={TimerReset}
                title="Serverseitige Zeitstempel"
                body="Buchungen werden genauso verarbeitet wie Aktionen in der Quoska-Webanwendung."
              />
            </div>
            <Link
              href="/datenschutz"
              className="font-semibold text-[#c7c0ff] hover:text-white lg:col-start-2"
            >
              Details in der Datenschutzerklärung →
            </Link>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-6 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
            <SectionHeading eyebrow="Häufige Fragen" title="Kurz beantwortet." />
            <div className="border-t border-slate-900/20">
              {FAQ.map((item) => (
                <article key={item.question} className="border-b border-slate-900/20 py-6">
                  <h2 className="font-semibold text-slate-950">{item.question}</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                    {item.answer}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-900/10 bg-[#6658d3] text-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-16 sm:px-6 sm:py-20 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                Bereit für weniger Klicks?
              </p>
              <h2 className="mt-4 max-w-3xl font-serif text-4xl leading-tight tracking-[-0.035em] sm:text-5xl">
                Quoska dorthin bringen, wo du ohnehin arbeitest.
              </h2>
              <p className="mt-5 max-w-2xl leading-7 text-white/80">
                Kostenlos installieren, einmal verbinden und direkt aus der
                Chrome-Browserleiste stempeln.
              </p>
            </div>
            <a
              href={getChromeWebStoreUrl("landing-final")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 bg-white px-6 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-950 hover:text-white"
            >
              In Chrome hinzufügen
              <ArrowUpRight className="size-4" />
            </a>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
