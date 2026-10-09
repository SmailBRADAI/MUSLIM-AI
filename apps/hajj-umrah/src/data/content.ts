// Journey content. The text is bundled with the app shell (precached) so the guide works before the
// first download; once a pack is installed for the current language, the guide reads from it (plan: Packs).
import hajjIfrad from "../../content/journeys/hajj-ifrad.json";
import hajjQiran from "../../content/journeys/hajj-qiran.json";
import hajjTamattu from "../../content/journeys/hajj-tamattu.json";
import umrah from "../../content/journeys/umrah.json";
import arIfrad from "../../content/i18n/ar/hajj-ifrad.json";
import arQiran from "../../content/i18n/ar/hajj-qiran.json";
import arTamattu from "../../content/i18n/ar/hajj-tamattu.json";
import arUmrah from "../../content/i18n/ar/umrah.json";
import enIfrad from "../../content/i18n/en/hajj-ifrad.json";
import enQiran from "../../content/i18n/en/hajj-qiran.json";
import enTamattu from "../../content/i18n/en/hajj-tamattu.json";
import enUmrah from "../../content/i18n/en/umrah.json";
import urIfrad from "../../content/i18n/ur/hajj-ifrad.json";
import urQiran from "../../content/i18n/ur/hajj-qiran.json";
import urTamattu from "../../content/i18n/ur/hajj-tamattu.json";
import urUmrah from "../../content/i18n/ur/umrah.json";
import type { Language } from "../i18n";
import type { PackContent } from "./pack-format";
import type { Journey, JourneyType, StepText } from "./types";

/** Step text plus any ruling note keys the step names (see Step.rulingNote). */
export type StepTexts = Record<string, StepText & Record<string, unknown>>;

// The JSON is checked against the schema by `npm run validate:content` in CI.
const journeys: Partial<Record<JourneyType, { journey: Journey; texts: Record<Language, StepTexts> }>> = {
  umrah: {
    journey: umrah as Journey,
    texts: { ar: arUmrah as StepTexts, en: enUmrah as StepTexts, ur: urUmrah as StepTexts },
  },
  "hajj-tamattu": {
    journey: hajjTamattu as Journey,
    texts: { ar: arTamattu as StepTexts, en: enTamattu as StepTexts, ur: urTamattu as StepTexts },
  },
  "hajj-qiran": {
    journey: hajjQiran as Journey,
    texts: { ar: arQiran as StepTexts, en: enQiran as StepTexts, ur: urQiran as StepTexts },
  },
  "hajj-ifrad": {
    journey: hajjIfrad as Journey,
    texts: { ar: arIfrad as StepTexts, en: enIfrad as StepTexts, ur: urIfrad as StepTexts },
  },
};

/** Compares dotted numeric versions ("0.10.0" > "0.9.2"). */
export function compareVersions(a: string, b: string) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff) return Math.sign(diff);
  }
  return 0;
}

/**
 * Content for a journey in one language, or null when none has been written for it.
 * An installed pack is used only when it is newer than the copy bundled with this version of the app,
 * so an old download never hides a correction or a withdrawn approval (constitution I).
 */
export function journeyContent(type: JourneyType, language: Language, pack?: PackContent | null) {
  const bundled = journeys[type];
  const fromPack = pack?.language === language ? pack.journeys.find((j) => j.type === type) : undefined;
  const packIsNewer = fromPack && (!bundled || compareVersions(fromPack.version, bundled.journey.version) > 0);
  if (fromPack && packIsNewer && pack?.texts[fromPack.id]) return { journey: fromPack, texts: pack.texts[fromPack.id] as StepTexts };
  return bundled ? { journey: bundled.journey, texts: bundled.texts[language] } : null;
}
