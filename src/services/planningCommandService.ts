import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanningCommand } from "@/types/planning-schemas";
import { WORKDAY_KEYS } from "@/types/work-schedule";
import { refreshPlanningPeriod } from "@/services/planningRefreshService";
import type { PlanningJobResult, PlanningSnapshot } from "@/types/planning";
import {
  commitPlanning,
  enqueuePlanning,
  readPlanningJobs,
} from "@/repos/planningRepo";
import {
  generatePlanningPeriod,
  assignPlanningShift,
  publishPlanningPeriod,
  PlanningError,
} from "@/services/planningPeriodService";
import {
  applyPlanningJob,
  buildPlanningJob,
} from "@/services/planningOptimizerService";
import {
  planningAddMonths,
  planningFirstMonth,
} from "@/config/client/planning-calendar";

export async function executePlanningCommand(
  admin: SupabaseClient,
  reader: SupabaseClient,
  actor: { tenantId: string; userId: string; role: string },
  snapshot: PlanningSnapshot,
  command: PlanningCommand,
) {
  if (!["admin", "manager"].includes(actor.role))
    throw new PlanningError("Keine Berechtigung.", 403);
  if (command.version !== snapshot.version)
    throw new PlanningError(
      "Der Plan wurde inzwischen geändert. Bitte neu laden.",
      409,
    );
  if (!snapshot.state.config.enabled && command.action !== "configure")
    throw new PlanningError("Die Dienstplanung ist für diesen Betrieb deaktiviert.", 403);
  let next = structuredClone(snapshot.state),
    jobId: string | undefined,
    reason = "";
  switch (command.action) {
    case "refresh":
      next = refreshPlanningPeriod(next, snapshot.context, command.month);
      break;
    case "configure": {
      if (
        command.config.firstMonth &&
        (command.config.firstMonth <
          snapshot.context.today.slice(0, 7) + "-01" ||
          command.config.firstMonth >
            planningAddMonths(snapshot.context.today.slice(0, 7) + "-01", 1)) &&
        command.config.firstMonth !== next.config.firstMonth
      )
        throw new PlanningError(
          "Der erste Monat muss der aktuelle oder nächste Monat sein.",
        );
      const ids = new Set(snapshot.context.employees.map((e) => e.id));
      for (const profile of command.config.profiles) {
        if (
          profile.validFrom &&
          profile.validUntil &&
          profile.validFrom > profile.validUntil
        )
          throw new PlanningError(
            "Der Gültigkeitszeitraum einer Einsatzberechtigung ist ungültig.",
          );
        const historical =
          snapshot.context.employees
            .find((e) => e.id === profile.employeeId)
            ?.employmentSchedule?.changes.filter(
              (c) => c.from <= snapshot.context.today,
            ) ?? [];
        const requested = profile.contractChanges.filter(
          (c) => c.from <= snapshot.context.today,
        );
        if (
          historical.length !== requested.length ||
          historical.some(
            (c, i) =>
              c.from !== requested[i].from ||
              WORKDAY_KEYS.some(
                (day) => c.schedule[day] !== requested[i].schedule[day],
              ),
          )
        )
          throw new PlanningError(
            "Bereits wirksame Vertragsstände dürfen hier nicht verändert werden. Neue Solländerungen brauchen einen künftigen Stichtag.",
          );
      }
      if (command.config.profiles.some((p) => !ids.has(p.employeeId)))
        throw new PlanningError(
          "Die Einrichtung enthält eine unbekannte Person.",
        );
      const locations = new Set(command.config.locations.map((l) => l.id)),
        skills = new Set(command.config.skills.map((s) => s.id));
      if (
        [...command.config.templates, ...command.config.demands].some(
          (t) => !locations.has(t.locationId) || !skills.has(t.skillId),
        ) ||
        command.config.profiles.some(
          (p) =>
            p.locationIds.some((l) => !locations.has(l)) ||
            p.skillIds.some((s) => !skills.has(s)),
        )
      )
        throw new PlanningError(
          "Filial- oder Kompetenzzuordnung ist ungültig.",
        );
      const used = next.periods.flatMap((p) => p.shifts);
      if (
        used.some(
          (s) =>
            !locations.has(s.locationId) ||
            !skills.has(s.skillId) ||
            !command.config.templates.some((t) => t.id === s.templateId),
        )
      )
        throw new PlanningError(
          "Bereits verwendete Filialen, Kompetenzen und Vorlagen dürfen nicht entfernt werden.",
        );
      next.config = command.config;
      break;
    }
    case "generate":
      next.periods.push(
        generatePlanningPeriod(
          next,
          command.month,
          snapshot.context.today,
          snapshot.context.holidays,
          snapshot.context.now,
        ),
      );
      break;
    case "assign":
      next = assignPlanningShift(
        next,
        snapshot.context,
        command.shift,
        command.reason,
      );
      reason = command.reason;
      break;
    case "publish":
      publishPlanningPeriod(
        next,
        snapshot.context,
        command.month,
        command.status,
      );
      break;
    case "optimize": {
      if (!snapshot.workerConfigured)
        throw new PlanningError(
          "Der Rechenworker ist noch nicht eingerichtet.",
          503,
        );
      const payload = buildPlanningJob(
        next,
        snapshot.context,
        command.version,
        command.month,
      );
      return {
        jobId: await enqueuePlanning(
          admin,
          actor.tenantId,
          actor.userId,
          command.version,
          command.month,
          payload,
        ),
      };
    }
    case "apply": {
      const jobs = await readPlanningJobs(reader, actor.tenantId),
        job = jobs.find((j) => j.id === command.jobId);
      if (
        !job ||
        job.status !== "completed" ||
        Number(job.input_version) !== command.version
      )
        throw new PlanningError(
          "Der Rechenvorschlag ist nicht verfügbar oder inzwischen veraltet.",
          409,
        );
      next = applyPlanningJob(
        next,
        snapshot.context,
        job.month as string,
        job.result as PlanningJobResult,
      );
      jobId = command.jobId;
      break;
    }
    case "initialize": {
      for (let n = 0; n < 3; n++) {
        const month = planningAddMonths(
          planningFirstMonth(snapshot.context.today, next.config.firstMonth),
          n,
        );
        if (!next.periods.some((p) => p.month === month))
          next.periods.push(
            generatePlanningPeriod(
              next,
              month,
              snapshot.context.today,
              snapshot.context.holidays,
              snapshot.context.now,
            ),
          );
      }
      next.periods.sort((a, b) => a.month.localeCompare(b.month));
      break;
    }
    case "roll": {
      const month = snapshot.context.today.slice(0, 7) + "-01";
      for (const p of next.periods.filter((p) => p.month < month))
        p.status = "closed";
      publishPlanningPeriod(next, snapshot.context, month, "fixed");
      const last = planningAddMonths(month, 2);
      if (!next.periods.some((p) => p.month === last))
        next.periods.push(
          generatePlanningPeriod(
            next,
            last,
            snapshot.context.today,
            snapshot.context.holidays,
            snapshot.context.now,
          ),
        );
      // Historical periods remain in the database and immutable revision history.
      next.periods = next.periods.filter(
        (p) => p.month >= planningAddMonths(month, -2),
      );
      break;
    }
  }
  return {
    version: await commitPlanning(
      admin,
      actor.tenantId,
      actor.userId,
      command.version,
      next,
      command.action,
      reason,
      jobId,
    ),
  };
}
