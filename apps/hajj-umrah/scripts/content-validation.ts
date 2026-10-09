// Content checks for Constitution Principle I. Pure functions so they can be unit tested;
// scripts/validate-content.ts reads the files and runs them.
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import type { Journey, ReviewStatus, StepText } from "../src/data/types.ts";
import type { Language } from "../src/i18n/index.tsx";

export const LANGUAGES = ["ar", "en", "ur"] as const satisfies readonly Language[];
export const STEP_TEXT_FIELDS = ["title", "instruction", "details", "mistakes"] as const satisfies readonly (keyof StepText)[];
const REVIEW_STATUSES: readonly ReviewStatus[] = ["draft", "in-review", "approved"];

export interface ContentFiles {
  schema: object;
  reviewers: { reviewers: string[] };
  /** File name → parsed journey JSON. */
  journeys: Record<string, unknown>;
  /** Language → journey file name → step id → text. Parsed JSON, so shapes are checked here. */
  texts: Record<string, Record<string, Record<string, Partial<StepText> & Record<string, unknown>>>>;
}

export function validateContent(files: ContentFiles): string[] {
  const errors: string[] = [];
  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  const validateJourney = ajv.compile(files.schema);
  const reviewers = new Set(files.reviewers.reviewers);
  const journeyIds = new Map<string, string>();
  const stageIds = new Map<string, string>();
  const stepIds = new Map<string, string>();

  const unique = (seen: Map<string, string>, kind: string, id: string, file: string) => {
    const previous = seen.get(id);
    if (previous) errors.push(`${file}: duplicate ${kind} id "${id}" (also in ${previous})`);
    seen.set(id, file);
  };

  for (const [file, data] of Object.entries(files.journeys)) {
    if (!validateJourney(data)) {
      for (const e of validateJourney.errors ?? []) errors.push(`${file}: ${e.instancePath || "/"} ${e.message}`);
      continue;
    }
    const journey = data as Journey;
    unique(journeyIds, "journey", journey.id, file);

    for (const stage of journey.stages) {
      unique(stageIds, "stage", stage.id, file);

      for (const step of stage.steps) {
        unique(stepIds, "step", step.id, file);
        if (step.meta.status === "approved" && !reviewers.has(step.meta.reviewer ?? "")) {
          errors.push(`${file}: "${step.id}" is approved by "${step.meta.reviewer}", who does not hold the content reviewer role`);
        }

        for (const lang of LANGUAGES) {
          const text = files.texts[lang]?.[file]?.[step.id];
          if (!text) {
            errors.push(`${file}: "${step.id}" has no ${lang} text`);
            continue;
          }
          for (const field of STEP_TEXT_FIELDS) {
            if (typeof text[field] !== "string" || !text[field].trim()) errors.push(`${file}: "${step.id}" is missing ${lang} ${field}`);
          }
          if (step.diagram && !String(text.diagramLabel ?? "").trim()) {
            errors.push(`${file}: "${step.id}" has a ${step.diagram} diagram but no ${lang} diagramLabel`);
          }
          if (step.rulingNote && !String(text[step.rulingNote] ?? "").trim()) {
            errors.push(`${file}: "${step.id}" is missing ${lang} ruling note "${step.rulingNote}"`);
          }

          // Each translation is reviewed on its own (constitution I, FR-007).
          const review = text.review;
          if (!review || !REVIEW_STATUSES.includes(review.status)) {
            errors.push(`${file}: "${step.id}" ${lang} text has no valid review status`);
          } else if (review.status === "approved") {
            if (!reviewers.has(review.reviewer ?? "")) {
              errors.push(`${file}: "${step.id}" ${lang} text is approved by "${review.reviewer}", who does not hold the content reviewer role`);
            }
            if (!review.reviewedAt) errors.push(`${file}: "${step.id}" ${lang} text is approved without a review date`);
          }
        }
      }
    }
  }

  // Text for steps that no journey defines is usually a typo in a step id.
  for (const lang of LANGUAGES) {
    for (const [file, entries] of Object.entries(files.texts[lang] ?? {})) {
      for (const id of Object.keys(entries)) {
        if (!stepIds.has(id)) errors.push(`i18n/${lang}/${file}: "${id}" matches no step in any journey`);
      }
    }
  }
  return errors;
}
