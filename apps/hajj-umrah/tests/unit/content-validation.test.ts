import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateContent } from "../../scripts/content-validation";
import type { ContentFiles } from "../../scripts/content-validation";

const schema = JSON.parse(
  readFileSync(join(__dirname, "../../../../specs/001-hajj-umrah-companion/contracts/content-pack.schema.json"), "utf8"),
);

const text = { title: "t", instruction: "i", details: "d", mistakes: "m", review: { status: "draft" as const } };

function files(stepMeta: object = {}, overrides: Partial<ContentFiles> = {}): ContentFiles {
  const journey = {
    id: "umrah",
    type: "umrah",
    version: "2026.10.0",
    framework: "ibn-baz+ibn-uthaymeen",
    stages: [
      {
        id: "umrah.main",
        order: 1,
        steps: [
          {
            id: "umrah.tawaf",
            order: 2,
            ruling: "rukn",
            supplicationIds: [],
            meta: { source: ["Ibn Baz, at-Tahqiq wal-Idah"], status: "draft", version: "2026.10.0", ...stepMeta },
          },
        ],
      },
    ],
  };
  const stepTexts = { "umrah.json": { "umrah.tawaf": text } };
  return {
    schema,
    reviewers: { reviewers: ["approved-reviewer"] },
    journeys: { "umrah.json": journey },
    texts: { ar: stepTexts, en: stepTexts, ur: stepTexts },
    ...overrides,
  };
}

describe("validateContent", () => {
  it("accepts a sourced draft step with text in all three languages", () => {
    expect(validateContent(files())).toEqual([]);
  });

  it("requires a reviewed caption for a step with a diagram", () => {
    const withDiagram = files();
    const journey = withDiagram.journeys["umrah.json"] as { stages: { steps: { diagram?: string }[] }[] };
    journey.stages[0].steps[0].diagram = "tawaf";
    expect(validateContent(withDiagram)).toContain('umrah.json: "umrah.tawaf" has a tawaf diagram but no ar diagramLabel');
    const labelled = { "umrah.json": { "umrah.tawaf": { ...text, diagramLabel: "Kaaba on your left" } } };
    expect(validateContent({ ...withDiagram, texts: { ar: labelled, en: labelled, ur: labelled } })).toEqual([]);
  });

  it("rejects a step with no source", () => {
    expect(validateContent(files({ source: [] })).join()).toMatch(/source/);
  });

  it("rejects approved content without reviewer and date", () => {
    expect(validateContent(files({ status: "approved" })).join()).toMatch(/reviewer|reviewedAt/);
  });

  it("rejects approval by someone without the content reviewer role", () => {
    const errors = validateContent(files({ status: "approved", reviewer: "someone-else", reviewedAt: "2026-10-09" }));
    expect(errors.join()).toMatch(/does not hold the content reviewer role/);
  });

  it("accepts approval by a role holder", () => {
    expect(validateContent(files({ status: "approved", reviewer: "approved-reviewer", reviewedAt: "2026-10-09" }))).toEqual([]);
  });

  it("rejects a step missing its Urdu text", () => {
    const base = files();
    const errors = validateContent({ ...base, texts: { ...base.texts, ur: {} } });
    expect(errors).toContain('umrah.json: "umrah.tawaf" has no ur text');
  });

  it("rejects an empty text field", () => {
    const base = files();
    const ar = { "umrah.json": { "umrah.tawaf": { ...text, mistakes: " " } } };
    expect(validateContent({ ...base, texts: { ...base.texts, ar } })).toContain('umrah.json: "umrah.tawaf" is missing ar mistakes');
  });

  it("rejects a framework other than Ibn Baz and Ibn Al-Uthaymeen", () => {
    const base = files();
    const journey = { ...(base.journeys["umrah.json"] as object), framework: "other" };
    expect(validateContent({ ...base, journeys: { "umrah.json": journey } }).join()).toMatch(/framework/);
  });

  it("does not let an approved Arabic text approve its Urdu translation", () => {
    const base = files({ status: "approved", reviewer: "approved-reviewer", reviewedAt: "2026-10-09" });
    const approved = { ...text, review: { status: "approved" as const, reviewer: "approved-reviewer", reviewedAt: "2026-10-09" } };
    const ar = { "umrah.json": { "umrah.tawaf": approved } };
    const ur = { "umrah.json": { "umrah.tawaf": { ...text, review: { status: "approved" as const, reviewer: "someone-else", reviewedAt: "2026-10-09" } } } };
    const errors = validateContent({ ...base, texts: { ...base.texts, ar, ur } });
    expect(errors).toEqual(['umrah.json: "umrah.tawaf" ur text is approved by "someone-else", who does not hold the content reviewer role']);
  });

  it("rejects text without a review status", () => {
    const base = files();
    const { review: _review, ...noReview } = text;
    const en = { "umrah.json": { "umrah.tawaf": noReview } };
    expect(validateContent({ ...base, texts: { ...base.texts, en } })).toContain('umrah.json: "umrah.tawaf" en text has no valid review status');
  });

  it("rejects text for a step id that no journey defines", () => {
    const base = files();
    const en = { "umrah.json": { "umrah.tawaf": text, "umrah.tawf": text } };
    expect(validateContent({ ...base, texts: { ...base.texts, en } })).toContain('i18n/en/umrah.json: "umrah.tawf" matches no step in any journey');
  });

  it("requires each Hajj stage to be one day or one named part (T031)", () => {
    const base = files();
    const journey = structuredClone(base.journeys["umrah.json"]) as { type: string; stages: { day?: number; kind?: string }[] };
    journey.type = "hajj-ifrad";
    const check = () => validateContent({ ...base, journeys: { "umrah.json": journey } });
    expect(check()).toContain('umrah.json: stage "umrah.main" needs exactly one of day or kind');
    journey.stages[0].day = 9;
    expect(check()).toEqual([]);
    journey.stages[0].kind = "farewell";
    expect(check()).toContain('umrah.json: stage "umrah.main" needs exactly one of day or kind');
    delete journey.stages[0].day;
    expect(check()).toEqual([]);
    journey.type = "umrah";
    expect(check()).toContain('umrah.json: stage "umrah.main" has a Hajj day or kind in an Umrah journey');
  });

  it("rejects duplicate step ids across journey files", () => {
    const base = files();
    const errors = validateContent({
      ...base,
      journeys: { ...base.journeys, "copy.json": base.journeys["umrah.json"] },
      texts: Object.fromEntries(
        Object.entries(base.texts).map(([lang, t]) => [lang, { ...t, "copy.json": t["umrah.json"] }]),
      ),
    });
    expect(errors.join()).toMatch(/duplicate step id "umrah.tawaf"/);
    expect(errors.join()).toMatch(/duplicate journey id "umrah"/);
    expect(errors.join()).toMatch(/duplicate stage id "umrah.main"/);
  });
});
