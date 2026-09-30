import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { planningAs, planningDatabase, DB_IDS } from "../fixtures/planning-db";
import { P_IDS } from "../fixtures/planning";
let fixture: Awaited<ReturnType<typeof planningDatabase>>;
beforeAll(async () => {
  fixture = await planningDatabase();
}, 30000);
afterAll(async () => {
  if (fixture) await fixture.db.close();
});
describe("Planning PostgreSQL authorization and atomicity", () => {
  it("allows only the actual live manager to read a workspace", async () => {
    const count = async () =>
      (await fixture.db.query("SELECT * FROM planning_workspaces")).rows.length;
    expect(
      await planningAs(fixture.db, "authenticated", DB_IDS.manager, count),
    ).toBe(1);
    expect(
      await planningAs(fixture.db, "authenticated", DB_IDS.employee, count),
    ).toBe(0);
    expect(
      await planningAs(fixture.db, "authenticated", DB_IDS.foreignUser, count),
    ).toBe(0);
  });
  it("projects only published own shifts for employees", async () => {
    const result = await planningAs(
      fixture.db,
      "authenticated",
      DB_IDS.employee,
      () =>
        fixture.db.query<{
          result: { periods: { shifts: { employeeId: string }[] }[] };
        }>("SELECT planning_my_schedule() AS result"),
    );
    const shifts = result.rows[0].result.periods.flatMap((p) => p.shifts);
    expect(shifts).toHaveLength(1);
    expect(shifts[0].employeeId).toBe(P_IDS.other);
    expect(JSON.stringify(result.rows)).not.toContain("externalWork");
  });
  it("rejects direct authenticated writes and privileged RPC execution", async () => {
    await expect(
      planningAs(fixture.db, "authenticated", DB_IDS.manager, () =>
        fixture.db.exec("UPDATE planning_workspaces SET version=999"),
      ),
    ).rejects.toThrow("permission denied");
    await expect(
      planningAs(fixture.db, "authenticated", DB_IDS.manager, () =>
        fixture.db.query(
          "SELECT planning_commit($1,$2,0,$3,'configure','',NULL,NULL)",
          [DB_IDS.tenant, DB_IDS.manager, JSON.stringify(fixture.state)],
        ),
      ),
    ).rejects.toThrow("permission denied");
  });
  it("commits a revision once and atomically rejects a stale input version", async () => {
    const params = [
      DB_IDS.tenant,
      DB_IDS.manager,
      JSON.stringify(fixture.state),
    ];
    const result = await planningAs(
      fixture.db,
      "service_role",
      DB_IDS.manager,
      () =>
        fixture.db.query<{ version: number }>(
          "SELECT planning_commit($1,$2,0,$3,'configure','',NULL,NULL) AS version",
          params,
        ),
    );
    expect(Number(result.rows[0].version)).toBe(1);
    await expect(
      planningAs(fixture.db, "service_role", DB_IDS.manager, () =>
        fixture.db.query(
          "SELECT planning_commit($1,$2,0,$3,'configure','',NULL,NULL)",
          params,
        ),
      ),
    ).rejects.toThrow("planning_conflict");
    expect(
      (await fixture.db.query("SELECT * FROM planning_revisions")).rows,
    ).toHaveLength(1);
  });
  it("revokes manager access immediately when the database role changes", async () => {
    await fixture.db.query("UPDATE employees SET role='employee' WHERE id=$1", [
      P_IDS.employee,
    ]);
    expect(
      await planningAs(
        fixture.db,
        "authenticated",
        DB_IDS.manager,
        async () =>
          (await fixture.db.query("SELECT * FROM planning_workspaces")).rows
            .length,
      ),
    ).toBe(0);
    await fixture.db.query("UPDATE employees SET role='admin' WHERE id=$1", [
      P_IDS.employee,
    ]);
  });
  it("invalidates proposals on sickness and actual time changes", async () => {
    const before = (
      await fixture.db.query<{ version: number }>(
        "SELECT version FROM planning_workspaces",
      )
    ).rows[0].version;
    await fixture.db.query(
      "INSERT INTO sick_entries(tenant_id,employee_id,start_date,created_by) VALUES($1,$2,'2050-01-01',$2)",
      [DB_IDS.tenant, P_IDS.employee],
    );
    expect(
      Number(
        (
          await fixture.db.query<{ version: number }>(
            "SELECT version FROM planning_workspaces",
          )
        ).rows[0].version,
      ),
    ).toBe(Number(before) + 1);
  });
  it("keeps revisions immutable for the service role", async () => {
    await expect(
      planningAs(fixture.db, "service_role", DB_IDS.manager, () =>
        fixture.db.exec("UPDATE planning_revisions SET reason='tampered'"),
      ),
    ).rejects.toThrow("permission denied");
  });
  it("rejects an employee creating a swap from a colleague's shift", async () => {
    await expect(
      planningAs(fixture.db, "service_role", DB_IDS.employee, () =>
        fixture.db.query(
          "SELECT planning_swap_command($1,'request',NULL,$2,$3)",
          [
            DB_IDS.employee,
            fixture.state.periods[0].publishedShifts[0].id,
            fixture.state.periods[0].publishedShifts[1].id,
          ],
        ),
      ),
    ).rejects.toThrow("planning_invalid_swap");
  });
  it("enforces a shared per-user write limit", async () => {
    const allowed = await planningAs(
      fixture.db,
      "service_role",
      DB_IDS.employee,
      async () => {
        const values = [];
        for (let i = 0; i < 31; i++)
          values.push(
            (
              await fixture.db.query<{ allowed: boolean }>(
                "SELECT planning_take_limit($1,true) AS allowed",
                [DB_IDS.employee],
              )
            ).rows[0].allowed,
          );
        return values;
      },
    );
    expect(allowed.filter(Boolean)).toHaveLength(30);
    expect(allowed[30]).toBe(false);
  });
});
