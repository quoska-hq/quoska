"use client";

import { useState, type FormEvent } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FreeToolViewTracker, ToolResultCta } from "@/components/free-tools/free-tool-analytics";
import {
  Field,
  ResultMetric,
  ToolPanel,
  ToolPanelHeader,
} from "@/components/free-tools/tool-elements";
import { trackFreeToolEvent } from "@/lib/free-tool-analytics";
import {
  calculateWorkTime,
  durationFromDecimal,
  formatDecimalHours,
  formatDuration,
  parseDuration,
} from "@/services/freeToolTimeService";
import type { WorkTimeError, WorkTimeResult } from "@/types/free-tools";

const TOOL = "arbeitszeitrechner" as const;
const ERROR_MESSAGES: Record<WorkTimeError, string> = {
  "invalid-time": "Bitte gib Beginn und Ende vollständig ein.",
  "overnight-required": "Das Ende liegt vor dem Beginn. Aktiviere „Ende am Folgetag“.",
  "invalid-break": "Pausen müssen als ganze, positive Minuten angegeben werden.",
  "break-exceeds-presence": "Die Pausen sind länger als die gesamte Anwesenheit.",
  "invalid-target": "Die Sollzeit muss im Format Stunden:Minuten stehen.",
};

interface BreakInput { id: number; minutes: string }

