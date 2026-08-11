/**
 * Central site + legal configuration.
 *
 * ⚠️  IMPRESSUM / DATENSCHUTZ PLACEHOLDERS
 * -----------
 * Operator name and address were confirmed against issued invoices and the
 * ELSTER registration record on 2026-08-02. The production domain was purchased
 * on 2026-08-09. The production contact mailbox was verified on 2026-08-10.
 *
 * The legal prose in the legal pages (DDG/§5, DSGVO/Art. 13, AGB) is template
 * text and is canonical — only the operator fields need real data.
 */

export const site = {
  name: "Quoska",
  tagline: "Zeiterfassung für deutsche KMU",
  /** Production origin — set NEXT_PUBLIC_APP_URL in .env */
  url: process.env.NEXT_PUBLIC_APP_URL ?? "https://quoska.de",
  githubUrl: "https://github.com/quoska-hq/quoska",
  /** Hero / marketing language is German (de-DE). */
  locale: "de-DE",
} as const;

/**
 * Operator (Anbieter i.S.d. § 5 DDG / § 18 MStV).
 *
 * Never add personal tax or banking identifiers here. Only information meant
 * for public display belongs in this object.
 */
export const legalInfo = {
  operatorName: "Oskar Kuiper" as string,
  legalForm: "Einzelunternehmer" as string,
  street: "Heesestraße 1a" as string,
  zipCity: "30449 Hannover" as string,
  country: "Deutschland",
  /** Publish a dedicated business number only if one is intentionally added. */
  phone: null as string | null,
  email: "support@quoska.de" as string,
  /** Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG. */
  vatId: null as string | null,
  /** The personal tax number is deliberately not published. */
  taxNumber: null as string | null,
  /** No register entry is currently applicable/confirmed. */
  registry: null as string | null,
  /** Berufshaftpflichtversicherung — Pflichtangabe nur für freie Berufe. */
  insurance: null as string | null,
  /** Verantwortlich für den Inhalt i.S.d. § 18 Abs. 2 MStV. */
  responsibleForContent:
    "Oskar Kuiper, Heesestraße 1a, 30449 Hannover" as string,
  /**
   * Verbraucherstreitbeilegung statement for the public imprint.
   */
  disputeResolution:
    "Wir sind nicht verpflichtet und nicht bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen." as string,
  /** Redaktionell Verantwortlicher gemäß § 18 Abs. 2 MStV. */
  supervisoryAuthority: null as string | null,
} as const;

/**
 * Service providers for the DSGVO disclosure. Keep this list aligned with the
 * actual production deployment and the signed provider agreements.
 */
export const processors = [
  {
    name: "Supabase Inc.",
    purpose: "Authentifizierung, Datenbank (PostgreSQL) und Dateispeicher",
    location:
      "Projektregion Frankfurt am Main; weitere Verarbeitung nach DPA und Unterauftragsverarbeiterliste",
    privacyUrl: "https://supabase.com/privacy",
    website: "https://supabase.com",
  },
  {
    name: "Hetzner Online GmbH",
    purpose: "Hosting der Web-Anwendung und Server-Logfiles",
    location: "Nürnberg, Deutschland",
    privacyUrl: "https://www.hetzner.com/legal/privacy-policy/",
    website: "https://www.hetzner.com",
  },
  {
    name: "Stripe Payments Europe, Limited",
    purpose: "Zahlungsabwicklung, Abonnements und Rechnungsbereitstellung",
    location:
      "Irland; weitere Verarbeitung und internationale Übermittlungen nach Stripe-DPA",
    privacyUrl: "https://stripe.com/de/privacy",
    website: "https://stripe.com",
  },
] as const;

/** Quick check used to surface a visible warning in dev when placeholders remain. */
export function hasUnfilledLegalInfo(): boolean {
  return Object.values(legalInfo).some(
    (v) => typeof v === "string" && v.includes("[TODO:")
  );
}
