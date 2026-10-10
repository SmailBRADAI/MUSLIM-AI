// T031: the Hajj journeys' shape. Content checks that need no reviewer judgement.
import { describe, expect, it } from "vitest";
import { readContent } from "../../scripts/read-content";
import { orderedSteps } from "../../src/data/progress";
import type { Journey } from "../../src/data/types";

const files = readContent();
const journey = (id: string) => files.journeys[`${id}.json`] as Journey;
const HAJJ = ["hajj-tamattu", "hajj-qiran", "hajj-ifrad"] as const;
const IBN_BAZ = /^ابن باز،/;
const IBN_UTHAYMEEN = /^ابن عثيمين،/;

describe("Hajj journeys (T031)", () => {
  for (const id of HAJJ) {
    describe(id, () => {
      const j = journey(id);
      const steps = orderedSteps(j);

      it("covers every day from 8 to 13 Dhu al-Hijjah in order, and ends with the farewell", () => {
        const days = j.stages.filter((s) => s.day).map((s) => s.day);
        expect(days).toEqual([8, 9, 10, 11, 12, 13]);
        expect([...j.stages].sort((a, b) => a.order - b.order).at(-1)?.kind).toBe("farewell");
        expect(steps.at(-1)?.id).toBe(`${id}.tawaf-wada`);
      });

      it("is draft and cites both sheikhs on every step", () => {
        for (const step of steps) {
          expect(step.meta.status).toBe("draft");
          expect(step.meta.source.some((s) => IBN_BAZ.test(s)), step.id).toBe(true);
          expect(step.meta.source.some((s) => IBN_UTHAYMEEN.test(s)), step.id).toBe(true);
        }
      });

      it("numbers steps in the order they are performed", () => {
        expect(steps.map((s) => s.order)).toEqual(steps.map((_, i) => i + 1));
      });

      it("labels the pillars of Hajj as pillars", () => {
        const ruling = (suffix: string) => steps.find((s) => s.id === `${id}.${suffix}`)?.ruling;
        expect(ruling("arafah")).toBe("rukn");
        expect(ruling("tawaf-ifadah")).toBe("rukn");
        expect(ruling("sai")).toBe("rukn");
      });
    });
  }

  it("starts Tamattu' with its Umrah, then the Hajj days", () => {
    const stages = [...journey("hajj-tamattu").stages].sort((a, b) => a.order - b.order);
    expect(stages[0].kind).toBe("umrah");
    expect(orderedSteps(journey("hajj-tamattu")).slice(0, 5).map((s) => s.id.split(".")[1])).toEqual([
      "umrah-ihram",
      "umrah-tawaf",
      "umrah-tawaf-prayer",
      "umrah-sai",
      "umrah-taqsir",
    ]);
    expect(stages[1].day).toBe(8);
  });

  it("requires the sacrifice for Tamattu' and Qiran only", () => {
    const has = (id: string) => orderedSteps(journey(id)).some((s) => s.id === `${id}.hady`);
    expect([has("hajj-tamattu"), has("hajj-qiran"), has("hajj-ifrad")]).toEqual([true, true, false]);
  });
});

describe("Ruling notes (T033)", () => {
  const LANGS = ["ar", "en", "ur"] as const;
  const noted = HAJJ.flatMap((id) => orderedSteps(journey(id)).filter((s) => s.rulingNote).map((s) => ({ id, step: s })));

  it("gives other schools' positions on the steps where they differ, in every language, with a source", () => {
    const suffixes = new Set(noted.map(({ step }) => step.id.split(".")[1]));
    for (const s of ["arafah", "muzdalifah", "mina-nights", "jamarat-11", "jamarat-12", "tawaf-wada", "sai", "tawaf-qudum", "umrah-sai"]) {
      expect(suffixes.has(s), s).toBe(true);
    }
    for (const { id, step } of noted) {
      expect(step.rulingNote).toBe("otherSchools");
      expect(step.meta.source).toContain("ابن قدامة، المغني، كتاب الحج");
      for (const lang of LANGS) {
        const text = files.texts[lang][`${id}.json`][step.id] as Record<string, unknown>;
        expect(String(text.otherSchools ?? "").trim(), `${step.id} ${lang}`).not.toBe("");
      }
    }
  });

  it("shows both sheikhs' views where they differ on a detail (the weak leaving Muzdalifah)", () => {
    const names = { ar: ["ابن باز", "ابن عثيمين"], en: ["Ibn Baz", "Ibn Al-Uthaymeen"], ur: ["ابن باز", "ابن عثیمین"] };
    for (const id of HAJJ) {
      const step = orderedSteps(journey(id)).find((s) => s.id === `${id}.muzdalifah`)!;
      expect(step.meta.source.some((s) => s.includes("أسماء بنت أبي بكر"))).toBe(true);
      for (const lang of LANGS) {
        const details = String(files.texts[lang][`${id}.json`][step.id].details);
        for (const name of names[lang]) expect(details, `${id} ${lang}`).toContain(name);
      }
    }
  });

  it("uses one ruling label wherever the two sheikhs agree on it", () => {
    for (const id of HAJJ) expect(orderedSteps(journey(id)).filter((s) => s.rulingViews)).toEqual([]);
  });
});

describe("Step places (T047)", () => {
  const places = (id: string) => orderedSteps(journey(id)).map((s) => s.place);

  it("follows the Umrah from the miqat through the Haram", () => {
    expect(places("umrah")).toEqual(["miqat", "miqat", "mataf", "maqam", "masa", "makkah"]);
  });

  it("puts each Hajj step where it is performed", () => {
    for (const id of HAJJ) {
      for (const step of orderedSteps(journey(id))) {
        const name = step.id.split(".")[1];
        if (/tawaf-prayer$/.test(name)) expect(step.place, step.id).toBe("maqam");
        else if (/tawaf/.test(name)) expect(step.place, step.id).toBe("mataf");
        else if (/sai$/.test(name)) expect(step.place, step.id).toBe("masa");
        else if (/^jam/.test(name)) expect(step.place, step.id).toBe("jamarat");
        else if (/^mina-|^hady$|^halq$/.test(name)) expect(step.place, step.id).toBe("mina");
        else if (name === "arafah" || name === "muzdalifah") expect(step.place, step.id).toBe(name);
      }
    }
    // The Tamattu' pilgrim enters ihram for Hajj where they stay in Makkah, not at the miqat.
    expect(orderedSteps(journey("hajj-tamattu")).find((s) => s.id === "hajj-tamattu.ihram")?.place).toBe("makkah");
    expect(orderedSteps(journey("hajj-qiran"))[0].place).toBe("miqat");
  });
});
