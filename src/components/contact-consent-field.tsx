"use client";

import { useId } from "react";
import Link from "next/link";
import { CONTACT_CONSENT_LABEL, CONTACT_CONSENT_DETAILS } from "@/types/contact-preferences";

export function ContactConsentField({ checked, onChange, disabled = false }: {
  checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean;
}) {
  const detailsId = useId();
  return (
    <div className="space-y-2 text-sm text-muted-foreground">
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)}
          disabled={disabled} aria-describedby={detailsId} className="mt-1 size-4 shrink-0 accent-[#6658d3]" />
        <span>{CONTACT_CONSENT_LABEL}</span>
      </label>
      <p id={detailsId} className="pl-7 text-xs leading-relaxed">{CONTACT_CONSENT_DETAILS} <Link href="/datenschutz#kontaktmails" className="underline" target="_blank" rel="noreferrer">Datenschutz</Link></p>
    </div>
  );
}
