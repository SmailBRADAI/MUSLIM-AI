// Usage: npm run validate:content. Exits non-zero when any content breaks Constitution Principle I.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LANGUAGES, validateContent } from "./content-validation.ts";

const appDir = join(import.meta.dirname, "..");
const contentDir = join(appDir, "content");
const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const jsonFiles = (dir: string) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")) : []);

const journeysDir = join(contentDir, "journeys");
const journeys = Object.fromEntries(jsonFiles(journeysDir).map((f) => [f, readJson(join(journeysDir, f))]));
const texts = Object.fromEntries(
  LANGUAGES.map((lang) => {
    const dir = join(contentDir, "i18n", lang);
    return [lang, Object.fromEntries(jsonFiles(dir).map((f) => [f, readJson(join(dir, f))]))];
  }),
);

const errors = validateContent({
  schema: readJson(join(appDir, "../../specs/001-hajj-umrah-companion/contracts/content-pack.schema.json")),
  reviewers: readJson(join(contentDir, "reviewers.json")),
  journeys,
  texts,
});

if (errors.length) {
  console.error(`Content check failed (${errors.length}):\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  process.exit(1);
}
console.log(`Content check passed: ${Object.keys(journeys).length} journey file(s).`);
