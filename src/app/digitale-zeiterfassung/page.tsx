import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MarketingPageShell } from "@/components/marketing/page-shell";
import { MarketingSignupLink } from "@/components/marketing/marketing-signup-link";
import { JsonLd } from "@/components/seo/json-ld";
import { site } from "@/lib/site";

const PATH = "/digitale-zeiterfassung";
const TITLE = "Digitale Zeiterfassung einführen: So startet euer Team";
const DESCRIPTION = "Zeiterfassung im kleinen Betrieb einrichten: Firma anlegen, Mitarbeitende einladen und den ersten Arbeitstag erfassen. Mit Produktbild und Tipps für den Start.";
const DATE = "2026-09-11";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: {
    type: "article", title: TITLE, description: DESCRIPTION, url: PATH,
    modifiedTime: DATE,
  },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${site.url}${PATH}#anleitung`,
      headline: TITLE,
      description: DESCRIPTION,
      dateModified: DATE,
      inLanguage: "de-DE",
      mainEntityOfPage: `${site.url}${PATH}`,
      image: `${site.url}/product/mobile-clock.png`,
      author: { "@type": "Organization", name: "Quoska Redaktion", url: `${site.url}/ueber-uns#redaktion` },
      publisher: { "@id": `${site.url}/#organization` },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Startseite", item: site.url },
        { "@type": "ListItem", position: 2, name: "Zeiterfassung einführen", item: `${site.url}${PATH}` },
      ],
    },
  ],
};

