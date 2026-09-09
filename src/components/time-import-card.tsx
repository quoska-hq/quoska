"use client";

import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import { useTimeImport } from "@/hooks/use-time-import";
import { TimeImportFile } from "@/components/time-import-file";
import { TimeImportSettings } from "@/components/time-import-settings";
import { TimeImportEmployees } from "@/components/time-import-employees";
import { TimeImportPreview } from "@/components/time-import-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { legalInfo } from "@/lib/site";

const supportMailto = `mailto:${legalInfo.email}?subject=${encodeURIComponent("Hilfe beim Import meiner Arbeitszeiten")}&body=${encodeURIComponent(
  "Hallo Quoska-Team,\n\nich brauche Hilfe beim Import meiner bisherigen Arbeitszeiten.\n\nBisheriges Zeiterfassungssystem:\nZeitraum der Daten:\nWas funktioniert nicht?\nDownload-Link (falls vorhanden):\n\nMeinen Export kann ich alternativ als Datei an diese E-Mail anhängen.\n",
)}`;

export function TimeImportCard() {
  const state = useTimeImport();
  const { csv, result, busy, completed, editing } = state;
  const step = completed ? 3 : !csv ? 0 : editing ? 1 : 2;
  return (
    <Card id="zeitimport" className="scroll-mt-6">
      <CardHeader className="space-y-2">
        <CardTitle>Vergangene Arbeitszeiten importieren</CardTitle>
        <p className="text-sm text-muted-foreground">Übernimm deine bisherigen Zeiten aus einer CSV-Datei. Vor dem Speichern kannst du alles in Ruhe prüfen.</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <ol aria-label="Importfortschritt" className="grid grid-cols-3 gap-2 border-b pb-5">
          {["Datei auswählen", "Angaben prüfen", "Importieren"].map((label, index) => <li key={label} aria-current={step === index ? "step" : undefined}
            className={`flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:text-sm ${step === index ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
            <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs ${step === index ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {step > index ? <Check aria-hidden="true" className="size-3.5" /> : index + 1}
            </span>
            {label}
          </li>)}
        </ol>
        <TimeImportFile filename={state.filename} count={Math.max(0, state.rows.length - 1)} busy={busy} completed={completed} onUpload={state.upload} />
        {!csv && <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">Noch keine passende Datei? <a className="font-medium text-foreground underline underline-offset-4" href="/examples/arbeitszeiten-import.csv" download>CSV-Vorlage herunterladen</a></p>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-medium focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
              Welche Dateien funktionieren? <ChevronDown aria-hidden="true" className="size-4 group-open:rotate-180" />
            </summary>
            <div className="mt-3 space-y-2 text-muted-foreground">
              <p>Nutze einen CSV-Detailbericht mit Datum, Beginn und Ende oder Arbeitsdauer, etwa von Clockify oder Toggl Track. Exportiere ungerundete Zeiten. Tagessummen ohne Beginn reichen nicht aus.</p>
              <p>Pausen bleiben unverändert; ohne Pausenspalte sind es 0 Minuten. Projekte werden als Notiz übernommen. Kunden, Tags und Abrechnungsdaten werden nicht übernommen.</p>
              <p>Excel-Dateien (.xlsx oder .xls) kannst du uns über die Importhilfe unten schicken.</p>
              <div className="flex flex-wrap gap-4">
                <a className="underline" href="https://clockify.me/help/reports/exporting-reports" target="_blank" rel="noreferrer">Export bei Clockify</a>
                <a className="underline" href="https://support.toggl.com/en-us/article/detailed-report-k9bzy2/" target="_blank" rel="noreferrer">Export bei Toggl</a>
              </div>
            </div>
          </details>
        </div>}
        {csv && editing && !completed && <fieldset disabled={busy} className="min-w-0 space-y-5 disabled:opacity-60">
          <TimeImportEmployees key={state.filename} state={state} />
          <TimeImportSettings state={state} />
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" disabled={busy || !state.canPreview} onClick={() => void state.submit("preview")}>{busy ? "Wird geprüft…" : "Import prüfen"}</Button>
            <p className="text-xs text-muted-foreground">Zeigt eine Vorschau. Speichert noch keine Einträge.</p>
          </div>
        </fieldset>}
        {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
        {result && !editing && !completed && <div className="space-y-4">
          <h3 className="text-sm font-semibold">Prüfe deine Arbeitszeiten</h3>
          <TimeImportPreview result={result} />
          {result.errorCount === 0 && result.readyCount > 0 && <p className="text-sm text-muted-foreground">Mit dem Import werden die neuen Zeiten für die zugeordneten Mitarbeiter gespeichert und protokolliert.</p>}
          {result.errorCount === 0 && result.readyCount === 0 && <p className="text-sm">Alle Einträge sind bereits vorhanden. Du musst nichts mehr importieren.</p>}
          <div className="flex flex-wrap gap-3">
            {result.errorCount === 0 && result.readyCount > 0 && <Button size="lg" disabled={busy} onClick={() => void state.submit("import")}>{busy ? "Wird importiert…" : `${result.readyCount} Einträge importieren`}</Button>}
            <Button size="lg" variant="outline" disabled={busy} onClick={state.resetPreview}>Angaben ändern</Button>
          </div>
        </div>}
        {completed && result && <div role="status" className="space-y-3 rounded-md border border-success/30 bg-success/5 p-4 text-sm">
          <p className="flex items-start gap-2 font-medium"><Check aria-hidden="true" className="size-5 shrink-0 text-success" />{result.importedCount} Einträge importiert. {result.duplicateCount} Duplikate übersprungen.</p>
          <p>Prüfe für den Überstundensaldo das Startdatum und den Anfangssaldo in der <Link className="underline" href="/app/employees">Mitarbeiterverwaltung</Link>, damit mitgebrachte Überstunden nicht doppelt zählen.</p>
          <Link className="inline-block underline" href="/app/reports">Arbeitszeiten in den Berichten ansehen</Link>
        </div>}
        <div className="space-y-1 border-t pt-4 text-sm">
          <p className="font-medium">Brauchst du Hilfe beim Import?</p>
          <p className="text-muted-foreground">Schicke uns deinen Export als Anhang oder Download-Link an <a className="font-medium text-foreground underline underline-offset-4" href={supportMailto}>{legalInfo.email}</a>. Wir helfen dir bei der Übernahme.</p>
        </div>
      </CardContent>
    </Card>
  );
}
