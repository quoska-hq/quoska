import type {
  PlanningContext,
  PlanningIssue,
  PlanningState,
} from "@/types/planning";
import { planningShiftIssues } from "@/services/planningShiftRules";
import { planningTimelineIssues } from "@/services/planningTimelineRules";
import { planningCoverageIssues } from "@/services/planningCoverageService";

export function validatePlanning(
  state: PlanningState,
  context: PlanningContext,
  month?: string,
): PlanningIssue[] {
  const selected = state.periods.filter(
    (p) => p.status !== "closed" && (!month || p.month === month),
  );
  const future = state.periods
    .flatMap((p) => p.shifts)
    .filter((s) => Date.parse(s.start) >= Date.parse(context.now));
  const issues = selected.flatMap((p) =>
    p.shifts
      .filter((s) => Date.parse(s.start) >= Date.parse(context.now))
      .flatMap((s) => planningShiftIssues(state, context, s)),
  );
  const config = state.config;
  const refs = [
    ...config.locations.map((v) => v.id),
    ...config.skills.map((v) => v.id),
    ...config.templates.map((v) => v.id),
    ...config.demands.map((v) => v.id),
  ];
  if (
    new Set(refs).size !== refs.length ||
    new Set(config.profiles.map((p) => p.employeeId)).size !==
      config.profiles.length
  )
    issues.push({
      code: "duplicate",
      severity: "error",
      message: "Die Einrichtung enthält doppelte IDs.",
    });
  if (
    !config.enabled ||
    !config.locations.length ||
    !config.skills.length ||
    !config.templates.length ||
    !config.demands.length
  )
    issues.push({
      code: "setup",
      severity: "error",
      message:
        "Filialen, Kompetenzen, Schichtvorlagen und Besetzungsbedarf müssen eingerichtet sein.",
    });
  for (const p of selected) {
    if (!p.shifts.length)
      issues.push({
        code: "empty",
        severity: "error",
        message: "Der Monat enthält noch keine Schichten.",
      });
    issues.push(
      ...planningCoverageIssues(
        state,
        p,
        context.today,
        context.holidays,
        context.now,
      ),
    );
  }
  issues.push(...planningTimelineIssues(state, context, future));
  return issues;
}
