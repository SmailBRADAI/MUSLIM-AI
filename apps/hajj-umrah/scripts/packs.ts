// T025: one downloadable pack per language. Pure so it can be unit tested; build-packs.ts writes the files.
import { createHash } from "node:crypto";
import { LANGUAGES } from "./content-validation.ts";
import type { ContentFiles } from "./content-validation.ts";
import type { Journey } from "../src/data/types.ts";
import type { PackContent, PackManifest } from "../src/data/pack-format.ts";

export interface BuiltPack {
  /** Path under public/, e.g. packs/en/3f2a9c1b0d4e/content.json */
  path: string;
  body: string;
}

export function buildPacks(files: ContentFiles): { manifest: PackManifest; packs: BuiltPack[] } {
  const journeys = Object.entries(files.journeys)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([file, journey]) => ({ file, journey: journey as Journey }));

  const packs: BuiltPack[] = [];
  const manifest: PackManifest = { format: 1, packs: [] };
  for (const language of LANGUAGES) {
    const content: Omit<PackContent, "version"> = {
      format: 1,
      language,
      journeys: journeys.map(({ journey }) => journey),
      // Callers validate the content first (build-packs.ts), so every step has complete text here.
      texts: Object.fromEntries(
        journeys.map(({ file, journey }) => [journey.id, (files.texts[language]?.[file] ?? {}) as PackContent["texts"][string]]),
      ),
    };
    // The version is a hash of the content, so it changes exactly when the content does.
    const version = sha256(JSON.stringify(content)).slice(0, 12);
    const body = JSON.stringify({ ...content, version } satisfies PackContent);
    const path = `packs/${language}/${version}/content.json`;
    packs.push({ path, body });
    manifest.packs.push({
      language,
      version,
      url: path,
      bytes: Buffer.byteLength(body),
      sha256: sha256(body),
      journeys: journeys.map(({ journey }) => ({ id: journey.id, version: journey.version })),
    });
  }
  return { manifest, packs };
}

export function sha256(text: string) {
  return createHash("sha256").update(text).digest("hex");
}
