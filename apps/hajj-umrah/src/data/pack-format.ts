// The downloadable pack format, shared by scripts/build-packs.ts and src/data/packs.ts (T025, T026).
import type { Language } from "../i18n";
import type { Journey, StepText } from "./types";

export interface PackContent {
  format: 1;
  language: Language;
  /** Hash of the content: changes exactly when the content does. */
  version: string;
  journeys: Journey[];
  /** Journey id → step id → text in this language (plus any ruling note keys). */
  texts: Record<string, Record<string, StepText & Record<string, unknown>>>;
}

export interface PackManifestEntry {
  language: Language;
  version: string;
  /** Relative to the app's base URL. */
  url: string;
  bytes: number;
  /** Of the file body, checked after download before the pack is marked installed. */
  sha256: string;
  journeys: { id: string; version: string }[];
}

export interface PackManifest {
  format: 1;
  packs: PackManifestEntry[];
}
