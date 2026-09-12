export interface ProductTenant {
  id: string; name: string; created_at: string; plan: string; setup_complete: boolean;
}
export interface ProductEmployee {
  id: string; tenant_id: string; user_id: string; role: string; created_at: string; deleted_at: string | null;
  first_name: string; last_name: string;
}
export interface ProductAccount {
  id: string; created_at: string; confirmed: boolean; banned: boolean;
  email: string | null; last_sign_in_at: string | null;
}
export interface ProductEntry {
  id: string; tenant_id: string; created_at: string; date: string; entry_source: string;
  status: string; clock_in: string;
}
export interface ProductActivity { tenant_id: string; created_at: string }
export interface ProductData {
  tenants: ProductTenant[]; employees: ProductEmployee[]; accounts: ProductAccount[];
  entries: ProductEntry[]; projects: ProductActivity[];
}
export const PRODUCT_ACTIONS = [
  "clock_in", "clock_out", "clock_pause", "clock_resume", "extension_clock",
  "import", "invite", "setup", "setup_complete", "register", "app_open",
] as const;
export type ProductAction = typeof PRODUCT_ACTIONS[number];
export type ActionOutcome = "ok" | "invalid" | "denied" | "conflict" | "limited" | "error";
export interface AccountActivity {
  tenantKey: string; employeeKey: string; lastActiveAt: string;
  lastActionAt: string | null; lastAction: ProductAction | null;
}
export interface AccountOverview {
  id: string; name: string; email: string | null; company: string; role: string;
  status: "active" | "invited" | "blocked" | "deactivated" | "missing";
  lastSignInAt: string | null; lastActiveAt: string | null;
  lastActionAt: string | null; lastAction: ProductAction | null;
}
export interface ActionCount {
  day: string; action: string; outcome: string; tenantKey: string; count: number;
}
export interface TenantOverview {
  name: string; created: string; plan: string; accounts: number; pending: number;
  entries: number; imports: number; firstUse: string | null; lastUse: string | null;
  daysThisWeek: number; daysPreviousWeek: number; stale: number;
}
export interface ProductOverview {
  at: string; today: string; weekStart: string; previousWeekStart: string;
  totals: { companies: number; usableAccounts: number; invitations: number; blocked: number;
    incompleteSignups: number; activated: number; paidPlans: number; stale: number };
  registration: { accounts: number; confirmed: number; companies: number; setup: number; activated: number };
  weeks: { label: string; from: string; to: string; companies: number; active: number; clock: number; manual: number; imports: number; setup: number; app: number }[];
  cohorts: { week: string; companies: number; activated: number; eligible: boolean; returned: number | null }[];
  tenants: TenantOverview[]; accounts: AccountOverview[]; actions: ActionCount[];
}
