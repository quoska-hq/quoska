#!/usr/bin/env node
import { spawn } from "node:child_process";
import {
  DEFAULT_PROPERTY,
  authorize,
  connectionStatus,
  inspectUrl,
  listSitemaps,
  listSites,
  queryPerformance,
  resolveSearchConsolePaths,
} from "./search-console-core.mjs";

function parseArguments(argv) {
  const [command = "status", ...tokens] = argv;
  const flags = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      flags[rawKey] = inlineValue;
      continue;
    }
    const next = tokens[index + 1];
    if (next && !next.startsWith("--")) {
      flags[rawKey] = next;
      index += 1;
    } else {
      flags[rawKey] = true;
    }
  }
  return { command, flags };
}

function isoDateDaysAgo(days) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function printHelp() {
  process.stdout.write(`Read-only Google Search Console client for Quoska

Usage:
  npm run search-console -- status
  npm run search-console -- auth [--open]
  npm run search-console -- sites
  npm run search-console -- sitemaps [--property sc-domain:quoska.de]
  npm run search-console -- performance [options]
  npm run search-console -- inspect --url https://quoska.de/path

Performance options:
  --start-date YYYY-MM-DD   Defaults to 31 days ago
  --end-date YYYY-MM-DD     Defaults to 3 days ago
  --dimensions LIST        Comma-separated; default: date,query,page
  --row-limit NUMBER        1-25000; default: 1000
  --start-row NUMBER        Pagination offset; default: 0
  --type TYPE               web, image, video, news, discover, googleNews
  --query VALUE             Exact query filter
  --page URL                Exact page filter
  --country CODE            Exact country filter, for example deu
  --device TYPE             Exact device filter

Environment:
  GOOGLE_SEARCH_CONSOLE_PROPERTY
  GOOGLE_SEARCH_CONSOLE_CONFIG_DIR
  GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_FILE
  GOOGLE_SEARCH_CONSOLE_TOKEN_FILE
`);
}

async function openBrowser(url) {
  const child = spawn("xdg-open", [url], { detached: true, stdio: "ignore" });
  child.once("error", () => {
    process.stderr.write("Could not open a browser automatically; open the printed URL manually.\n");
  });
  child.unref();
}

export async function main(argv = process.argv.slice(2)) {
  const { command, flags } = parseArguments(argv);
  const paths = resolveSearchConsolePaths();
  const property = String(flags.property || process.env.GOOGLE_SEARCH_CONSOLE_PROPERTY || DEFAULT_PROPERTY);

  if (command === "help" || flags.help) {
    printHelp();
    return;
  }
  if (command === "status") {
    printJson(await connectionStatus(paths));
    return;
  }
  if (command === "auth") {
    const result = await authorize(paths, {
      onAuthorizationUrl: (url) => {
        process.stdout.write(`Open this Google authorization URL:\n${url}\n`);
        if (flags.open) void openBrowser(url);
      },
    });
    printJson({ connected: true, permission: "read-only", ...result });
    return;
  }
  if (command === "sites") {
    printJson(await listSites(paths));
    return;
  }
  if (command === "sitemaps") {
    printJson(await listSitemaps(paths, property));
    return;
  }
  if (command === "performance") {
    const dimensions = String(flags.dimensions || "date,query,page").split(",").map((value) => value.trim()).filter(Boolean);
    printJson(await queryPerformance(paths, property, {
      startDate: String(flags["start-date"] || isoDateDaysAgo(31)),
      endDate: String(flags["end-date"] || isoDateDaysAgo(3)),
      dimensions,
      rowLimit: flags["row-limit"] || 1000,
      startRow: flags["start-row"] || 0,
      type: flags.type || "web",
      query: flags.query,
      page: flags.page,
      country: flags.country,
      device: flags.device,
      dataState: flags["data-state"] || "final",
    }));
    return;
  }
  if (command === "inspect") {
    if (typeof flags.url !== "string" || flags.url === "") throw new Error("inspect requires --url https://quoska.de/path");
    printJson(await inspectUrl(paths, property, flags.url));
    return;
  }
  throw new Error(`Unknown command: ${command}. Run with \`help\` for usage.`);
}

main().catch((error) => {
  process.stderr.write(`Search Console: ${error instanceof Error ? error.message : "unexpected error"}\n`);
  process.exitCode = 1;
});
