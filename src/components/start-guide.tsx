"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ArrowRight, Check, X, ListChecks, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlannedTeamSizeField } from "@/components/planned-team-size";
import { TEAM_SIZE_LABELS, type PlannedTeamSize, type StartGuideStatus } from "@/types/onboarding";
import { useSupabase } from "@/providers/supabase-provider";

export function StartGuide() {
  const cache = useQueryClient();
  const { user } = useSupabase();
  const queryKey = ["startGuide", user?.id];
  const [editingSize, setEditingSize] = useState(false);
  const [choice, setChoice] = useState<PlannedTeamSize | null>(null);
  const query = useQuery<StartGuideStatus>({ queryKey, enabled: Boolean(user), staleTime: 0, refetchOnMount: "always", queryFn: async () => {
    const response = await fetch("/api/v1/onboarding");
    if (!response.ok) throw new Error("Startliste konnte nicht geladen werden.");
    return (await response.json()).data;
  } });
  const mutation = useMutation({ mutationFn: async (input: { plannedTeamSize?: PlannedTeamSize | null; dismissed?: boolean }) => {
    const response = await fetch("/api/v1/onboarding", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return result.data as StartGuideStatus;
  }, onSuccess: (data) => { cache.setQueryData(queryKey, data); setEditingSize(false); } });
  const data = query.data;
  if (!data) return query.isError ? <p className="text-sm text-slate-500">Die Starthilfe ist gerade nicht verfügbar. <button className="underline" onClick={() => void query.refetch()}>Erneut laden</button></p> : null;
  const error = mutation.isError && <p role="alert" className="text-sm text-red-700">{mutation.error.message}</p>;
  if (data.dismissed) return <div>{error}<Button variant="ghost" size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate({ dismissed: false })}><ListChecks className="size-4" />Starthilfe anzeigen</Button></div>;
  const steps = [
    { done: data.invited, title: "Erste Person einladen", text: "Dein Team erhält einen eigenen Zugang.", href: "/app/employees" },
    { done: data.recorded, title: "Erste Arbeitszeit erfassen", text: "Arbeitsbeginn und Feierabend erfassen oder eine Zeit nachtragen.", href: "/app/clock" },
    { done: data.exported, title: "Ersten Bericht exportieren", text: "Erfasste Zeiten prüfen und als CSV herunterladen.", href: "/app/reports" },
  ];
  const completed = steps.filter(step => step.done).length;
  return <section data-testid="start-guide" className="rounded-lg border border-[#6658d3]/20 bg-[#faf9fd] p-4 sm:p-6">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-xs font-medium uppercase tracking-wider text-[#6658d3]">Schritt für Schritt</p><h2 className="mt-1 text-lg font-semibold">Dein Start mit Quoska</h2><p className="mt-1 text-sm text-slate-600">{completed === 3 ? "Alles erledigt. Dein Team kann loslegen." : "Diese Schritte helfen dir beim Einstieg. Du bestimmst die Reihenfolge."}</p></div>
      <Button variant="ghost" size="icon-sm" aria-label="Startliste ausblenden" disabled={mutation.isPending} onClick={() => mutation.mutate({ dismissed: true })}><X className="size-4" /></Button>
    </div>
    <p className="mt-4 text-xs font-medium text-slate-500">{completed} von 3 Schritten erledigt</p>
    <ol className="mt-2 grid gap-2 lg:grid-cols-3">
      {steps.map((step, index) => <li key={step.href}><Link href={step.href} className="flex h-full items-start gap-3 rounded-md border border-slate-200 bg-white p-4 transition-colors hover:border-[#6658d3]/50">
        <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs ${step.done ? "bg-emerald-50 text-emerald-700" : "bg-[#f3f0fc] text-[#6658d3]"}`}>{step.done ? <Check className="size-4" aria-label="Erledigt" /> : index + 1}</span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{step.title}</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">{step.text}</span></span><ArrowRight className="mt-1 size-4 shrink-0 text-slate-400" />
      </Link></li>)}
    </ol>
    <Link href="/app/settings#zeitimport" className="mt-3 flex items-center gap-2 text-sm text-[#5548ba]"><Upload className="size-4 shrink-0" />{data.imported ? "Vorhandene Zeiten übernommen – weitere importieren" : "Bisherige Zeiten übernehmen (optional)"}</Link>
    <div className="mt-5 border-t border-[#6658d3]/10 pt-4">
      {editingSize ? <div className="space-y-3"><PlannedTeamSizeField value={choice} onChange={setChoice} disabled={mutation.isPending} /><div className="flex gap-2"><Button size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate({ plannedTeamSize: choice })}>{mutation.isPending ? "Wird gespeichert…" : "Angabe speichern"}</Button><Button size="sm" variant="ghost" disabled={mutation.isPending} onClick={() => setEditingSize(false)}>Abbrechen</Button></div></div>
        : <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><p className="text-slate-600">{data.plannedTeamSize ? `Geplant: ${TEAM_SIZE_LABELS[data.plannedTeamSize]}` : "Wie groß soll dein Team in Quoska werden?"}</p><Button variant="outline" size="sm" onClick={() => { setChoice(data.plannedTeamSize); setEditingSize(true); }}>{data.plannedTeamSize ? "Angabe ändern" : "Freiwillig angeben"}</Button></div>}
    </div>
    {error}
  </section>;
}
