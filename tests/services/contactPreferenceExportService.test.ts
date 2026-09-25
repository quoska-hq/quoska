import { expect, it } from "vitest";
import { generateContactPreferenceCSV } from "@/services/contactPreferenceExportService";
it("exports consent history with German dates and neutralizes spreadsheet formulas", () => {
  const csv = generateContactPreferenceCSV([{ id: 1, email: '=SUM(1)@example.test', enabled: false,
    text_version: 'v1', consent_text: 'Text, mit Komma', source: 'settings', created_at: '2026-09-25T08:00:00Z' }]);
  expect(csv).toContain('25.09.2026');
  expect(csv).toContain("'=SUM(1)@example.test");
  expect(csv).toContain('Widerrufen');
  expect(csv).toContain('"Text, mit Komma"');
});
