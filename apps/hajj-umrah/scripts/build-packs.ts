// Usage: npm run build:packs. Writes public/packs/{lang}/{version}/content.json and public/packs/manifest.json.
// Refuses to build from content that fails the Principle I checks.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { validateContent } from "./content-validation.ts";
import { buildPacks } from "./packs.ts";
import { appDir, readContent } from "./read-content.ts";

const files = readContent();
const errors = validateContent(files);
if (errors.length) {
  console.error(`Not building packs; content check failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  process.exit(1);
}

const publicDir = join(appDir, "public");
const { manifest, packs } = buildPacks(files);
rmSync(join(publicDir, "packs"), { recursive: true, force: true });
for (const pack of packs) {
  const file = join(publicDir, pack.path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, pack.body);
}
writeFileSync(join(publicDir, "packs/manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
for (const p of manifest.packs) console.log(`${p.language} ${p.version} ${(p.bytes / 1024).toFixed(1)} KB`);
