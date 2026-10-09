// Usage: npm run validate:content. Exits non-zero when any content breaks Constitution Principle I.
import { validateContent } from "./content-validation.ts";
import { readContent } from "./read-content.ts";

const files = readContent();
const errors = validateContent(files);

if (errors.length) {
  console.error(`Content check failed (${errors.length}):\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  process.exit(1);
}
console.log(`Content check passed: ${Object.keys(files.journeys).length} journey file(s).`);
