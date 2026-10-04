import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { planningAs, planningDatabase, DB_IDS } from "../fixtures/planning-db";
import { P_IDS } from "../fixtures/planning";
let fixture: Awaited<ReturnType<typeof planningDatabase>>;
beforeAll(async () => {
  fixture = await planningDatabase();
}, 30000);
afterAll(async () => {
  if (fixture) await fixture.db.close();
});
async function status(user: string) {
  return planningAs(
    fixture.db,
    "authenticated",
    user,
    async () =>
      (
        await fixture.db.query<{
          value: { enabled: boolean; version: number };
        }>("SELECT planning_module_status() AS value")
      ).rows[0].value,
  );
}
async function toggle(
  version: number,
  enabled: boolean,
  user = DB_IDS.manager,
) {
  return planningAs(
    fixture.db,
    "service_role",
    user,
    async () =>
      (
        await fixture.db.query<{
          value: { enabled: boolean; version: number };
        }>("SELECT planning_set_enabled($1,$2,$3) AS value", [
          user,
          version,
          enabled,
        ])
      ).rows[0].value,
  );
}
describe("Optional planning module in PostgreSQL", () => {
  it("is off for an unconfigured tenant without creating a workspace", async () => {
    expect(await status(DB_IDS.foreignUser)).toEqual({
      enabled: false,
      version: 0,
    });
    expect(
      (await fixture.db.query("SELECT * FROM planning_workspaces")).rows,
    ).toHaveLength(1);
  });
  it("exposes only the flag and version to employees", async () => {
    expect(await status(DB_IDS.employee)).toEqual({
      enabled: true,
      version: 0,
    });
  });
  it("retains plans and employees, expires proposals, and writes an immutable revision", async () => {
    const beforePeriods = (
      await fixture.db.query("SELECT * FROM planning_periods")
    ).rows;
    const beforeEmployees = (
      await fixture.db.query("SELECT * FROM employees ORDER BY id")
    ).rows;
    await fixture.db.query(
      "INSERT INTO planning_jobs(tenant_id,month,input_version,payload,status) VALUES($1,'2050-01-01',0,'{}','queued'),($1,'2050-01-01',0,'{}','completed')",
      [DB_IDS.tenant],
    );
    expect(await toggle(0, false)).toEqual({ enabled: false, version: 1 });
    expect(
      (await fixture.db.query("SELECT * FROM planning_periods")).rows,
    ).toEqual(beforePeriods);
    expect(
      (await fixture.db.query("SELECT * FROM employees ORDER BY id")).rows,
    ).toEqual(beforeEmployees);
    expect(
      (
        await fixture.db.query<{ status: string }>(
          "SELECT status FROM planning_jobs",
        )
      ).rows.every((r) => r.status === "expired"),
    ).toBe(true);
    const revisions = (
      await fixture.db.query<{
        action: string;
        reason: string;
        snapshot: { config: { enabled: boolean }; periods: unknown[] };
      }>("SELECT action,reason,snapshot FROM planning_revisions")
    ).rows;
    expect(revisions).toHaveLength(1);
    expect(revisions[0].action).toBe("module");
    expect(revisions[0].reason).toBe("Dienstplanung deaktiviert");
    expect(revisions[0].snapshot.config.enabled).toBe(false);
    expect(revisions[0].snapshot.periods).toHaveLength(1);
    await expect(
      planningAs(fixture.db, "service_role", DB_IDS.manager, () =>
        fixture.db.exec("UPDATE planning_revisions SET reason='changed'"),
      ),
    ).rejects.toThrow("permission denied");
  });
  it("hides employee schedules and swap options while disabled", async () => {
    const data = await planningAs(
      fixture.db,
      "authenticated",
      DB_IDS.employee,
      () =>
        fixture.db.query<{ mine: unknown; swaps: unknown[] }>(
          "SELECT planning_my_schedule() AS mine,planning_swap_options() AS swaps",
        ),
    );
    expect(data.rows[0]).toEqual({ mine: null, swaps: [] });
    await expect(
      planningAs(fixture.db, "service_role", DB_IDS.employee, () =>
        fixture.db.query("SELECT planning_set_preferences($1,'[1]')", [
          DB_IDS.employee,
        ]),
      ),
    ).rejects.toThrow("planning_forbidden");
  });
  it("rejects stale toggles atomically and keeps repeated toggles idempotent", async () => {
    await expect(toggle(0, true)).rejects.toThrow("planning_conflict");
    expect(await toggle(1, false)).toEqual({ enabled: false, version: 1 });
    expect(
      (await fixture.db.query("SELECT * FROM planning_revisions")).rows,
    ).toHaveLength(1);
  });
  it("restores published schedules after enabling without changing their contents", async () => {
    expect(await toggle(1, true)).toEqual({ enabled: true, version: 2 });
    const data = await planningAs(
      fixture.db,
      "authenticated",
      DB_IDS.employee,
      () =>
        fixture.db.query<{
          mine: { periods: { shifts: { employeeId: string }[] }[] };
        }>("SELECT planning_my_schedule() AS mine"),
    );
    expect(data.rows[0].mine.periods[0].shifts).toHaveLength(1);
    expect(data.rows[0].mine.periods[0].shifts[0].employeeId).toBe(P_IDS.other);
  });
  it("blocks employees, direct browser RPC writes, and immediately demoted managers", async () => {
    await expect(toggle(2, false, DB_IDS.employee)).rejects.toThrow(
      "planning_forbidden",
    );
    await expect(
      planningAs(fixture.db, "authenticated", DB_IDS.manager, () =>
        fixture.db.query("SELECT planning_set_enabled($1,2,false)", [
          DB_IDS.manager,
        ]),
      ),
    ).rejects.toThrow("permission denied");
    await fixture.db.query("UPDATE employees SET role='employee' WHERE id=$1", [
      P_IDS.employee,
    ]);
    await expect(toggle(3, false)).rejects.toThrow("planning_forbidden");
    expect((await status(DB_IDS.employee)).enabled).toBe(true);
  });
});
