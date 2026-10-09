// Journey content bundled with the app shell (precached, so it works offline).
// TODO(T025, T026): load from downloaded packs instead of bundling.
import umrah from "../../content/journeys/umrah.json";
import arUmrah from "../../content/i18n/ar/umrah.json";
import enUmrah from "../../content/i18n/en/umrah.json";
import urUmrah from "../../content/i18n/ur/umrah.json";
import type { Language } from "../i18n";
import type { Journey, JourneyType, StepText } from "./types";

/** Step text plus any ruling note keys the step names (see Step.rulingNote). */
export type StepTexts = Record<string, StepText & Record<string, unknown>>;

// The JSON is checked against the schema by `npm run validate:content` in CI.
const journeys: Partial<Record<JourneyType, { journey: Journey; texts: Record<Language, StepTexts> }>> = {
  umrah: {
    journey: umrah as Journey,
    texts: { ar: arUmrah as StepTexts, en: enUmrah as StepTexts, ur: urUmrah as StepTexts },
  },
};

/** Content for a journey, or null while it hasn't been written (Hajj until T031). */
export function journeyContent(type: JourneyType) {
  return journeys[type] ?? null;
}
