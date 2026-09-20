import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ employee: { id: "person", tenant_id: "trusted", role: "admin" } as { id: string; tenant_id: string; role: string } | null,
  user: { id: "user" } as { id: string } | null, read: vi.fn(), save: vi.fn(), store: vi.fn(), preview: vi.fn(), generate: vi.fn(), admin: vi.fn() }));
vi.mock("@/config/supabase/server", () => ({ createAdminClient: m.admin, createClient: async () => {
  const q = { select: () => q, eq: () => q, is: () => q, single: async () => ({ data: m.employee, error: null }) };
  return { auth: { getUser: async () => ({ data: { user: m.user } }) }, from: () => q };
} }));
vi.mock("@/repos/datevRepo", () => ({ getDatevSnapshot: m.read, saveDatevSettings: m.save, storeDatevExport: m.store }));
vi.mock("@/services/datevExportService", () => ({ buildDatevPreview: m.preview, generateLodasFile: m.generate }));
vi.mock("@/services/productObservationService", () => ({ observeProductAction: (_action: string, handler: unknown) => handler }));
vi.mock("@/config/server/product-observation-context", () => ({ setObservedTenant: vi.fn() }));
import { GET, PUT, POST } from "@/app/api/v1/reports/datev/route";
const fingerprint = "a".repeat(64);
const settings = { revision: 0, advisorNumber: 12345, clientNumber: 123, employees: [] };
const payload = { month: "2026-08", fingerprint, confirmed: true, repeatConfirmed: false };
const request = (method: string, data: unknown) => new Request("http://localhost/api/v1/reports/datev?month=2026-08", { method, body: JSON.stringify(data) });
beforeEach(() => {
  vi.clearAllMocks(); m.employee = { id: "person", tenant_id: "trusted", role: "admin" }; m.user = { id: "user" };
  m.read.mockResolvedValue({ settings, employees: [] });
  m.preview.mockReturnValue({ month: "2026-08", fingerprint, errors: [], history: [] });
  m.generate.mockReturnValue("file"); m.store.mockResolvedValue({ id: "export-id", content: "file" });
});
it("scopes preview and generated file to the fresh authenticated admin", async () => {
  const result = await GET(new Request("http://localhost?month=2026-08"));
  expect(result.status).toBe(200); expect(result.headers.get("cache-control")).toContain("no-store");
  expect(m.read).toHaveBeenCalledWith(undefined, "trusted", "2026-08");
  const file = await POST(request("POST", payload)); expect(await file.text()).toBe("file");
  expect(m.store).toHaveBeenCalledWith(undefined, "trusted", "person", "2026-08", fingerprint, "file");
});
it.each(["employee", "manager", null])("denies current role %s on all operations", async role => {
  m.employee = role ? { id: "person", tenant_id: "trusted", role } : null;
  expect((await GET(new Request("http://localhost"))).status).toBe(403);
  expect((await PUT(request("PUT", settings))).status).toBe(403);
  expect((await POST(request("POST", payload))).status).toBe(403);
  expect(m.admin).not.toHaveBeenCalled();
});
it("rejects anonymous, cross-site and forged-identity requests", async () => {
  m.user = null; expect((await GET(new Request("http://localhost"))).status).toBe(403); m.user = { id: "user" };
  expect((await PUT(request("PUT", { ...settings, tenantId: "other" }))).status).toBe(400);
  expect((await POST(request("POST", { ...payload, employeeId: "other" }))).status).toBe(400);
  expect((await POST(new Request("http://localhost", { method: "POST", headers: { "sec-fetch-site": "cross-site" } }))).status).toBe(403);
  expect(m.store).not.toHaveBeenCalled();
});
it("refuses stale previews, failed validation and unconfirmed repeat downloads", async () => {
  expect((await POST(request("POST", { ...payload, fingerprint: "b".repeat(64) }))).status).toBe(409);
  m.preview.mockReturnValue({ month: "2026-08", fingerprint, errors: ["offene Zeiten"], history: [] });
  expect((await POST(request("POST", payload))).status).toBe(422);
  m.preview.mockReturnValue({ month: "2026-08", fingerprint, errors: [], history: [{}] });
  expect((await POST(request("POST", payload))).status).toBe(409);
  expect(m.store).not.toHaveBeenCalled();
  expect((await POST(request("POST", { ...payload, repeatConfirmed: true }))).status).toBe(200);
});
it("fails closed when the database cannot supply a full snapshot", async () => {
  m.read.mockRejectedValue(new Error("database unavailable"));
  expect((await POST(request("POST", payload))).status).toBe(503);
  expect(m.generate).not.toHaveBeenCalled();
});
