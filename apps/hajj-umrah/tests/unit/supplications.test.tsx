// T034, T054: supplications per step (FR-030).
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { readContent } from "../../scripts/read-content";
import { validateContent } from "../../scripts/content-validation";
import { supplicationsOf } from "../../src/data/supplications";
import type { StepTexts } from "../../src/data/content";
import type { Journey, Step } from "../../src/data/types";
import { I18nProvider } from "../../src/i18n";
import { Guide } from "../../src/screens/Guide";

const base = (): Step => ({ id: "t.one", order: 1, ruling: "wajib", place: "mataf", supplicationIds: ["talbiyah", "rabbana-general"], meta: { source: ["x"], status: "draft", version: "0" } });
const journey = (step: Step): Journey => ({ id: "t", type: "umrah", version: "0", stages: [{ id: "s", order: 1, steps: [step] }] });
const texts: StepTexts = { "t.one": { title: "One", instruction: "i", details: "d", mistakes: "m", review: { status: "draft" } } };

function show(language: "ar" | "en" | "ur", step = base()) {
  return render(
    <I18nProvider language={language}>
      <Guide journey={journey(step)} texts={texts} completed={[]} onStepDone={async () => undefined} saveFailed={false} />
    </I18nProvider>,
  );
}

describe("supplications data", () => {
  it("passes validation and labels a general remembrance as general", () => {
    expect(validateContent(readContent())).toEqual([]);
    const general = supplicationsOf({ supplicationIds: ["rabbana-general"] }, "en");
    expect(general[0].supplication.scope).toBe("general");
    expect(supplicationsOf({ supplicationIds: ["talbiyah"] }, "en")[0].supplication.scope).toBe("specific");
  });
  it("skips unknown ids instead of guessing", () => {
    expect(supplicationsOf({ supplicationIds: ["nope"] }, "en")).toEqual([]);
  });
  it("fails validation for an unknown id and for a missing source", () => {
    const files = readContent();
    const journeyFile = Object.keys(files.journeys)[0];
    const copy = structuredClone(files.journeys[journeyFile]) as Journey;
    copy.stages[0].steps[0].supplicationIds = ["nope"];
    const bad = { ...files, journeys: { ...files.journeys, [journeyFile]: copy } };
    expect(validateContent(bad).join("\n")).toMatch(/lists supplication "nope"/);
    const items = structuredClone(files.supplications!.items!);
    items[0].meta.source = [];
    expect(validateContent({ ...files, supplications: { items } }).join("\n")).toMatch(/has no source/);
  });
});

describe("Guide supplications panel", () => {
  it("shows the recommended supplications with source, grading and pending badge", () => {
    show("en");
    const panel = screen.getByRole("region", { name: "Recommended supplications" });
    expect(within(panel).getByText("The Talbiyah")).toBeInTheDocument();
    expect(within(panel).getByText("For this step")).toBeInTheDocument();
    expect(within(panel).getByText("General remembrance (not specific to this step)")).toBeInTheDocument();
    expect(within(panel).getByText(/Labbayka Allahumma labbayk/)).toBeInTheDocument();
    expect(within(panel).getAllByText(/Authentic \(sahih\)/).length).toBeGreaterThan(0);
    expect(within(panel).getAllByText(/صحيح البخاري 1549/).length).toBeGreaterThan(0);
  });
  it("shows Arabic and Urdu labels, and no panel when the step has none", () => {
    const { unmount } = show("ar");
    expect(screen.getByRole("region", { name: "الأدعية والأذكار المستحبة" })).toBeInTheDocument();
    unmount();
    const u = show("ur");
    expect(screen.getByRole("region", { name: "مستحب دعائیں اور اذکار" })).toBeInTheDocument();
    u.unmount();
    show("en", { ...base(), supplicationIds: [] });
    expect(screen.queryByRole("region", { name: "Recommended supplications" })).toBeNull();
  });
});
