// Content checks for Constitution Principle I. Pure functions so they can be unit tested;
// scripts/validate-content.ts reads the files and runs them.
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { diagramsOf, requiredDiagramItems } from "../src/data/diagrams.ts";
import { GRADINGS, SUPPLICATION_KINDS, SUPPLICATION_SCOPES } from "../src/data/types.ts";
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
  /** content/supplications.json (T034). */
  supplications?: { items?: Array<Record<string, any>> };
  /** Language → supplication id → text. */
  supplicationTexts?: Record<string, Record<string, Record<string, any>>>;
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

  const supplicationIds = new Set<string>();
  errors.push(...validateSupplications(files, reviewers, supplicationIds));

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

    const hajj = journey.type !== "umrah";
    if (hajj) {
      // The Guide shows Hajj stages in `order`: the opening part (Tamattu' Umrah, or arrival for Qiran
      // and Ifrad), then each day once and in date order, then the farewell.
      const opening = journey.type === "hajj-tamattu" ? "umrah" : "arrival";
      const rank = (s: Journey["stages"][number]) =>
        s.kind === opening ? 0 : s.kind === "farewell" ? 100 : s.day ?? Number.NaN;
      let previous = -1;
      for (const stage of [...journey.stages].sort((a, b) => a.order - b.order)) {
        const r = rank(stage);
        if (stage.kind !== undefined && stage.kind !== opening && stage.kind !== "farewell") {
          errors.push(`${file}: stage "${stage.id}" has kind "${stage.kind}", which ${journey.type} does not use`);
        } else if (Number.isNaN(r)) {
          continue; // no day and no kind: reported below
        } else if (r <= previous) {
          errors.push(`${file}: stage "${stage.id}" is out of place (opening part, days 8 to 13 once each in order, then farewell)`);
        }
        if (!Number.isNaN(r)) previous = Math.max(previous, r);
      }
    }
    for (const stage of journey.stages) {
      unique(stageIds, "stage", stage.id, file);
      // The Guide groups Hajj steps by day (T032): every Hajj stage is one day or one named part, never both.
      if (hajj && (stage.day === undefined) === (stage.kind === undefined)) {
        errors.push(`${file}: stage "${stage.id}" needs exactly one of day or kind`);
      }
      if (!hajj && (stage.day !== undefined || stage.kind !== undefined)) {
        errors.push(`${file}: stage "${stage.id}" has a Hajj day or kind in an Umrah journey`);
      }

      for (const step of stage.steps) {
        unique(stepIds, "step", step.id, file);
        for (const id of step.supplicationIds) {
          if (!supplicationIds.has(id)) errors.push(`${file}: "${step.id}" lists supplication "${id}", which content/supplications.json does not define`);
        }
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
          const diagrams = diagramsOf(step);
          if (diagrams.length && !String(text.diagramLabel ?? "").trim()) {
            errors.push(`${file}: "${step.id}" has a ${diagrams[0]} diagram but no ${lang} diagramLabel`);
          }
          // T049: the labels inside the illustrations are reviewed text too, one per key and language.
          const items = text.diagramItems as Record<string, unknown> | undefined;
          for (const key of requiredDiagramItems(diagrams)) {
            if (typeof items?.[key] !== "string" || !items[key].trim()) errors.push(`${file}: "${step.id}" is missing ${lang} diagram label "${key}"`);
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

/** T034: every supplication is sourced, graded, scoped and written in every language; approvals need a reviewer (constitution I). */
function validateSupplications(files: ContentFiles, reviewers: Set<string>, ids: Set<string>): string[] {
  const errors: string[] = [];
  for (const item of files.supplications?.items ?? []) {
    const id = String(item.id ?? "");
    if (!/^[a-z0-9-]+$/.test(id)) errors.push(`supplications: invalid id "${id}"`);
    if (ids.has(id)) errors.push(`supplications: duplicate id "${id}"`);
    ids.add(id);
    if (!SUPPLICATION_KINDS.includes(item.kind)) errors.push(`supplications: "${id}" has an unknown kind`);
    if (!SUPPLICATION_SCOPES.includes(item.scope)) errors.push(`supplications: "${id}" must be specific or general`);
    if (!GRADINGS.includes(item.grading)) errors.push(`supplications: "${id}" has no valid grading`);
    if (typeof item.arabic !== "string" || !item.arabic.trim()) errors.push(`supplications: "${id}" has no Arabic text`);
    const meta = item.meta ?? {};
    if (!Array.isArray(meta.source) || meta.source.length === 0) errors.push(`supplications: "${id}" has no source`);
    if (!REVIEW_STATUSES.includes(meta.status)) errors.push(`supplications: "${id}" has no valid status`);
    if (meta.status === "approved" && !reviewers.has(meta.reviewer ?? "")) {
      errors.push(`supplications: "${id}" is approved by "${meta.reviewer}", who does not hold the content reviewer role`);
    }
    for (const lang of LANGUAGES) {
      const text = files.supplicationTexts?.[lang]?.[id];
      if (!text) {
        errors.push(`supplications: "${id}" has no ${lang} text`);
        continue;
      }
      for (const field of ["title", "when", ...(lang === "ar" ? [] : ["meaning"]), ...(lang === "en" ? ["transliteration"] : [])]) {
        if (typeof text[field] !== "string" || !text[field].trim()) errors.push(`supplications: "${id}" is missing ${lang} ${field}`);
      }
      const review = text.review;
      if (!review || !REVIEW_STATUSES.includes(review.status)) errors.push(`supplications: "${id}" ${lang} text has no valid review status`);
      else if (review.status === "approved" && !reviewers.has(review.reviewer ?? "")) {
        errors.push(`supplications: "${id}" ${lang} text is approved by "${review.reviewer}", who does not hold the content reviewer role`);
      }
    }
  }
  for (const lang of LANGUAGES) {
    for (const id of Object.keys(files.supplicationTexts?.[lang] ?? {})) {
      if (!ids.has(id)) errors.push(`i18n/${lang}/supplications.json: "${id}" matches no supplication`);
    }
  }
  return errors;
}
