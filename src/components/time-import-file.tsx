"use client";

import { useRef } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TimeImportFile({ filename, count, busy, completed, onUpload }: {
  filename: string; count: number; busy: boolean; completed: boolean;
  onUpload: (file: File | undefined) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input ref={inputRef} type="file" accept=".csv,text/csv" aria-label="CSV-Datei auswählen" className="hidden" disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void onUpload(file);
        }} />
      {filename ? <div className="flex flex-wrap items-center gap-3 rounded-md bg-muted/50 p-4">
        <FileSpreadsheet aria-hidden="true" className="size-6 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1 basis-32 text-sm">
          <p className="break-words font-medium">{filename}</p>
          <p className="text-muted-foreground">{count} {count === 1 ? "Eintrag" : "Einträge"} in der Datei</p>
        </div>
        <Button variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>{completed ? "Weitere Datei importieren" : "Datei wechseln"}</Button>
      </div> : <button type="button" disabled={busy} onClick={() => inputRef.current?.click()}
        className="flex w-full cursor-pointer flex-col items-center gap-3 rounded-md border-2 border-dashed border-input bg-muted/20 px-4 py-8 text-center transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-wait disabled:opacity-60">
        <Upload aria-hidden="true" className="size-7 text-primary" />
        <span className="font-semibold">{busy ? "Datei wird gelesen…" : "CSV-Datei auswählen"}</span>
        <span className="text-sm text-muted-foreground">CSV UTF-8 · bis zu 2.000 Einträge · maximal 2 MB</span>
      </button>}
    </div>
  );
}
