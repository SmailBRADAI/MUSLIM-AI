// Supplications shown on each step (T034, FR-030). Bundled with the app shell like the journeys.
// The JSON is checked by `npm run validate:content`; nothing here writes or changes ritual text.
import supplications from "../../content/supplications.json";
import ar from "../../content/i18n/ar/supplications.json";
import en from "../../content/i18n/en/supplications.json";
import ur from "../../content/i18n/ur/supplications.json";
import type { Language } from "../i18n";
import type { Step, Supplication, SupplicationText } from "./types";

const items = supplications.items as Supplication[];
const texts: Record<Language, Record<string, SupplicationText>> = {
  ar: ar as Record<string, SupplicationText>,
  en: en as Record<string, SupplicationText>,
  ur: ur as Record<string, SupplicationText>,
};

export interface StepSupplication {
  supplication: Supplication;
  text: SupplicationText;
}

/** The step's supplications in the order the step lists them. An id with no text in this language is skipped, never guessed. */
export function supplicationsOf(step: Pick<Step, "supplicationIds">, language: Language): StepSupplication[] {
  return step.supplicationIds.flatMap((id) => {
    const supplication = items.find((s) => s.id === id);
    const text = texts[language][id];
    return supplication && text ? [{ supplication, text }] : [];
  });
}
