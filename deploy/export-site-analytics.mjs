#!/usr/bin/env node

import Database from "better-sqlite3";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const source = path.resolve(requiredEnv("ANALYTICS_BACKUP_SOURCE"));
  const outputDir = path.resolve(requiredEnv("ANALYTICS_BACKUP_OUTPUT_DIR"));
  if (source === "/" || outputDir === "/" || source === outputDir) {
    throw new Error("Refusing unsafe analytics backup path");
  }

  try {
    await access(source);
  } catch {
    console.log(JSON.stringify({ skipped: true, reason: "database-not-created" }));
    return;
  }

  await mkdir(outputDir, { recursive: true, mode: 0o700 });
  const target = path.join(outputDir, "site-analytics.sqlite");
  const db = new Database(source, { readonly: true, fileMustExist: true });
  const overview = db.prepare(`
    SELECT COUNT(*) AS pageviews, MIN(occurred_at) AS firstEvent,
      MAX(occurred_at) AS lastEvent
    FROM site_pageviews
  `).get();
  await db.backup(target);
  db.close();

  await writeFile(
    path.join(outputDir, "manifest.json"),
    `${JSON.stringify({ format: "quoska-site-analytics", version: 1, ...overview }, null, 2)}\n`,
    { mode: 0o600 },
  );
  console.log(JSON.stringify({ skipped: false, ...overview }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
