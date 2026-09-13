// Regenerate the public blank sheet: node scripts/generate-timesheet-template.mjs
// Requires Playwright Chromium; optionally set CHROMIUM_EXECUTABLE_PATH.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const output = fileURLToPath(new URL("../public/downloads/", import.meta.url));
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}),
});
try {
  const page = await browser.newPage();
  await page.setContent(`<!doctype html><html lang="de"><head><meta charset="utf-8">
    <title>Stundenzettel – leere Monatsvorlage | Quoska</title><style>
    @page { size: A4; margin: 13mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font: 10pt Arial, sans-serif; color: #17202b; }
    h1 { font-size: 24pt; margin: 0 0 3mm; }
    .brand { float: right; font-weight: bold; letter-spacing: 2px; }
    .intro { margin: 0 0 7mm; color: #475569; }
    .field { display: inline-block; border-bottom: 1px solid #64748b; height: 6mm; }
    .identity { margin: 3mm 0; }
    table { border-collapse: collapse; width: 100%; margin-top: 6mm; font-size: 9pt; }
    th, td { border: 1px solid #94a3b8; padding: 1mm 2mm; }
    th { height: 11mm; text-align: left; background: #f1f5f9; }
    td { height: 4.7mm; }
    .sum { text-align: right; height: 7mm; }
    .notes { font-size: 8.5pt; line-height: 1.5; margin-top: 4mm; }
    footer { border-top: 1px solid #94a3b8; padding-top: 3mm; margin-top: 4mm; font-size: 8pt; }
    a { color: inherit; }
    </style></head><body>
    <span class="brand">QUOSKA</span><h1>Stundenzettel</h1>
    <p class="intro">Monatlicher Arbeitszeitnachweis · eine Person pro Blatt</p>
    <p class="identity">Unternehmen: <span class="field" style="width:148mm"></span></p>
    <p class="identity">Name: <span class="field" style="width:110mm"></span> Monat/Jahr: <span class="field" style="width:35mm"></span></p>
    <table><thead><tr><th>Datum</th><th>Beginn<br>Uhrzeit</th><th>Ende<br>Uhrzeit / Datum*</th><th>Pause<br>Minuten</th><th>Arbeitszeit<br>Stunden:Minuten</th></tr></thead>
    <tbody>${Array.from({ length: 31 }, () => "<tr><td></td><td></td><td></td><td></td><td></td></tr>").join("")}</tbody>
    <tfoot><tr><th colspan="4" class="sum">Monatssumme (Stunden:Minuten)</th><td></td></tr></tfoot></table>
    <div class="notes">Arbeitszeit = Ende − Beginn − tatsächlich genommene Pausen. Beispiel: 08:00–16:30, 30 Minuten Pause = 08:00 Stunden.<br>
    * Bei Arbeit über Mitternacht auch das Enddatum eintragen. Freie Zeilen streichen; mehrere Arbeitsblöcke können eigene Zeilen erhalten.<br>
    Die Vorlage summiert nicht automatisch. Korrekturen nachvollziehbar dokumentieren; Urlaub und Krankheit gesondert führen.</div>
    <footer>Vorlage und Berechnung: <a href="https://quoska.de/stundenzettel">quoska.de/stundenzettel</a> · Hinweise zu Aufzeichnung und Fristen: <a href="https://quoska.de/arbeitszeitnachweis">quoska.de/arbeitszeitnachweis</a></footer>
    </body></html>`);
  await mkdir(output, { recursive: true });
  await page.pdf({ path: `${output}/stundenzettel-monat.pdf`, preferCSSPageSize: true, printBackground: true, tagged: true });
  console.log("Created public/downloads/stundenzettel-monat.pdf");
} finally {
  await browser.close();
}
