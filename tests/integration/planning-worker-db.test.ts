import { afterAll, beforeAll, expect, it } from "vitest";
import { DB_IDS, planningAs, planningDatabase } from "../fixtures/planning-db";
import { P_IDS } from "../fixtures/planning";
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
      await fixture.db.query<{ version: number }>(
        "SELECT version FROM planning_workspaces WHERE tenant_id=$1",
        [DB_IDS.tenant],
      )
    ).rows[0].version,
  );
}
async function service<T>(run: () => Promise<T>) {
  return planningAs(fixture.db, "service_role", DB_IDS.manager, run);
}
async function claim() {
  return (
    await service(() =>
      fixture.db.query<{ job: { id: string; leaseToken: string } | null }>(
        "SELECT planning_claim_job() AS job",
      ),
    )
  ).rows[0].job;
}
it("changes only the requesting employee's preferences and invalidates old proposals", async () => {
  const before = await version();
  await service(() =>
    fixture.db.query("SELECT planning_set_preferences($1,'[1,3]'::jsonb)", [
      DB_IDS.employee,
    ]),
  );
  expect(await version()).toBe(before + 1);
  const config = (
    await fixture.db.query<{ config: typeof fixture.state.config }>(
      "SELECT config FROM planning_workspaces WHERE tenant_id=$1",
      [DB_IDS.tenant],
    )
  ).rows[0].config;
  expect(
    config.profiles.find((p) => p.employeeId === P_IDS.other)?.preferredDays,
  ).toEqual([1, 3]);
  expect(
    config.profiles.find((p) => p.employeeId === P_IDS.employee)?.preferredDays,
  ).toEqual([]);
  for (const input of ["[1,1]", "[1.5]", "[7]"]) {
    await expect(
      service(() =>
        fixture.db.query("SELECT planning_set_preferences($1,$2::jsonb)", [
          DB_IDS.employee,
          input,
        ]),
      ),
    ).rejects.toThrow("planning_invalid_preferences");
  }
});
it("recovers a failed lease, rejects the old nonce and finishes idempotently", async () => {
  const current = await version();
  await service(() =>
    fixture.db.query("SELECT planning_enqueue($1,$2,$3,'2050-01-01','{}')", [
      DB_IDS.tenant,
      DB_IDS.manager,
      current,
    ]),
  );
  const first = (await claim())!;
  await fixture.db.query(
    "UPDATE planning_jobs SET lease_until=now()-interval '1 second' WHERE id=$1",
    [first.id],
  );
  const second = (await claim())!;
  expect(second.id).toBe(first.id);
  expect(second.leaseToken).not.toBe(first.leaseToken);
  const finish = (lease: string) =>
    service(() =>
      fixture.db.query<{ ok: boolean }>(
        'SELECT planning_finish_job($1,$2,\'{"status":"infeasible"}\') AS ok',
        [first.id, lease],
      ),
    );
  expect((await finish(first.leaseToken)).rows[0].ok).toBe(false);
  expect((await finish(second.leaseToken)).rows[0].ok).toBe(true);
  expect((await finish(second.leaseToken)).rows[0].ok).toBe(true);
});
it("expires queued jobs after source changes", async () => {
  const current = await version();
  const id = (
    await service(() =>
      fixture.db.query<{ id: string }>(
        "SELECT planning_enqueue($1,$2,$3,'2050-01-01','{}') AS id",
        [DB_IDS.tenant, DB_IDS.manager, current],
      ),
    )
  ).rows[0].id;
  await fixture.db.query(
    "UPDATE employees SET first_name='Changed' WHERE id=$1",
    [P_IDS.employee],
  );
  expect(await claim()).toBeNull();
  expect(
    (
      await fixture.db.query<{ status: string }>(
        "SELECT status FROM planning_jobs WHERE id=$1",
        [id],
      )
    ).rows[0].status,
  ).toBe("expired");
});
it("notifies the former employee when their published duty is removed", async () => {
  const next = structuredClone(fixture.state);
  next.periods[0].revision++;
  next.periods[0].publishedShifts = next.periods[0].publishedShifts.filter(
    (s) => s.employeeId !== P_IDS.other,
  );
  const current = await version();
  await service(() =>
    fixture.db.query(
      "SELECT planning_commit($1,$2,$3,$4,'publish','',NULL,NULL)",
      [DB_IDS.tenant, DB_IDS.manager, current, JSON.stringify(next)],
    ),
  );
  const recipients = (
    await fixture.db.query<{ employee_id: string }>(
      "SELECT employee_id FROM notifications WHERE type='planning_published'",
    )
  ).rows.map((n) => n.employee_id);
  expect(recipients).toContain(P_IDS.employee);
  expect(recipients).toContain(P_IDS.other);
});
