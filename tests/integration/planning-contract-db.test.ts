import { afterAll, beforeAll, expect, it } from "vitest";
import { planningAs, planningDatabase, DB_IDS } from "../fixtures/planning-db";
import { P_IDS } from "../fixtures/planning";
import {
  DEFAULT_WORK_SCHEDULE,
  FOUR_DAY_WORK_SCHEDULE,
} from "@/types/work-schedule";
import type { EmploymentSchedule } from "@/types/employment-schedule";
let fixture: Awaited<ReturnType<typeof planningDatabase>>;
beforeAll(async () => {
  fixture = await planningDatabase();
}, 30000);
afterAll(async () => {
  if (fixture) await fixture.db.close();
});
async function version() {
  return Number(
    (
      await fixture.db.query<{ v: number }>(
        "SELECT version AS v FROM planning_workspaces",
      )
    ).rows[0].v,
  );
}
it("saves future contracts with one atomic planning revision", async () => {
  fixture.state.config.profiles[0].contractChanges = [
    { from: "2050-02-01", schedule: FOUR_DAY_WORK_SCHEDULE },
  ];
  const before = await version();
  await planningAs(fixture.db, "service_role", DB_IDS.manager, () =>
    fixture.db.query(
      "SELECT planning_commit($1,$2,$3,$4,'configure','',NULL,NULL)",
      [DB_IDS.tenant, DB_IDS.manager, before, JSON.stringify(fixture.state)],
    ),
  );
  expect(await version()).toBe(before + 1);
  const saved = (
    await fixture.db.query<{ employment_schedule: EmploymentSchedule }>(
      "SELECT employment_schedule FROM employees WHERE id=$1",
      [P_IDS.employee],
    )
  ).rows[0].employment_schedule;
  expect(saved.baseline).toEqual(DEFAULT_WORK_SCHEDULE);
  expect(saved.changes).toEqual(
    fixture.state.config.profiles[0].contractChanges,
  );
});
it("preserves the old target when the existing employee editor changes a model", async () => {
  await fixture.db.query("UPDATE employees SET work_schedule=$2 WHERE id=$1", [
    P_IDS.employee,
    JSON.stringify(FOUR_DAY_WORK_SCHEDULE),
  ]);
  const saved = (
    await fixture.db.query<{ employment_schedule: EmploymentSchedule }>(
      "SELECT employment_schedule FROM employees WHERE id=$1",
      [P_IDS.employee],
    )
  ).rows[0].employment_schedule;
  expect(saved.baseline).toEqual(DEFAULT_WORK_SCHEDULE);
  expect(saved.changes).toHaveLength(2);
  expect(saved.changes[0].schedule).toEqual(FOUR_DAY_WORK_SCHEDULE);
});
it("rolls back a configuration that removes an already effective contract", async () => {
  const before = await version();
  await expect(
    planningAs(fixture.db, "service_role", DB_IDS.manager, () =>
      fixture.db.query(
        "SELECT planning_commit($1,$2,$3,$4,'configure','',NULL,NULL)",
        [DB_IDS.tenant, DB_IDS.manager, before, JSON.stringify(fixture.state)],
      ),
    ),
  ).rejects.toThrow("planning_contract_history_locked");
  expect(await version()).toBe(before);
});
