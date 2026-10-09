import { describe, expect, it, vi } from "vitest";
import * as db from "../../src/data/db";
import { completion, currentStep, orderedSteps, setStepDone, withStep } from "../../src/data/progress";
import type { Journey, Step } from "../../src/data/types";
import umrah from "../../content/journeys/umrah.json";

const step = (id: string, order: number): Step => ({
  id,
  order,
  ruling: "sunnah",
  place: "mina",
  supplicationIds: [],
  meta: { source: ["test"], status: "draft", version: "0" },
});

// Stages and steps deliberately out of order in the array.
const journey: Journey = {
  id: "test",
  type: "umrah",
  version: "0",
  stages: [
    { id: "b", order: 2, steps: [step("t.c", 2), step("t.b", 1)] },
    { id: "a", order: 1, steps: [step("t.a", 1)] },
  ],
};

describe("progress (T019)", () => {
  it("orders steps by stage, then by step", () => {
    expect(orderedSteps(journey).map((s) => s.id)).toEqual(["t.a", "t.b", "t.c"]);
  });

  it("orders the Umrah content as performed", () => {
    expect(orderedSteps(umrah as Journey).map((s) => s.id)).toEqual([
      "umrah.ihram",
      "umrah.ihram-rules",
      "umrah.tawaf",
      "umrah.tawaf-prayer",
      "umrah.sai",
      "umrah.halq",
    ]);
  });

  it("points to the first step not done, even when steps were done out of order", () => {
    expect(currentStep(journey, [])?.id).toBe("t.a");
    expect(currentStep(journey, ["t.a", "t.c"])?.id).toBe("t.b");
    expect(currentStep(journey, ["t.a", "t.b", "t.c"])).toBeNull();
  });

  it("measures completion and ignores ids from other journeys", () => {
    expect(completion(journey, ["t.a", "other.x"])).toBeCloseTo(1 / 3);
    expect(completion({ ...journey, stages: [] }, [])).toBe(0);
  });

  it("adds a step once and removes it on undo", () => {
    expect(withStep(["t.a"], "t.a", true)).toEqual(["t.a"]);
    expect(withStep(["t.a", "t.b"], "t.a", false)).toEqual(["t.b"]);
  });

  it("saves on the device before resolving", async () => {
    expect(await setStepDone("test", [], "t.a", true)).toEqual(["t.a"]);
    expect((await db.getProgress("test")).completedStepIds).toEqual(["t.a"]);
    expect(await setStepDone("test", ["t.a"], "t.a", false)).toEqual([]);
    expect((await db.getProgress("test")).completedStepIds).toEqual([]);
  });

  it("rejects when the device write fails, so the screen can say so", async () => {
    const save = vi.spyOn(db, "saveProgress").mockRejectedValue(new Error("quota"));
    await expect(setStepDone("test", [], "t.a", true)).rejects.toThrow("quota");
    save.mockRestore();
  });
});
