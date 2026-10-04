import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { planningFixture, P_IDS } from "./planning";
export const DB_IDS = {
  tenant: "a0000000-0000-4000-8000-000000000001",
  foreignTenant: "a0000000-0000-4000-8000-000000000002",
  manager: "b0000000-0000-4000-8000-000000000001",
  employee: "b0000000-0000-4000-8000-000000000002",
  foreignUser: "b0000000-0000-4000-8000-000000000003",
};
export async function planningDatabase() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated,service_role;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,service_role;`);
  for (const file of [
    "001_tenants",
    "002_employees",
    "003_time_entries",
    "007_public_holidays",
    "008_notifications",
    "013_create_leave_requests",
    "015_create_sick_entries",
    "023_employee_work_schedules",
    "039_planning_tables",
    "040_planning_atomic_commands",
    "041_planning_swaps_and_rate_limits",
    "042_planning_initialization",
    "043_planning_preferences_and_worker_recovery",
    "044_effective_employment_schedules",
    "045_optional_planning_module",
  ]) {
    await db.exec(await readFile(`supabase/migrations/${file}.sql`, "utf8"));
  }
  await db.query(
    "INSERT INTO tenants(id,name) VALUES($1,'Fixture'),($2,'Foreign fixture')",
    [DB_IDS.tenant, DB_IDS.foreignTenant],
  );
  await db.query(
    "INSERT INTO employees(id,tenant_id,user_id,first_name,last_name,email,role) VALUES($1,$2,$3,'Manager','Fixture','manager@test.invalid','admin'),($4,$2,$5,'Employee','Fixture','employee@test.invalid','employee'),($6,$7,$8,'Foreign','Fixture','foreign@test.invalid','admin')",
    [
      P_IDS.employee,
      DB_IDS.tenant,
      DB_IDS.manager,
      P_IDS.other,
      DB_IDS.employee,
      crypto.randomUUID(),
      DB_IDS.foreignTenant,
      DB_IDS.foreignUser,
    ],
  );
  const fixture = planningFixture();
  fixture.shift.date = "2050-01-06";
  fixture.shift.start = "2050-01-06T05:00:00Z";
  fixture.shift.end = "2050-01-06T11:00:00Z";
  fixture.state.periods = [
    {
      month: "2050-01-01",
      status: "announced",
      revision: 1,
      shifts: [
        fixture.shift,
        { ...fixture.shift, id: crypto.randomUUID(), employeeId: P_IDS.other },
      ],
      publishedShifts: [
        fixture.shift,
        { ...fixture.shift, id: crypto.randomUUID(), employeeId: P_IDS.other },
      ],
    },
  ];
  await db.query(
    "INSERT INTO planning_workspaces(tenant_id,config) VALUES($1,$2)",
    [DB_IDS.tenant, JSON.stringify(fixture.state.config)],
  );
  await db.query(
    "INSERT INTO planning_periods(tenant_id,month,state) VALUES($1,'2050-01-01',$2)",
    [DB_IDS.tenant, JSON.stringify(fixture.state.periods[0])],
  );
  return { db, state: fixture.state };
}
export async function planningAs<T>(
  db: PGlite,
  role: "authenticated" | "service_role",
  user: string,
  run: () => Promise<T>,
): Promise<T> {
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [user]);
  await db.exec(`SET ROLE ${role}`);
  try {
    return await run();
  } finally {
    await db.exec("RESET ROLE");
  }
}
