// T053 (FR-029): one picture per step where we have one. The pictures are AI-generated illustrations
// (provenance and review in content/sources/step-pictures.md); the description read by screen readers is a UI
// string (`stepPictures.<key>`), not ritual content.

export const PICTURE_KEYS = ["ihram", "ihram-rules", "tawaf-prayer", "sai", "halq"] as const;
export type PictureKey = (typeof PICTURE_KEYS)[number];

const BY_STEP: Record<string, PictureKey> = {
  "umrah.ihram": "ihram",
  "hajj-tamattu.umrah-ihram": "ihram",
  "umrah.ihram-rules": "ihram-rules",
  "umrah.tawaf-prayer": "tawaf-prayer",
  "hajj-tamattu.umrah-tawaf-prayer": "tawaf-prayer",
  "umrah.sai": "sai",
  "hajj-tamattu.umrah-sai": "sai",
  "umrah.halq": "halq",
  "hajj-tamattu.halq": "halq",
  "hajj-qiran.halq": "halq",
  "hajj-ifrad.halq": "halq",
};

/** The picture key of a step, or undefined when the step has none. */
export const pictureOf = (stepId: string): PictureKey | undefined => BY_STEP[stepId];

/** Path under the app's base URL (works on GitHub Pages and in the store wrappers). */
export const pictureSrc = (key: PictureKey): string => `${import.meta.env.BASE_URL}illustrations/${key}.webp`;
