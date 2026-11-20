import type { PersonalProjectGoal } from "@/types/project-balance";

export function projectGoalProgress(goal: PersonalProjectGoal) {
  if (goal.plannedMinutes <= 0) return { label: "Kein Soll in dieser Woche", minutes: null };
  const remainingMinutes = goal.plannedMinutes - goal.actualMinutes;
  if (remainingMinutes > 0) return { label: "Noch offen", minutes: remainingMinutes };
  if (remainingMinutes < 0) return { label: "Über Ziel", minutes: -remainingMinutes };
  return { label: "Ziel erreicht", minutes: null };
}
