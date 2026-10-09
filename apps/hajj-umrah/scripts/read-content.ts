// Reads content/ from disk in the shape validateContent and buildPacks expect.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LANGUAGES } from "./content-validation.ts";
import type { ContentFiles } from "./content-validation.ts";

export const appDir = join(import.meta.dirname, "..");
export const defaultContentDir = join(appDir, "content");
const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const jsonFiles = (dir: string) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")).sort() : []);

/** Reads the real content, or a copy of the content folder (the review helper tests use one). */
export function readContent(contentDir: string = defaultContentDir): ContentFiles {
  const journeysDir = join(contentDir, "journeys");
  return {
    schema: readJson(join(appDir, "../../specs/001-hajj-umrah-companion/contracts/content-pack.schema.json")),
    reviewers: readJson(join(contentDir, "reviewers.json")),
    journeys: Object.fromEntries(jsonFiles(journeysDir).map((f) => [f, readJson(join(journeysDir, f))])),
    texts: Object.fromEntries(
      LANGUAGES.map((lang) => {
        const dir = join(contentDir, "i18n", lang);
        return [lang, Object.fromEntries(jsonFiles(dir).map((f) => [f, readJson(join(dir, f))]))];
      }),
    ),
  };
}