export function WorkTimeCalculator() {
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("16:30");
  const [breaks, setBreaks] = useState<BreakInput[]>([{ id: 1, minutes: "30" }]);
  const [nextBreakId, setNextBreakId] = useState(2);
  const [crossesMidnight, setCrossesMidnight] = useState(false);
  const [target, setTarget] = useState("08:00");
  const [result, setResult] = useState<WorkTimeResult | null>(null);
  const [error, setError] = useState<WorkTimeError | null>(null);
  const [durationValue, setDurationValue] = useState("08:00");
  const [decimalValue, setDecimalValue] = useState("8,00");

  function calculate(event: FormEvent) {
    event.preventDefault();
    const targetMinutes = target.trim() === "" ? null : parseDuration(target);
    const calculation = calculateWorkTime({
      start,
      end,
      breakMinutes: breaks.map((item) => Number(item.minutes)),
      crossesMidnight,
      targetMinutes,
    });
    setResult(calculation.result);
    setError(calculation.error);
    if (calculation.result) {
      trackFreeToolEvent({ event: "free_tool_calculate", tool: TOOL });
    }
  }

  function addBreak() {
    setBreaks((current) => [...current, { id: nextBreakId, minutes: "15" }]);
    setNextBreakId((current) => current + 1);
  }

  function updateBreak(id: number, value: string) {
    setBreaks((current) => current.map((item) => item.id === id ? { ...item, minutes: value } : item));
  }

  function convertDuration(value: string) {
    setDurationValue(value);
    const parsed = parseDuration(value);
    if (parsed !== null) setDecimalValue(formatDecimalHours(parsed));
  }

  function convertDecimal(value: string) {
    setDecimalValue(value);
    const parsed = durationFromDecimal(value);
    if (parsed !== null) setDurationValue(formatDuration(parsed));
  }

  return (
    <ToolPanel>
      <FreeToolViewTracker tool={TOOL} />
      <ToolPanelHeader title="Arbeitszeit berechnen">
        Nettozeit, Dezimalstunden und Zeitkonto – ohne Anmeldung.
      </ToolPanelHeader>
      <form onSubmit={calculate} className="p-5 sm:p-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Arbeitsbeginn" htmlFor="work-start">
            <Input id="work-start" type="time" value={start} onChange={(event) => setStart(event.target.value)} className="mt-2 h-11 font-mono" required />
          </Field>
          <Field label="Arbeitsende" htmlFor="work-end">
            <Input id="work-end" type="time" value={end} onChange={(event) => setEnd(event.target.value)} className="mt-2 h-11 font-mono" required />
          </Field>
        </div>

        <label className="mt-4 flex items-start gap-3 border border-slate-900/10 bg-white p-4 text-sm text-slate-700">
          <input type="checkbox" checked={crossesMidnight} onChange={(event) => setCrossesMidnight(event.target.checked)} className="mt-0.5 size-4 accent-[#6658d3]" />
          <span><strong className="text-slate-950">Ende am Folgetag</strong><span className="mt-1 block text-xs text-slate-500">Für Nachtschichten ausdrücklich aktivieren; der Rechner rät nicht.</span></span>
        </label>

        <fieldset className="mt-6 border-t border-slate-900/15 pt-6">
          <legend className="text-sm font-semibold text-slate-800">Pausen</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {breaks.map((item, index) => (
              <div key={item.id} className="flex items-end gap-2">
                <Field label={`Pause ${index + 1} (Minuten)`} htmlFor={`break-${item.id}`}>
                  <Input id={`break-${item.id}`} type="number" min="0" max="1440" step="1" value={item.minutes} onChange={(event) => updateBreak(item.id, event.target.value)} className="mt-2 h-11 font-mono" required />
                </Field>
                {breaks.length > 1 && (
                  <Button type="button" variant="outline" size="icon-lg" aria-label={`Pause ${index + 1} entfernen`} onClick={() => setBreaks((current) => current.filter((entry) => entry.id !== item.id))}>
                    <Minus />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button type="button" variant="ghost" className="mt-3" onClick={addBreak}><Plus /> Weitere Pause</Button>
        </fieldset>

        <div className="mt-6 max-w-sm">
          <Field label="Sollzeit (optional)" htmlFor="work-target" hint="Format hh:mm, zum Beispiel 07:48. Leer lassen, wenn du keinen Saldo brauchst.">
            <Input id="work-target" inputMode="numeric" value={target} onChange={(event) => setTarget(event.target.value)} placeholder="08:00" className="mt-2 h-11 font-mono" />
          </Field>
        </div>

        {error && <p role="alert" className="mt-5 border border-red-300 bg-red-50 p-4 text-sm text-red-800">{ERROR_MESSAGES[error]}</p>}
        <Button type="submit" size="lg" className="mt-6 h-12 rounded-none px-6">Arbeitszeit berechnen</Button>
      </form>

      {result && (
        <section aria-live="polite" className="border-t border-slate-900/15 bg-white p-5 sm:p-7">
          <h3 className="text-lg font-semibold text-slate-950">Dein Ergebnis</h3>
          <div className="mt-4 grid border-l border-t border-slate-900/15 sm:grid-cols-2 lg:grid-cols-5">
            <ResultMetric label="Anwesenheit" value={formatDuration(result.grossMinutes)} />
            <ResultMetric label="Pausen" value={formatDuration(result.breakMinutes)} />
            <ResultMetric label="Nettoarbeitszeit" value={formatDuration(result.netMinutes)} emphasis />
            <ResultMetric label="Dezimalstunden" value={formatDecimalHours(result.netMinutes)} />
            <ResultMetric label="Saldo" value={result.balanceMinutes === null ? "—" : formatDuration(result.balanceMinutes, true)} />
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Formel: {formatDuration(result.grossMinutes)} Anwesenheit − {formatDuration(result.breakMinutes)} Pause = <strong className="text-slate-950">{formatDuration(result.netMinutes)} Arbeitszeit</strong>. Es wird minutengenau gerechnet; nur die Dezimalanzeige wird auf zwei Stellen gerundet.
          </p>
          <ToolResultCta tool={TOOL} />
        </section>
      )}

      <section className="border-t border-slate-900/15 bg-[#e7e3da] p-5 sm:p-7">
        <h3 className="font-semibold text-slate-950">hh:mm und Dezimalstunden umrechnen</h3>
        <div className="mt-4 grid items-end gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <Field label="Stunden:Minuten" htmlFor="duration-converter"><Input id="duration-converter" value={durationValue} onChange={(event) => convertDuration(event.target.value)} inputMode="numeric" className="mt-2 h-11 bg-white font-mono" /></Field>
          <span className="hidden pb-3 text-slate-400 sm:block">↔</span>
          <Field label="Dezimalstunden" htmlFor="decimal-converter"><Input id="decimal-converter" value={decimalValue} onChange={(event) => convertDecimal(event.target.value)} inputMode="decimal" className="mt-2 h-11 bg-white font-mono" /></Field>
        </div>
      </section>
    </ToolPanel>
  );
}
