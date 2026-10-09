import { describe, expect, it } from "vitest";
import * as db from "../../src/data/db";

describe("db", () => {
  it("migrates the prototype's localStorage keys once, then clears them", async () => {
    localStorage.setItem("rafiq-language", "ur");
    localStorage.setItem("rafiq-tawaf-complete", "true");
    expect(await db.getLanguage()).toBe("ur");
    expect((await db.getProgress("umrah")).completedStepIds).toEqual(["umrah.tawaf"]);
    expect(localStorage.getItem("rafiq-language")).toBeNull();
    expect(localStorage.getItem("rafiq-tawaf-complete")).toBeNull();
  });

  it("ignores an invalid legacy language", async () => {
    localStorage.setItem("rafiq-language", "fr");
    expect(await db.getLanguage()).toBeNull();
  });

  it("returns empty progress for a journey never started", async () => {
    expect((await db.getProgress("hajj-tamattu")).completedStepIds).toEqual([]);
  });
});
