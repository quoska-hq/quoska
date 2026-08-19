import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const sourceDirectory = path.join(projectRoot, "browser-extension", "src");
const outputDirectory = path.join(projectRoot, "browser-extension", "dist");
const configuredUrl = process.env.QUOSKA_EXTENSION_APP_URL ?? "https://quoska.de";
const appUrl = new URL(configuredUrl);

if (
  !["https:", "http:"].includes(appUrl.protocol) ||
  (appUrl.protocol === "http:" && !["localhost", "127.0.0.1"].includes(appUrl.hostname)) ||
  appUrl.pathname !== "/" ||
  appUrl.search ||
  appUrl.hash
) {
  throw new Error(
    "QUOSKA_EXTENSION_APP_URL must be an HTTPS origin or an HTTP localhost origin.",
  );
}

if (!outputDirectory.startsWith(`${path.join(projectRoot, "browser-extension")}${path.sep}`)) {
  throw new Error("Refusing to write outside browser-extension/.");
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const entry of await readdir(sourceDirectory, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const sourcePath = path.join(sourceDirectory, entry.name);
  const outputPath = path.join(outputDirectory, entry.name);
  if (entry.name === "config.js") {
    const source = await readFile(sourcePath, "utf8");
    await writeFile(
      outputPath,
      source.replaceAll("__QUOSKA_APP_URL__", appUrl.origin),
      "utf8",
    );
  } else if (entry.name === "manifest.json") {
    const manifest = JSON.parse(await readFile(sourcePath, "utf8"));
    manifest.host_permissions = [`${appUrl.origin}/*`];
    await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  } else {
    await cp(sourcePath, outputPath);
  }
}

await mkdir(path.join(outputDirectory, "icons"), { recursive: true });
await cp(
  path.join(projectRoot, "public", "icons", "icon-192.png"),
  path.join(outputDirectory, "icons", "icon-192.png"),
);

console.log(`Built Quoska extension for ${appUrl.origin} in ${outputDirectory}`);
