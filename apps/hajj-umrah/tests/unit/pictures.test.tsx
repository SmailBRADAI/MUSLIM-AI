// T053: step pictures (FR-029).
import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PICTURE_KEYS, pictureOf, pictureSrc } from "../../src/data/pictures";
import { strings } from "../../src/i18n";
import umrah from "../../content/journeys/umrah.json";
import tamattu from "../../content/journeys/hajj-tamattu.json";
import qiran from "../../content/journeys/hajj-qiran.json";
import ifrad from "../../content/journeys/hajj-ifrad.json";
import type { Journey } from "../../src/data/types";

const ids = (j: unknown) => (j as Journey).stages.flatMap((s) => s.steps.map((x) => x.id));

describe("step pictures", () => {
  it("maps real step ids and every picture exists, with a description in all three languages", () => {
    const all = [umrah, tamattu, qiran, ifrad].flatMap(ids);
    const mapped = all.filter((id) => pictureOf(id));
    expect(mapped.length).toBe(11);
    for (const key of PICTURE_KEYS) {
      expect(existsSync(join(__dirname, "../../public/illustrations", `${key}.webp`))).toBe(true);
      for (const lang of ["ar", "en", "ur"] as const) expect(strings[lang].stepPictures[key].length).toBeGreaterThan(10);
    }
    expect(pictureSrc("sai")).toMatch(/illustrations\/sai\.webp$/);
  });
  it("gives no picture to a step without one", () => {
    expect(pictureOf("umrah.tawaf")).toBeUndefined();
  });
});
