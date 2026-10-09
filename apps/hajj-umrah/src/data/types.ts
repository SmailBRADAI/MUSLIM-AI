// Mirrors specs/001-hajj-umrah-companion/contracts/content-pack.schema.json.

export const JOURNEY_TYPES = ["umrah", "hajj-tamattu", "hajj-qiran", "hajj-ifrad"] as const;
export type JourneyType = (typeof JOURNEY_TYPES)[number];
export const HAJJ_TYPES = ["hajj-tamattu", "hajj-qiran", "hajj-ifrad"] as const satisfies readonly JourneyType[];

export function isJourneyType(value: unknown): value is JourneyType {
  return typeof value === "string" && (JOURNEY_TYPES as readonly string[]).includes(value);
}
export type ReviewStatus = "draft" | "in-review" | "approved";
export type Ruling = "rukn" | "wajib" | "sunnah" | "mustahabb";
export type Scholar = "ibn-baz" | "ibn-uthaymeen";

export interface ContentMeta {
  source: string[];
  status: ReviewStatus;
  /** GitHub handle of a content reviewer role holder (content/reviewers.json). Required when approved. */
  reviewer?: string;
  /** ISO date. Required when approved. */
  reviewedAt?: string;
  version: string;
}

export interface RulingView {
  scholar: Scholar;
  ruling: Ruling;
  source: string;
}

export interface Step {
  id: string;
  order: number;
  /** Per the declared framework: the fatwas of Ibn Baz and Ibn Al-Uthaymeen. */
  ruling: Ruling;
  /** Present only when Ibn Baz and Ibn Al-Uthaymeen differ. */
  rulingViews?: RulingView[];
  /** i18n key for other schools' positions; informational only. */
  rulingNote?: string;
  supplicationIds: string[];
  audioId?: string;
  diagram?: "tawaf" | "sai";
  meta: ContentMeta;
}

export interface Stage {
  id: string;
  order: number;
  /** Dhu al-Hijjah day, Hajj only. */
  day?: number;
  steps: Step[];
}

export interface Journey {
  id: string;
  type: JourneyType;
  version: string;
  framework?: "ibn-baz+ibn-uthaymeen";
  stages: Stage[];
}

/** Review of one language's text; translations are reviewed on their own (constitution I). */
export interface TextReview {
  status: ReviewStatus;
  reviewer?: string;
  reviewedAt?: string;
}

/** Per-language text for one step, keyed by step id in content/i18n/{lang}/{journey}.json. */
export interface StepText {
  title: string;
  instruction: string;
  details: string;
  mistakes: string;
  review: TextReview;
}

/** A step is shown as reviewed in a language only when the step and that language's text are both approved. */
export function displayStatus(step: Pick<Step, "meta">, text: Pick<StepText, "review">): ReviewStatus {
  if (step.meta.status === "approved" && text.review.status === "approved") return "approved";
  return step.meta.status === "draft" || text.review.status === "draft" ? "draft" : "in-review";
}