export default function DigitalTimeTrackingPage() {
  return (
    <MarketingPageShell
      eyebrow="Zeiterfassung einführen"
      title={TITLE}
      intro="Für den Start braucht ihr die vereinbarten Wochenstunden eures Teams, einen Zugang pro Person und ein Gerät mit Internet. Hier seht ihr am Beispiel von Quoska, wie ihr die Firma einrichtet, Mitarbeitende einladet und den ersten Arbeitstag erfasst."
      cta={false}
    >
      <JsonLd data={STRUCTURED_DATA} />
      <article id="anleitung" className="bg-white">
        <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-14">
          <p className="text-sm text-slate-500">
            <Link href="/ueber-uns#redaktion" className="underline underline-offset-4">Quoska Redaktion</Link>
            {" · "}Aktualisiert am <time dateTime={DATE}>11. September 2026</time>
          </p>
          <p className="mt-6 max-w-3xl leading-7 text-slate-700">
            Bei digitaler Zeiterfassung werden Arbeitsbeginn, Pausen und Arbeitsende
            elektronisch festgehalten. In Quoska funktioniert das im Browser auf
            Computer, Tablet oder Smartphone. Eine App-Installation ist dafür nicht nötig.
            Für bis zu drei aktive Personen ist die Cloud kostenlos.{" "}
            <Link href="/preise" className="text-[#5145ad] underline underline-offset-4">Tarife ansehen</Link>.
          </p>
          <nav aria-label="Schritte zum Start" className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-[#5145ad]">
            <a href="#einrichten" className="underline underline-offset-4">1. Firma einrichten</a>
            <a href="#einladen" className="underline underline-offset-4">2. Team einladen</a>
            <a href="#stempeln" className="underline underline-offset-4">3. Zeiten erfassen</a>
          </nav>

          <section id="einrichten" className="mt-12 scroll-mt-24 border-t border-slate-900/15 pt-8">
            <h2 className="font-serif text-3xl tracking-tight text-slate-950">1. Firma und Arbeitswoche einrichten</h2>
            <div className="mt-5 max-w-3xl space-y-4 leading-7 text-slate-700">
              <p>
                Lege einen Account mit E-Mail und Passwort an. Danach trägst du dein
                Profil, den Firmennamen und das Bundesland ein. Hinterlege die vereinbarten
                Wochenstunden und Arbeitstage. Bei Teilzeit sollten sie zum tatsächlichen
                Arbeitsmodell passen.
              </p>
              <p>
                Bestätige deine E-Mail, prüfe die Übersicht und klicke auf
                „Einrichtung abschließen“. Öffne den Bestätigungslink möglichst im
                selben Browser: Dort bleiben deine vorbereiteten Angaben gespeichert.
              </p>
              <p className="border-l-2 border-[#5145ad] pl-4 text-sm">
                Beispiel: Wer an vier Tagen jeweils sechs Stunden arbeitet, bekommt
                eine Arbeitswoche mit 24 Stunden und einem freien fünften Tag.
              </p>
            </div>
          </section>

          <section id="einladen" className="mt-12 scroll-mt-24 border-t border-slate-900/15 pt-8">
            <h2 className="font-serif text-3xl tracking-tight text-slate-950">2. Mitarbeitende einladen</h2>
            <div className="mt-5 max-w-3xl space-y-4 leading-7 text-slate-700">
              <p>
                Lade dein Team per E-Mail ein. Du kannst das während der Einrichtung
                erledigen oder später unter „Mitarbeiter“. Jede Person nimmt ihre
                Einladung an und legt ein eigenes Passwort fest. Die Einladungen
                sind optional, wenn du zunächst selbst ausprobieren möchtest.
              </p>
              <p>
                Prüft vor dem ersten Tag die Arbeitswoche jeder Person und öffnet
                Quoska auf dem Gerät, das ihr im Alltag nutzt. Geht gemeinsam durch,
                wie ihr Arbeitsbeginn, Pausen und Feierabend erfasst.
              </p>
            </div>
          </section>

          <section id="stempeln" className="mt-12 scroll-mt-24 border-t border-slate-900/15 pt-8">
            <h2 className="font-serif text-3xl tracking-tight text-slate-950">3. Den ersten Arbeitstag erfassen und prüfen</h2>
            <div className="mt-6 grid items-start gap-8 sm:grid-cols-[1fr_240px]">
              <div className="space-y-5 leading-7 text-slate-700">
                <p>Öffne „Stempeln“, sobald deine Arbeit beginnt. Der Ablauf ist auf dem Smartphone und am Computer derselbe:</p>
                <ol className="list-decimal space-y-3 pl-5">
                  <li>Zu Arbeitsbeginn auf „Stempeln“ drücken.</li>
                  <li>Eine tatsächliche Pause mit „Pause starten“ beginnen und mit „Pause beenden“ abschließen.</li>
                  <li>Am Arbeitsende auf „Ausstempeln“ drücken.</li>
                  <li>Den fertigen Eintrag unter „Meine Zeiten“ prüfen; auf dem Smartphone heißt der Navigationspunkt „Zeiten“.</li>
                </ol>
                <p>
                  Wurde eine Buchung vergessen, reicht die betreffende Person eine
                  begründete Korrektur ein. Eine verantwortliche Person prüft sie.
                  Ein offener Timer sollte daher geklärt werden, bevor seine Dauer
                  als geleistete Arbeitszeit übernommen wird.
                </p>
                <p>
                  Wie ein vollständiger Nachweis aussieht, zeigt unser Ratgeber zum{" "}
                  <Link href="/arbeitszeitnachweis" className="text-[#5145ad] underline underline-offset-4">Arbeitszeitnachweis</Link>.
                </p>
              </div>
              <figure className="mx-auto w-full max-w-[240px]">
                <Image
                  src="/product/mobile-clock.png"
                  width={430}
                  height={932}
                  sizes="240px"
                  alt="Quoska auf dem Smartphone: laufender Arbeitstag mit Ausstempeln und Pause starten"
                  className="h-auto w-full border border-slate-900/15"
                />
                <figcaption className="mt-3 text-xs leading-5 text-slate-500">Stempelansicht in Quoska mit Demodaten.</figcaption>
              </figure>
            </div>
          </section>

          <section className="mt-12 border-t border-slate-900/15 pt-8">
            <h2 className="font-serif text-3xl tracking-tight text-slate-950">Wenn beim Start etwas hakt</h2>
            <div className="mt-5 max-w-3xl space-y-6 leading-7 text-slate-700">
              <div>
                <h3 className="font-semibold text-slate-950">Die Bestätigungs-E-Mail fehlt</h3>
                <p className="mt-2">Prüfe den Spamordner. Am Ende der Einrichtung kannst du über „E-Mail erneut senden“ eine neue Bestätigung anfordern. Nach der Bestätigung fehlt noch der Klick auf „Einrichtung abschließen“.</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-950">Bisher liegen die Zeiten in Excel oder auf Papier</h3>
                <p className="mt-2">Vereinbart einen Tag, ab dem ihr in Quoska erfasst, und bewahrt bisherige Nachweise auf. Übertragt alte Zeiten nur einmal und prüft einen vorhandenen Überstunden-Startsaldo, damit nichts doppelt gezählt wird.</p>
              </div>
            </div>
            <p className="mt-7 max-w-3xl text-sm leading-7 text-slate-600">
              Diese Anleitung beschreibt den Einstieg ins Produkt. Welche Regeln
              für die Aufzeichnung gelten, erläutert der Ratgeber zur{" "}
              <Link href="/arbeitszeiterfassung-pflicht-kleinbetriebe" className="text-[#5145ad] underline underline-offset-4">Zeiterfassungspflicht für Kleinbetriebe</Link>.
            </p>
          </section>

          <div className="mt-12 border-t-2 border-slate-950 pt-7">
            <MarketingSignupLink placement="final_cta" className="inline-flex bg-slate-950 px-6 py-3 text-sm font-semibold text-white hover:bg-[#5145ad]">
              Kostenlos mit bis zu 3 Personen starten
            </MarketingSignupLink>
            <p className="mt-4 text-sm text-slate-600">Noch bei der Auswahl? <Link href="/zeiterfassung-kleinbetriebe" className="text-[#5145ad] underline underline-offset-4">Zeiterfassung für Kleinbetriebe im Überblick</Link>.</p>
          </div>
        </div>
      </article>
    </MarketingPageShell>
  );
}
