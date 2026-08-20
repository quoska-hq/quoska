"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FreeToolViewTracker, ToolResultCta } from "@/components/free-tools/free-tool-analytics";
import { Field, ResultMetric, ToolPanel, ToolPanelHeader } from "@/components/free-tools/tool-elements";
import { TIMESHEET_GRID, TimesheetRowEditor } from "@/components/free-tools/timesheet-row-editor";
import { trackFreeToolEvent } from "@/lib/free-tool-analytics";
import { currentGermanMonth } from "@/lib/current-german-month";
import { createTimesheetRows } from "@/services/freeToolDateService";
import { buildTimesheetCsv, timesheetFileName } from "@/services/freeToolExportService";
import { calculateTimesheetRow, formatDecimalHours, formatDuration } from "@/services/freeToolTimeService";
import type { TimesheetRow } from "@/types/free-tools";

const TOOL = "stundenzettel" as const;
const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

function monthTitle(month: string): string {
  const [year, number] = month.split("-");
  return `${MONTH_NAMES[Number(number) - 1] ?? number} ${year}`;
}

export function TimesheetCalculator({ initialMonth }: { initialMonth: string }) {
  const [company, setCompany] = useState("");
  const [employee, setEmployee] = useState("");
  const [month, setMonth] = useState(initialMonth);
  const [rowsByMonth, setRowsByMonth] = useState<Record<string, TimesheetRow[]>>({
    [initialMonth]: createTimesheetRows(initialMonth),
  });
  const trackedMonths = useRef(new Set<string>());
  const rows = rowsByMonth[month] ?? createTimesheetRows(month);
  const results = useMemo(() => rows.map(calculateTimesheetRow), [rows]);
  const validRows = results.filter((result) => result.status === "valid");
  const issueCount = results.filter((result) => ["invalid", "incomplete"].includes(result.status)).length;
  const totalMinutes = validRows.reduce((sum, result) => sum + result.netMinutes, 0);

  useEffect(() => {
    const currentMonth = currentGermanMonth().value;
    if (currentMonth === initialMonth) return;
    const timer = window.setTimeout(() => {
      setMonth((selectedMonth) => selectedMonth === initialMonth ? currentMonth : selectedMonth);
      setRowsByMonth((current) => ({
        ...current,
        [currentMonth]: current[currentMonth] ?? createTimesheetRows(currentMonth),
      }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialMonth]);

  useEffect(() => {
    if (validRows.length > 0 && !trackedMonths.current.has(month)) {
      trackedMonths.current.add(month);
      trackFreeToolEvent({ event: "free_tool_calculate", tool: TOOL });
    }
  }, [month, validRows.length]);

  function changeMonth(value: string) {
    if (!/^\d{4}-\d{2}$/.test(value)) return;
    setMonth(value);
    setRowsByMonth((current) => current[value]
      ? current
      : { ...current, [value]: createTimesheetRows(value) });
  }

  function updateRow(updated: TimesheetRow) {
    setRowsByMonth((current) => ({
      ...current,
      [month]: rows.map((row) => row.date === updated.date ? updated : row),
    }));
  }

  function downloadCsv() {
    const csv = buildTimesheetCsv({ company, employee, month, rows, results });
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = timesheetFileName(employee, month);
    link.click();
    URL.revokeObjectURL(url);
    trackFreeToolEvent({ event: "free_tool_export", tool: TOOL, format: "csv" });
  }

  function printPdf() {
    trackFreeToolEvent({ event: "free_tool_export", tool: TOOL, format: "pdf" });
    window.print();
  }

  return (
    <ToolPanel>
      <FreeToolViewTracker tool={TOOL} />
      <div data-timesheet-print>
        <ToolPanelHeader title="Interaktiver Stundenzettel">
          Tage ausfüllen, Monatswerte prüfen und direkt exportieren.
        </ToolPanelHeader>
        <div className="hidden timesheet-print-heading">
          <h1>Stundenzettel · {monthTitle(month)}</h1>
        </div>
        <div className="grid gap-5 border-b border-slate-900/15 p-5 sm:grid-cols-3 sm:p-7">
          <Field label="Unternehmen" htmlFor="timesheet-company"><Input id="timesheet-company" value={company} onChange={(event) => setCompany(event.target.value)} maxLength={100} placeholder="Musterbetrieb GmbH" className="mt-2 h-11 bg-white" /></Field>
          <Field label="Mitarbeitende Person" htmlFor="timesheet-employee"><Input id="timesheet-employee" value={employee} onChange={(event) => setEmployee(event.target.value)} maxLength={100} placeholder="Vor- und Nachname" className="mt-2 h-11 bg-white" /></Field>
          <Field label="Monat" htmlFor="timesheet-month"><Input id="timesheet-month" type="month" value={month} onChange={(event) => changeMonth(event.target.value)} className="mt-2 h-11 bg-white font-mono" /></Field>
        </div>

        <div className={`${TIMESHEET_GRID} hidden border-b border-slate-900/15 bg-[#e7e3da] text-xs font-semibold uppercase tracking-wider text-slate-600 sm:grid`}>
          <span>Datum</span><span>Beginn</span><span>Ende</span><span>Pause</span><span>+1 Tag</span><span className="text-right">Netto</span>
        </div>
        <div>
          {rows.map((row, index) => <TimesheetRowEditor key={row.date} row={row} result={results[index]} onChange={updateRow} />)}
        </div>

        <section aria-live="polite" className="border-t border-slate-900/15 bg-[#f5f3ee] p-5 sm:p-7">
          <div className="grid border-l border-t border-slate-900/15 sm:grid-cols-3">
            <ResultMetric label="Ausgefüllte Tage" value={String(validRows.length)} />
            <ResultMetric label="Monatssumme" value={formatDuration(totalMinutes)} emphasis />
            <ResultMetric label="Dezimalstunden" value={formatDecimalHours(totalMinutes)} />
          </div>
          {issueCount > 0 && <p role="alert" className="mt-4 text-sm text-red-700">{issueCount} {issueCount === 1 ? "Zeile ist" : "Zeilen sind"} unvollständig oder fehlerhaft und nicht in der Summe enthalten.</p>}
          <div data-no-print className="mt-5 flex flex-wrap gap-3">
            <Button type="button" size="lg" className="h-11 rounded-none" onClick={downloadCsv}><Download /> CSV herunterladen</Button>
            <Button type="button" size="lg" variant="outline" className="h-11 rounded-none" onClick={printPdf}><FileText /> PDF / Drucken</Button>
          </div>
          <p data-no-print className="mt-3 text-xs leading-5 text-slate-500">Beim PDF-Export öffnet sich der Druckdialog deines Browsers. Wähle dort „Als PDF speichern“. Namen und Zeiten verlassen den Browser nicht.</p>
          {validRows.length > 0 && <div data-no-print><ToolResultCta tool={TOOL} employerCopy /></div>}
        </section>
      </div>
    </ToolPanel>
  );
}
