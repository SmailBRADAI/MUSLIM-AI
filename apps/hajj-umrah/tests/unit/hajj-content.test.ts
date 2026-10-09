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

      it("is draft, cites both sheikhs on every step, and has no supplications yet (T034)", () => {
        for (const step of steps) {
          expect(step.meta.status).toBe("draft");
          expect(step.meta.source.some((s) => IBN_BAZ.test(s)), step.id).toBe(true);
          expect(step.meta.source.some((s) => IBN_UTHAYMEEN.test(s)), step.id).toBe(true);
          expect(step.supplicationIds).toEqual([]);
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
