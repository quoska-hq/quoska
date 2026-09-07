import { MAX_IMPORT_BYTES, MAX_IMPORT_ROWS, type ImportColumns } from "@/types/time-import";

/** RFC 4180 quoting, also accepting semicolon/tab delimiters and UTF-8 BOM. */
export function readTimeImportCsv(csv: string, delimiter: string): string[][] {
  if (new TextEncoder().encode(csv).length > MAX_IMPORT_BYTES) throw new Error("Die Datei darf höchstens 2 MB groß sein.");
  if (csv.includes("\uFFFD") || csv.includes("\0")) throw new Error("Bitte speichere die Datei als CSV mit UTF-8-Zeichensatz.");
  const text = csv.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let closed = false;
  const pushField = () => {
    row.push(field.trim());
    if (row.length > 100) throw new Error("Die Datei darf höchstens 100 Spalten enthalten.");
    field = "";
    closed = false;
  };
  const pushRow = () => {
    pushField();
    if (row.some(Boolean)) rows.push(row);
    if (rows.length > MAX_IMPORT_ROWS + 1) throw new Error(`Bitte teile die Datei in höchstens ${MAX_IMPORT_ROWS} Einträge pro Import auf.`);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else field += char;
    } else if (char === delimiter) pushField();
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      pushRow();
    } else if (char === '"' && !field && !closed) quoted = true;
    else {
      if (closed || char === '"') throw new Error(`Ungültige CSV-Anführungszeichen bei Datensatz ${rows.length + 1}.`);
      field += char;
    }
  }
  if (quoted) throw new Error("Ein Anführungszeichen in der CSV-Datei wurde nicht geschlossen.");
  if (field || row.length || closed) pushRow();
  if (rows.length < 2) throw new Error("Die Datei muss eine Kopfzeile und mindestens einen Eintrag enthalten.");
  if (rows[0].some((header) => !header) || new Set(rows[0].map((h) => h.toLowerCase())).size !== rows[0].length) {
    throw new Error("Jede Spalte braucht eine eindeutige Überschrift.");
  }
  return rows;
}

export function detectTimeImportDelimiter(csv: string): "," | ";" | "\t" {
  let best: "," | ";" | "\t" = ",";
  let count = 0;
  for (const delimiter of [",", ";", "\t"] as const) {
    try {
      const rows = readTimeImportCsv(csv, delimiter);
      if (rows[0].length > count) { count = rows[0].length; best = delimiter; }
    } catch { /* The selected delimiter will report the actual parse error. */ }
  }
  return best;
}

export function suggestTimeImportColumns(headers: string[]): ImportColumns {
  const aliases: Record<keyof ImportColumns, string[]> = {
    employee: ["email", "e-mail", "mitarbeiter", "user", "member"],
    date: ["start date", "startdatum", "datum", "date"],
    start: ["start time", "startzeit", "beginn"],
    endDate: ["end date", "enddatum"],
    end: ["end time", "endzeit", "ende"],
    duration: ["duration (h)", "duration", "dauer"],
    break: ["pause (min)", "pause", "break minutes", "break_minutes"],
    notes: ["description", "beschreibung", "notizen", "notes"],
    project: ["project", "projekt"],
  };
  const normalized = headers.map((h) => h.toLowerCase().trim());
  const columns: ImportColumns = {};
  for (const key of Object.keys(aliases) as (keyof ImportColumns)[]) {
    const index = aliases[key].map((alias) => normalized.indexOf(alias)).find((i) => i >= 0);
    if (index !== undefined) columns[key] = index;
  }
  return columns;
}
