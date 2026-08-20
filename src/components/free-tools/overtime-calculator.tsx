"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FreeToolViewTracker, ToolResultCta } from "@/components/free-tools/free-tool-analytics";
import { Field, ResultMetric, ToolPanel, ToolPanelHeader } from "@/components/free-tools/tool-elements";
import { trackFreeToolEvent } from "@/lib/free-tool-analytics";
import {
  calculateOvertimeBalance,
  formatDecimalHours,
  formatDuration,
  parseDuration,
} from "@/services/freeToolTimeService";

const TOOL = "ueberstundenrechner" as const;
type Period = "day" | "week" | "month";
const PERIODS: Array<{ id: Period; label: string; target: string }> = [
  { id: "day", label: "Tag", target: "08:00" },
  { id: "week", label: "Woche", target: "40:00" },
  { id: "month", label: "Monat", target: "160:00" },
];

interface BalanceResult {
  targetMinutes: number;
  actualMinutes: number;
  priorMinutes: number;
  balanceMinutes: number;
  timeOffDays: number | null;
}

export function OvertimeCalculator() {
  const [period, setPeriod] = useState<Period>("week");
  const [target, setTarget] = useState("40:00");
  const [actual, setActual] = useState("42:00");
  const [prior, setPrior] = useState("+00:00");
  const [daily, setDaily] = useState("08:00");
  const [result, setResult] = useState<BalanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function selectPeriod(next: Period) {
    const defaultTarget = PERIODS.find((item) => item.id === next)?.target ?? "08:00";
    setPeriod(next);
    setTarget(defaultTarget);
    setActual(defaultTarget);
    setResult(null);
    setError(null);
  }

  function calculate(event: FormEvent) {
    event.preventDefault();
    const targetMinutes = parseDuration(target);
    const actualMinutes = parseDuration(actual);
    const priorMinutes = parseDuration(prior, true);
    const dailyMinutes = parseDuration(daily);
    if (targetMinutes === null || actualMinutes === null || priorMinutes === null || dailyMinutes === null || dailyMinutes <= 0) {
      setResult(null);
      setError("Bitte verwende das Format hh:mm. Beim bisherigen Saldo sind + und − erlaubt.");
      return;
    }
    const balance = calculateOvertimeBalance({ targetMinutes, actualMinutes, priorBalanceMinutes: priorMinutes, dailyMinutes });
    setResult({ targetMinutes, actualMinutes, priorMinutes, ...balance });
    setError(null);
    trackFreeToolEvent({ event: "free_tool_calculate", tool: TOOL });
  }

  return (
    <ToolPanel>
      <FreeToolViewTracker tool={TOOL} />
      <ToolPanelHeader title="Überstunden und Unterstunden berechnen">
        Sollzeit, Istzeit und bisherigen Saldo transparent zusammenführen.
      </ToolPanelHeader>
      <form onSubmit={calculate} className="p-5 sm:p-7">
        <fieldset>
          <legend className="text-sm font-semibold text-slate-800">Zeitraum</legend>
          <div className="mt-2 inline-flex border border-slate-900/15 bg-white p-1">
            {PERIODS.map((item) => (
              <button key={item.id} type="button" aria-pressed={period === item.id} onClick={() => selectPeriod(item.id)} className={`px-4 py-2 text-sm font-semibold transition-colors ${period === item.id ? "bg-slate-950 text-white" : "text-slate-600 hover:text-[#5145ad]"}`}>
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Vertragliche Sollzeit" htmlFor="overtime-target" hint="Für den gewählten Tag, die Woche oder den Monat.">
            <Input id="overtime-target" value={target} onChange={(event) => setTarget(event.target.value)} inputMode="numeric" placeholder="40:00" className="mt-2 h-11 bg-white font-mono" required />
          </Field>
          <Field label="Tatsächliche Arbeitszeit" htmlFor="overtime-actual">
            <Input id="overtime-actual" value={actual} onChange={(event) => setActual(event.target.value)} inputMode="numeric" placeholder="42:00" className="mt-2 h-11 bg-white font-mono" required />
          </Field>
          <Field label="Bisheriger Saldo" htmlFor="overtime-prior" hint="Zum Beispiel +02:30 oder -01:15.">
            <Input id="overtime-prior" value={prior} onChange={(event) => setPrior(event.target.value)} inputMode="text" placeholder="+00:00" className="mt-2 h-11 bg-white font-mono" required />
          </Field>
          <Field label="Stunden je Arbeitstag" htmlFor="overtime-daily" hint="Nur für die Umrechnung des Ergebnisses in freie Arbeitstage.">
            <Input id="overtime-daily" value={daily} onChange={(event) => setDaily(event.target.value)} inputMode="numeric" placeholder="08:00" className="mt-2 h-11 bg-white font-mono" required />
          </Field>
        </div>
        {error && <p role="alert" className="mt-5 border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
        <Button type="submit" size="lg" className="mt-6 h-12 rounded-none px-6">Saldo berechnen</Button>
      </form>

      {result && (
        <section aria-live="polite" className="border-t border-slate-900/15 bg-white p-5 sm:p-7">
          <h3 className="text-lg font-semibold text-slate-950">Ergebnis für {PERIODS.find((item) => item.id === period)?.label.toLowerCase()}</h3>
          <div className="mt-4 grid border-l border-t border-slate-900/15 sm:grid-cols-2 lg:grid-cols-4">
            <ResultMetric label="Sollzeit" value={formatDuration(result.targetMinutes)} />
            <ResultMetric label="Istzeit" value={formatDuration(result.actualMinutes)} />
            <ResultMetric label="Neuer Saldo" value={formatDuration(result.balanceMinutes, true)} emphasis>
              {formatDecimalHours(result.balanceMinutes)} Dezimalstunden
            </ResultMetric>
            <ResultMetric label="Entspricht" value={result.timeOffDays === null ? "—" : `${result.timeOffDays.toLocaleString("de-DE", { maximumFractionDigits: 2 })} Tagen`}>
              Rechnerischer Wert auf Basis deiner Tagesstunden; kein Anspruchsnachweis.
            </ResultMetric>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Formel: {formatDuration(result.actualMinutes)} Ist − {formatDuration(result.targetMinutes)} Soll {result.priorMinutes < 0 ? "−" : "+"} {formatDuration(Math.abs(result.priorMinutes))} bisheriger Saldo = <strong className="text-slate-950">{formatDuration(result.balanceMinutes, true)}</strong>.
          </p>
          <ToolResultCta tool={TOOL} />
        </section>
      )}
    </ToolPanel>
  );
}
