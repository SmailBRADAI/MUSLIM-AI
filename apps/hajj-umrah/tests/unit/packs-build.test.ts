import { describe, expect, it } from "vitest";
import { buildPacks, sha256 } from "../../scripts/packs";
import { readContent } from "../../scripts/read-content";

describe("buildPacks (T025)", () => {
  const files = readContent();
  const { manifest, packs } = buildPacks(files);

  it("builds one pack per language with only that language's text", () => {
    expect(manifest.packs.map((p) => p.language)).toEqual(["ar", "en", "ur"]);
    const en = JSON.parse(packs[1].body);
    expect(en.language).toBe("en");
    expect(en.texts.umrah["umrah.tawaf"].title).toBe("Tawaf");
    expect(en.journeys.map((j: { id: string }) => j.id)).toEqual(["umrah"]);
  });

  it("lists size and checksum of each file, and its versioned path", () => {
    for (const [i, entry] of manifest.packs.entries()) {
      expect(entry.url).toBe(packs[i].path);
      expect(entry.url).toBe(`packs/${entry.language}/${entry.version}/content.json`);
      expect(entry.bytes).toBe(Buffer.byteLength(packs[i].body));
      expect(entry.sha256).toBe(sha256(packs[i].body));
    }
  });

  it("is deterministic and changes version only when the content changes", () => {
    expect(buildPacks(files).manifest).toEqual(manifest);
    const edited = structuredClone(files);
    (edited.texts.en["umrah.json"]["umrah.tawaf"] as { title: string }).title = "Tawaf (edited)";
    const next = buildPacks(edited).manifest.packs;
    expect(next[1].version).not.toBe(manifest.packs[1].version);
    expect(next[0].version).toBe(manifest.packs[0].version);
  });
});
