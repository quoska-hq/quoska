import type { EmailOtpType } from "@supabase/supabase-js";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/config/supabase/server";

function safeNextPath(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/app/dashboard";
  }
  return value;
}

function getParam(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null;
}

async function confirmAuthEmail(formData: FormData) {
  "use server";

  const tokenHash = formData.get("token_hash");
  const type = formData.get("type");
  const next = safeNextPath(formData.get("next"));

  if (typeof tokenHash !== "string" || typeof type !== "string") {
    redirect("/login?error=auth");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as EmailOtpType,
  });

  if (error) {
    redirect("/login?error=auth");
  }

  redirect(next);
}

const CONTENT: Partial<Record<EmailOtpType, { eyebrow: string; title: string; text: string; button: string }>> = {
  email: {
    eyebrow: "E-Mail bestätigen",
    title: "Ein letzter Klick",
    text: "Bestätige deine E-Mail-Adresse, damit du Quoska sicher verwenden kannst.",
    button: "E-Mail-Adresse bestätigen",
  },
  invite: {
    eyebrow: "Einladung",
    title: "Willkommen bei Quoska",
    text: "Nimm die Einladung an und lege anschließend dein persönliches Passwort fest.",
    button: "Einladung annehmen",
  },
  recovery: {
    eyebrow: "Passwort zurücksetzen",
    title: "Neues Passwort anlegen",
    text: "Bestätige zuerst diese Anfrage. Danach kannst du ein neues Passwort festlegen.",
    button: "Weiter zum neuen Passwort",
  },
  email_change: {
    eyebrow: "E-Mail ändern",
    title: "Neue Adresse bestätigen",
    text: "Bestätige die Änderung deiner E-Mail-Adresse für dein Quoska-Konto.",
    button: "Änderung bestätigen",
  },
};

export default async function ConfirmAuthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tokenHash = getParam(params.token_hash);
  const type = getParam(params.type) as EmailOtpType | null;
  const next = getParam(params.next) ?? "/app/dashboard";
  const content = type ? CONTENT[type] : null;

  if (!tokenHash || !type || !content) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f3ee] p-4">
        <div className="w-full max-w-md border-t-2 border-slate-950 bg-white p-8 shadow-sm">
          <h1 className="font-serif text-3xl tracking-[-0.035em] text-slate-950">Link ungültig</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Dieser Link ist unvollständig oder abgelaufen. Fordere bitte eine neue E-Mail an.
          </p>
          <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-[#6658d3] hover:text-slate-950">
            Zur Anmeldung
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f3ee] p-4">
      <div className="w-full max-w-md border-t-2 border-slate-950 bg-white p-8 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6658d3]">
          {content.eyebrow}
        </p>
        <h1 className="font-serif text-3xl tracking-[-0.035em] text-slate-950">{content.title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">{content.text}</p>

        <form action={confirmAuthEmail} className="mt-7">
          <input type="hidden" name="token_hash" value={tokenHash} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="next" value={safeNextPath(next)} />
          <button
            type="submit"
            className="h-10 w-full rounded-sm bg-slate-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-[#6658d3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6658d3]/40"
          >
            {content.button}
          </button>
        </form>

        <p className="mt-5 text-xs leading-5 text-slate-400">
          Die Bestätigung erfolgt erst nach diesem Klick. Dadurch können automatische Link-Prüfungen die Aktion nicht versehentlich auslösen.
        </p>
      </div>
    </main>
  );
}
