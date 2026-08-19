import type { Metadata } from "next";
import Link from "next/link";
import { isAllowedBrowserExtensionRedirect } from "@/config/server/browser-extension";
import { addExtensionCallbackParams } from "@/lib/browser-extension-auth";
import { browserExtensionAuthorizationSchema } from "@/types/browser-extension";

export const metadata: Metadata = {
  title: "Browser-Erweiterung verbinden | Quoska",
  robots: { index: false, follow: false },
};

interface ConnectPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function BrowserExtensionConnectPage({
  searchParams,
}: ConnectPageProps) {
  const params = await searchParams;
  const parsed = browserExtensionAuthorizationSchema.safeParse({
    redirectUri: first(params.redirect_uri),
    state: first(params.state),
    codeChallenge: first(params.code_challenge),
  });

  if (!parsed.success || !isAllowedBrowserExtensionRedirect(parsed.data.redirectUri)) {
    return (
      <section className="mx-auto max-w-xl border-t-2 border-red-500 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-600">
          Verbindung abgelehnt
        </p>
        <h1 className="mt-3 font-serif text-3xl tracking-[-0.035em] text-slate-950">
          Ungültige Erweiterungsanfrage
        </h1>
        <p className="mt-4 leading-7 text-slate-600">
          Öffne die Verbindung erneut direkt aus der Quoska-Erweiterung. Es
          wurden keine Zugriffsrechte erteilt.
        </p>
        <Link className="mt-6 inline-block font-semibold text-[#6658d3]" href="/app/dashboard">
          Zurück zum Dashboard
        </Link>
      </section>
    );
  }

  const cancelUrl = addExtensionCallbackParams(parsed.data.redirectUri, {
    error: "access_denied",
    state: parsed.data.state,
  }).toString();

  return (
    <section className="mx-auto max-w-xl border-t-2 border-slate-950 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6658d3]">
        Browser-Erweiterung
      </p>
      <h1 className="mt-3 font-serif text-3xl tracking-[-0.035em] text-slate-950">
        Quoska verbinden
      </h1>
      <p className="mt-4 leading-7 text-slate-600">
        Die Erweiterung möchte deinen aktuellen Stempelstatus anzeigen und
        Stempel-, Pausen- und Projektaktionen in deinem Namen ausführen.
      </p>

      <div className="mt-6 border border-slate-900/15 bg-[#f5f3ee] p-4">
        <h2 className="font-semibold text-slate-950">Die Erweiterung darf</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
          <li>• deinen eigenen Stempelstatus und zugewiesene Projekte lesen</li>
          <li>• dich ein- und ausstempeln sowie Pausen starten und beenden</li>
        </ul>
        <p className="mt-4 border-t border-slate-900/10 pt-4 text-sm leading-6 text-slate-600">
          Sie erhält weder dein Passwort noch deinen Browserverlauf und kann
          keine anderen Quoska-Bereiche lesen.
        </p>
      </div>

      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <a
          href={cancelUrl}
          className="inline-flex h-10 items-center justify-center border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Abbrechen
        </a>
        <form action="/api/v1/browser-extension/authorize" method="post">
          <input type="hidden" name="redirect_uri" value={parsed.data.redirectUri} />
          <input type="hidden" name="state" value={parsed.data.state} />
          <input type="hidden" name="code_challenge" value={parsed.data.codeChallenge} />
          <button
            type="submit"
            className="inline-flex h-10 w-full items-center justify-center bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-[#6658d3]"
          >
            Erweiterung verbinden
          </button>
        </form>
      </div>
    </section>
  );
}
