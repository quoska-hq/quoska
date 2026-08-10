#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const TABLES = [
  "tenants",
  "employees",
  "projects",
  "project_assignments",
  "time_entries",
  "break_sessions",
  "time_entry_audit",
  "correction_requests",
  "leave_requests",
  "leave_entitlements",
  "sick_entries",
  "notifications",
  "subscription_events",
  "public_holidays",
];

const STORAGE_BUCKETS = ["au-certificates"];
const PAGE_SIZE = 1000;

function requiredEnv(name, fallbackName) {
  const value = process.env[name] || (fallbackName ? process.env[fallbackName] : undefined);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

function encodedObjectPath(objectPath) {
  return objectPath.split("/").map(encodeURIComponent).join("/");
}

function assertSafeObjectPath(objectPath) {
  const segments = objectPath.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new Error(`Refusing unsafe Storage object path: ${objectPath}`);
  }
}

async function checkedFetch(url, options, context) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`${context} failed (${response.status}): ${detail}`);
  }
  return response;
}

async function writeJson(outputDir, relativePath, value) {
  const target = path.join(outputDir, relativePath);
  await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(target, body, { mode: 0o600 });
  return {
    path: relativePath,
    bytes: Buffer.byteLength(body),
    sha256: sha256(body),
  };
}

async function exportTable({ baseUrl, headers, outputDir, table }) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const response = await checkedFetch(
      `${baseUrl}/rest/v1/${encodeURIComponent(table)}?select=*`,
      {
        headers: {
          ...headers,
          Accept: "application/json",
          "Accept-Profile": "public",
          "Range-Unit": "items",
          Range: `${offset}-${offset + PAGE_SIZE - 1}`,
        },
      },
      `Export table ${table}`,
    );
    const page = await response.json();
    if (!Array.isArray(page)) throw new Error(`Unexpected response for table ${table}`);
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  const file = await writeJson(outputDir, `database/${table}.json`, rows);
  return { table, rows: rows.length, ...file };
}

async function exportAuthUsers({ baseUrl, headers, outputDir }) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const response = await checkedFetch(
      `${baseUrl}/auth/v1/admin/users?page=${page}&per_page=${PAGE_SIZE}`,
      { headers },
      "Export Auth users",
    );
    const payload = await response.json();
    const pageUsers = Array.isArray(payload) ? payload : payload.users;
    if (!Array.isArray(pageUsers)) throw new Error("Unexpected Auth users response");
    users.push(...pageUsers);
    if (pageUsers.length < PAGE_SIZE) break;
  }

  const file = await writeJson(outputDir, "auth/users.json", users);
  return { users: users.length, ...file };
}

async function listStorageObjects({ baseUrl, headers, bucket, prefix = "" }) {
  const objects = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const response = await checkedFetch(
      `${baseUrl}/storage/v1/object/list/${encodeURIComponent(bucket)}`,
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          prefix,
          limit: PAGE_SIZE,
          offset,
          sortBy: { column: "name", order: "asc" },
        }),
      },
      `List Storage bucket ${bucket}`,
    );
    const entries = await response.json();
    if (!Array.isArray(entries)) throw new Error(`Unexpected listing for bucket ${bucket}`);

    for (const entry of entries) {
      if (!entry || typeof entry.name !== "string" || entry.name.length === 0) continue;
      const objectPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id == null && entry.metadata == null) {
        objects.push(...await listStorageObjects({ baseUrl, headers, bucket, prefix: objectPath }));
      } else {
        objects.push(objectPath);
      }
    }

    if (entries.length < PAGE_SIZE) break;
  }
  return objects;
}

async function exportStorageBucket({ baseUrl, headers, outputDir, bucket }) {
  const objectPaths = await listStorageObjects({ baseUrl, headers, bucket });
  const files = [];

  for (const objectPath of objectPaths.sort()) {
    assertSafeObjectPath(objectPath);
    const response = await checkedFetch(
      `${baseUrl}/storage/v1/object/authenticated/${encodeURIComponent(bucket)}/${encodedObjectPath(objectPath)}`,
      { headers },
      `Download Storage object ${bucket}/${objectPath}`,
    );
    const body = Buffer.from(await response.arrayBuffer());
    const relativePath = path.posix.join("storage", bucket, objectPath);
    const target = path.join(outputDir, relativePath);
    await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(target, body, { mode: 0o600 });
    files.push({ path: relativePath, bytes: body.length, sha256: sha256(body) });
  }

  return { bucket, objects: files.length, files };
}

async function main() {
  const baseUrl = requiredEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const outputDir = path.resolve(requiredEnv("BACKUP_OUTPUT_DIR"));
  if (outputDir === "/" || outputDir === process.cwd()) {
    throw new Error(`Refusing unsafe BACKUP_OUTPUT_DIR: ${outputDir}`);
  }

  await mkdir(outputDir, { recursive: true, mode: 0o700 });
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };

  const tables = [];
  for (const table of TABLES) {
    tables.push(await exportTable({ baseUrl, headers, outputDir, table }));
  }

  const auth = await exportAuthUsers({ baseUrl, headers, outputDir });
  const storage = [];
  for (const bucket of STORAGE_BUCKETS) {
    storage.push(await exportStorageBucket({ baseUrl, headers, outputDir, bucket }));
  }

  const manifest = {
    format: "quoska-supabase-export",
    version: 1,
    createdAt: new Date().toISOString(),
    source: new URL(baseUrl).host,
    appRevision: process.env.APP_REVISION || null,
    tables,
    auth,
    storage,
    restoreNotes: [
      "Database schema is reconstructed from the version-controlled Supabase migrations.",
      "Auth password hashes are not exposed by the Supabase Admin API; restored users must reset their passwords.",
      "This export supplements but does not replace a provider-level PostgreSQL backup.",
    ],
  };
  await writeJson(outputDir, "manifest.json", manifest);

  const checksumLines = [
    ...tables.map(({ sha256: digest, path: filePath }) => `${digest}  ${filePath}`),
    `${auth.sha256}  ${auth.path}`,
    ...storage.flatMap((entry) => entry.files.map(({ sha256: digest, path: filePath }) => `${digest}  ${filePath}`)),
  ].sort();
  await writeFile(
    path.join(outputDir, "SHA256SUMS"),
    `${checksumLines.join("\n")}\n`,
    { mode: 0o600 },
  );

  const tableRows = tables.reduce((sum, table) => sum + table.rows, 0);
  const storageObjects = storage.reduce((sum, bucket) => sum + bucket.objects, 0);
  console.log(JSON.stringify({ tables: tables.length, tableRows, authUsers: auth.users, storageObjects }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
