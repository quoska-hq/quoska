import type {
  PlanningDemand,
  PlanningProfile,
  PlanningTemplate,
} from "@/types/planning";
import { planningProfileSchema } from "@/types/planning-schemas";

/** Setup guidance only; server validation remains authoritative. */
export function planningProfileMissing(profile: PlanningProfile): string[] {
  const missing: string[] = [];
  if (profile.eligibility !== "adult_standard")
    missing.push("Arbeitszeitregeln prüfen");
  if (!profile.locationIds.length) missing.push("Filiale auswählen");
  if (!profile.skillIds.length) missing.push("Aufgaben auswählen");
  if (!profile.availability.length) missing.push("verfügbare Zeiten eintragen");
  if (!profile.historyConfirmed) missing.push("bisherige Arbeitszeiten prüfen");
  if (!profile.externalWorkConfirmed)
    missing.push("weitere Beschäftigungen prüfen");
  if (!planningProfileSchema.safeParse(profile).success)
    missing.push("ungültige Zeitangaben korrigieren");
  return missing;
}

/** Copies full coverage, including breaks. Overnight coverage needs explicit day rules. */
export function planningDemandsFromTemplates(
  templates: PlanningTemplate[],
  createId: () => string,
): PlanningDemand[] | null {
  const active = templates.filter((template) => template.active);
  if (active.some((template) => template.nextDay)) return null;
  return active.map((template) => ({
    id: createId(),
    locationId: template.locationId,
    skillId: template.skillId,
    days: [...template.days],
    start: template.start,
    end: template.end,
    count: template.count,
    holidayMode: template.holidayMode,
  }));
}
