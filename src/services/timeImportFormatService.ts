import type { ImportColumns, TimeImportInput } from "@/types/time-import";

/** Suggest only unambiguous formats. Numeric durations and slash dates need a choice. */
export function suggestTimeImportFormats(rows: string[][], columns: ImportColumns): {
  dateFormat: TimeImportInput["dateFormat"] | "";
  durationFormat: TimeImportInput["durationFormat"] | "";
} {
  const values = (indexes: (number | undefined)[]) => rows.slice(1).flatMap((row) =>
    indexes.flatMap((index) => index === undefined || !row[index] ? [] : [row[index]]));
  const dates = values([columns.date, columns.endDate]);
  const durations = values([columns.duration]);
  const dateFormat = dates.length && dates.every((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)) ? "YYYY-MM-DD"
    : dates.length && dates.every((date) => /^\d{2}\.\d{2}\.\d{4}$/.test(date)) ? "DD.MM.YYYY" : "";
  const durationFormat = durations.every((duration) => /^\d{1,3}:[0-5]\d(?::[0-5]\d)?$/.test(duration)) ? "clock" : "";
  return { dateFormat, durationFormat };
}
