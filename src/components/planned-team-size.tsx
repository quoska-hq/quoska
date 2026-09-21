"use client";

import { TEAM_SIZES, TEAM_SIZE_LABELS, type PlannedTeamSize } from "@/types/onboarding";

export function PlannedTeamSizeField({ value, onChange, disabled = false }: {
  value: PlannedTeamSize | null; onChange: (value: PlannedTeamSize | null) => void; disabled?: boolean;
}) {
  return <fieldset disabled={disabled} className="space-y-2">
    <legend className="text-sm font-medium">Für wie viele Personen möchtest du Zeiten erfassen? <span className="font-normal text-slate-500">(optional)</span></legend>
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      {[...TEAM_SIZES, "" as const].map(size => <label key={size} className={`relative cursor-pointer rounded-md border px-3 py-2 text-center text-sm has-focus-visible:ring-2 has-focus-visible:ring-[#6658d3] ${value === (size || null) ? "border-[#6658d3] bg-[#f3f0fc] text-[#5548ba]" : "border-slate-200 bg-white text-slate-600"}`}>
        <input className="absolute inset-0 size-full cursor-pointer opacity-0" type="radio" name="planned-team-size" value={size} checked={value === (size || null)} onChange={() => onChange(size || null)} />
        {size ? TEAM_SIZE_LABELS[size] : "Noch offen"}
      </label>)}
    </div>
    <p className="text-xs text-slate-500">Hilft uns, Quoska passend weiterzuentwickeln. Deine Auswahl ändert deinen Tarif nicht.</p>
  </fieldset>;
}
